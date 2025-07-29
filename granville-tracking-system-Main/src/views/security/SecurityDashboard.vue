<template>
  <div>
    <!-- Fixed Sidebar on the left -->
    <SecuritySidebar ref="sidebar" />

    <!-- Main content on the right -->
    <div class="main-content" @click="handleOutsideClick">
      <div class="container">
        <div class="activities">
          <div class="activity-card">
            <h2>Gate Entries</h2>
            <div v-if="showEntryGrantedModal" class="modal-content">
              <h2>Entry Granted</h2>
              <br />
              <img
                :src="residentProfilePic"
                alt="Profile Picture"
                class="profile-pic"
              />
              <p><strong>Resident Name:</strong> {{ residentName }}</p>
              <p><strong>Phase:</strong> {{ residentPhase }}</p>
              <p><strong>Mode:</strong> {{ entryMode }}</p>
              <button @click="closeEntryModal">Close</button>
            </div>
          </div>

          <div class="activity-card">
            <h2>Gate Exits</h2>
            <div v-if="showExitModal" class="modal-content-exit">
              <h2>Exited</h2>
              <br />
              <img
                :src="exitProfilePic"
                alt="Profile Picture"
                class="profile-pic-exit"
              />
              <p><strong>Resident Name:</strong> {{ exitResidentName }}</p>
              <p><strong>Phase:</strong> {{ exitResidentPhase }}</p>
              <p><strong>Mode:</strong> {{ exitMode }}</p>
              <button @click="closeExitModal">Close</button>
            </div>
          </div>
        </div>

        <!-- Recent activities -->
        <div class="recent-activities">
          <h2>Recent Activities</h2>
          <ul>
            <li v-for="(activity, index) in recentActivities" :key="index">
              <div class="activity-details">
                <img
                  :src="activity.profilePic"
                  alt="Profile Picture"
                  class="activity-pic"
                />
                <div>
                  <p><strong>Name:</strong> {{ activity.name }}</p>
                  <p><strong>Mode:</strong> {{ activity.mode }}</p>
                  <p><strong>Time:</strong> {{ activity.timestamp }}</p>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SecuritySidebar from "@/components/securityComp/SecuritySidebar.vue";
import { ref, onMounted } from "vue";
import { db } from "@/firebase";
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getStorage,
  ref as storageRef,
  getDownloadURL,
} from "firebase/storage";

export default {
  components: {
    SecuritySidebar,
  },
  data() {
    return {
      isSidebarVisible: false,
    };
  },
  setup() {
    const user = ref({});
    const accountCreated = ref("");
    const auth = getAuth();
    const storage = getStorage();

    const showEntryGrantedModal = ref(false);
    const residentName = ref("");
    const residentPhase = ref("");
    const residentProfilePic = ref("");
    const entryMode = ref("");

    // Separate state variables for exit modal
    const showExitModal = ref(false);
    const exitResidentName = ref("");
    const exitResidentPhase = ref("");
    const exitProfilePic = ref("");
    const exitMode = ref("");

    const recentActivities = ref([]);

    let initializedEntries = false;
    let initializedExits = false;

    const fetchUserProfile = async (uid) => {
      if (uid) {
        const userDocRef = doc(db, "users", uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          user.value = userDoc.data();

          // Convert Firestore timestamp to a readable date
          if (user.value.createdAt) {
            accountCreated.value = new Date(
              user.value.createdAt.seconds * 1000
            ).toLocaleDateString();
          } else {
            accountCreated.value = "No creation date available";
          }
        } else {
          console.error("User document does not exist");
        }
      }
    };

    const getProfilePictureUrl = async (uid) => {
      try {
        const profilePicRef = storageRef(storage, `profile_pictures/${uid}`);
        return await getDownloadURL(profilePicRef);
      } catch (error) {
        console.warn("Failed to fetch profile picture from Storage:", error);
        return new URL("@/assets/default-profile.jpg", import.meta.url).href;
      }
    };

    const listenForAcceptedEntries = () => {
      console.log("Listening for accepted entries...");

      const acceptedEntriesQuery = query(
        collection(db, "latest_accepted_entry_log"),
        where("status", "==", "accepted")
      );

      onSnapshot(acceptedEntriesQuery, async (snapshot) => {
        if (!initializedEntries) {
          // Skip the initial load, only set initialized to true
          initializedEntries = true;
          return;
        }
        snapshot.docChanges().forEach(async (change) => {
          if (change.type == "modified" || change.type == "added") {
            const entry = change.doc.data();

            if (entry && entry.rfidTag) {
              console.log("Entry with RFID tag found:", entry.rfidTag);
              try {
                // Query the users collection for the matching rfidTag
                const userQuery = query(
                  collection(db, "users"),
                  where("rfidTag", "==", entry.rfidTag)
                );

                const userSnapshot = await getDocs(userQuery);

                if (!userSnapshot.empty) {
                  const userDoc = userSnapshot.docs[0].data();

                  residentName.value = `${userDoc.firstName} ${userDoc.lastName}`;
                  residentProfilePic.value = await getProfilePictureUrl(
                    userSnapshot.docs[0].id
                  );
                  residentPhase.value = `${userDoc.phase}`;
                  entryMode.value = entry.mode;

                  showEntryGrantedModal.value = true;
                  console.log("Modal should show now");
                } else {
                  console.warn(`No user found with RFID tag: ${entry.rfidTag}`);
                }
              } catch (error) {
                console.error("Error fetching user document:", error);
              }
            }
          } else {
            console.warn("rfidTag is undefined in entry:", entry);
          }
        });
      });
    };

    const listenForExits = () => {
      console.log("Listening for exits...");

      const acceptedExits = query(
        collection(db, "latest_exit_log"),
        where("status", "==", "accepted")
      );

      onSnapshot(acceptedExits, async (snapshot) => {
        if (!initializedExits) {
          initializedExits = true;
          return;
        }

        snapshot.docChanges().forEach(async (change) => {
          if (change.type == "modified" || change.type == "added") {
            const exit = change.doc.data();

            if (exit && exit.rfidTag) {
              try {
                // Query the users collection for the matching rfidTag
                const userQuery = query(
                  collection(db, "users"),
                  where("rfidTag", "==", exit.rfidTag)
                );

                const userSnapshot = await getDocs(userQuery);

                if (!userSnapshot.empty) {
                  const userDoc = userSnapshot.docs[0].data();

                  exitResidentName.value = `${userDoc.firstName} ${userDoc.lastName}`;
                  exitProfilePic.value = await getProfilePictureUrl(
                    userSnapshot.docs[0].id
                  );
                  exitResidentPhase.value = `${userDoc.phase}`;
                  exitMode.value = exit.mode;

                  showExitModal.value = true;
                  console.log("Exit should show now");
                } else {
                  console.warn(`No user found with RFID tag: ${entry.rfidTag}`);
                }
              } catch (error) {
                console.error("Error fetching user document:", error);
              }
            }
          } else {
            console.warn("rfidTag is undefined in entry:", entry);
          }
        });
      });
    };

    const fetchRecentActivities = () => {
      const activityQuery = query(
        collection(db, "all_rfid_logs"),
        orderBy("timestamp", "desc"),
        limit(4)
      );

      // Use Firestore onSnapshot to listen for real-time updates
      onSnapshot(activityQuery, async (snapshot) => {
        const activities = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data();
            const userQuery = query(
              collection(db, "users"),
              where("rfidTag", "==", data.rfidTag)
            );

            const userSnapshot = await getDocs(userQuery);

            if (!userSnapshot.empty) {
              const userDoc = userSnapshot.docs[0];
              const userData = userDoc.data();
              const profilePic = await getProfilePictureUrl(userDoc.id);

              return {
                name: `${userData.firstName} ${userData.lastName}`,
                mode: data.mode,
                timestamp: data.timestamp
                  ? data.timestamp.toDate().toLocaleString()
                  : "Unknown",
                profilePic: profilePic,
              };
            }

            return null;
          })
        );

        // Filter out any null entries (if no matching user was found)
        recentActivities.value = activities.filter(
          (activity) => activity !== null
        );
      });
    };

    const closeEntryModal = () => {
      showEntryGrantedModal.value = false;
    };

    const closeExitModal = () => {
      showExitModal.value = false;
    };

    // Use onAuthStateChanged to detect authentication state changes
    onMounted(() => {
      onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
          // Fetch the user profile once we confirm the user is authenticated
          fetchUserProfile(currentUser.uid);
          listenForAcceptedEntries();
          listenForExits();
          fetchRecentActivities();
        } else {
          console.error("No user is signed in");
        }
      });
    });

    return {
      user,
      accountCreated,
      showEntryGrantedModal,
      showExitModal,
      residentName,
      residentPhase,
      residentProfilePic,
      exitResidentName,
      exitProfilePic,
      exitResidentPhase,
      recentActivities,
      closeEntryModal,
      closeExitModal,
      entryMode,
      exitMode,
    };
  },
};
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

/* Sidebar styles */
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 300px; /* Fixed width of the sidebar */
  height: 100vh; /* Full viewport height */
  background-color: #2c3e50;
  color: white;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  z-index: 1000; /* Keeps the sidebar above the main content */
}

/* Main content area */
.main-content {
  margin-left: 250px; /* Make room for the fixed sidebar */
  padding: 20px;
  background-color: #00bfa5;
  height: 100vh;
  overflow-y: auto;
}

.container {
  display: flex;
  flex-direction: column;
  margin-left: 50px;
  gap: 20px;
  width: 96%;
  height: 96%; /* Make the container fit the screen height */
  overflow: hidden; /* Prevent overflow */
}

.activities {
  display: flex;
  gap: 20px;
  justify-content: space-between;
  flex-grow: 2;
  max-height: 70%;
}

.activity-card {
  flex: 1;
  background-color: #f0f0f0;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  overflow: auto;
  text-align: center;
}

.activity-card h2 {
  color: #00796b;
  font-size: 1.5rem;
  margin-bottom: 15px;
}

.recent-activities {
  width: 100%;
  background-color: #ffffff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-wrap: nowrap;
  gap: 20px;
  overflow-x: auto;
  align-items: center;
}

.recent-activities h2 {
  font-size: 1.5rem;
  color: #00796b;
  margin-bottom: 15px;
  flex-basis: 100%; /* Ensure the heading spans the full width */
  text-align: left;
}

.recent-activities ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex; /* Arrange list items in a row */
  gap: 20px; /* Space between list items */
}

.activity-details {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 200px; /* Ensure all activity cards have a consistent width */
  flex: 0 0 auto;
}

.activity-pic {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
}

.activity-details div p {
  margin: 5px 0;
  font-size: 0.9rem;
  color: #333;
}

h1 {
  font-size: 36px;
  color: #333;
}

.p-role {
  text-transform: capitalize;
}

.modal-content,
.modal-content-exit {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
}

.modal-content h2,
.modal-content-exit h2 {
  color: #00796b;
  font-size: 1.5rem;
  margin-bottom: 15px;
}

.modal-content,
.modal-content-exit p {
  font-size: 2rem;
}

.profile-details {
  text-align: left; /* Align text to the left */
  line-height: 1.6; /* Improve line spacing */
  font-size: 16px; /* Set font size for better readability */
  color: #333; /* Dark gray text color for contrast */
  padding: 10px 15px; /* Add padding for a clean look */
  background-color: #ffffff; /* Light background color for contrast */
  border-radius: 8px; /* Slightly rounded corners */
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); /* Subtle shadow */
}

.profile-details p {
  margin-bottom: 8px; /* Add space between paragraphs */
  font-size: 15px; /* Slightly smaller font size for paragraphs */
}

.profile-details strong {
  font-weight: bold;
  color: #000; /* Dark color for labels */
}

.profile-pic {
  width: 350px;
  height: 350px;
  border-radius: 50%;
  margin: 15px auto;
}

.profile-pic-exit {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  margin: 15px auto;
}

button {
  padding: 10px 20px;
  margin-top: 15px;
  font-size: 16px;
  cursor: pointer;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
}
/* Additional styling for responsiveness */
@media (max-width: 768px) {
  .main-content {
    margin-left: 0px; /* Adjust content margin accordingly */
    width: 100%;
  }

  .profile,
  .system-alerts,
  .recent-activities {
    width: 100%;
    max-width: 100%;
  }

  .dashboard-grid {
    width: 100%;
    margin-left: 0px;
  }
  h2 .profile-details {
    font-size: 14px; /* Reduce font size on smaller screens */
    line-height: 1.4;
    padding: 8px; /* Reduce padding for compact view */
  }

  .profile-details p {
    margin-bottom: 6px;
  }
}
</style>
