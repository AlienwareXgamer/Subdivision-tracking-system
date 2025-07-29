<template>
  <div class="dashboard">
    <UserSideNav />

    <!-- Main content on the right -->
    <div class="main-content" @click="handleOutsideClick">
      <div class="container">
        <div class="dashboard-grid">
          <div class="profile">
            <h2>My Profile 👤</h2>
            <div class="profile-info">
              <div class="profile-picture">
                <img
                  :src="profilePictureUrl || defaultProfilePicture"
                  alt="Profile Picture"
                />
                <input type="file" @change="uploadProfilePicture" />
              </div>
              <div class="profile-details">
                <p>
                  <strong>Name:</strong> {{ user.firstName }}
                  {{ user.lastName }}
                </p>
                <p>
                  <strong>Address:</strong> {{ user.houseLotNumber }},
                  {{ user.street }} St., Granville {{ user.phase }}
                </p>
                <p><strong>Account created:</strong> {{ accountCreated }}</p>
                <p><strong>Email:</strong> {{ user.email }}</p>
              </div>
            </div>
            <div class="reset-password-container">
              <button class="reset-password-button" @click="resetPassword">
                Reset Password
              </button>
            </div>
          </div>
        </div>

        <!-- Recent Activities Section -->
        <div class="recent-activities">
          <h2 class="manage-link" @click="navigateToQRCodeManagement">
            Manage QR Codes
          </h2>
          <div v-if="qrCodes.length === 0" class="no-activity">
            <p>You have not generated any QR codes yet.</p>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Guest Name</th>
                  <th>Category</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="code in qrCodes" :key="code.id">
                  <td>{{ code.guestName || "N/A" }}</td>
                  <td>{{ code.category || "N/A" }}</td>
                  <td>{{ code.createdAt || "N/A" }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="view-logs-container">
            <button class="view-logs-button" @click="navigateToHouseholdLogs">
              View Household Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import UserSideNav from "@/components/user/UserSideNav.vue";
import { ref, onMounted } from "vue";
import { db, storage } from "@/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";

export default {
  components: {
    UserSideNav,
  },
  setup() {
    const user = ref({});
    const accountCreated = ref("");
    const profilePictureUrl = ref("");
    const defaultProfilePicture = new URL(
      "@/assets/default-profile.jpg",
      import.meta.url
    ).href;
    const qrCodes = ref([]);

    const auth = getAuth();
    const currentUser = auth.currentUser;

    const fetchUserProfile = async () => {
      if (currentUser) {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          user.value = docSnap.data();
          accountCreated.value = new Date(
            user.value.createdAt.seconds * 1000
          ).toLocaleDateString();
        }

        // Fetch profile picture url if available
        try {
          profilePictureUrl.value = await getDownloadURL(
            storageRef(storage, `profile_pictures/${currentUser.uid}`)
          );
        } catch (error) {
          console.warn("Profile picture not found, using default");
        }
      }
    };

    const uploadProfilePicture = async (event) => {
      const file = event.target.files[0];
      if (file && currentUser) {
        const storageReference = storageRef(
          storage,
          `profile_pictures/${currentUser.uid}`
        );
        await uploadBytes(storageReference, file);
        profilePictureUrl.value = await getDownloadURL(storageReference);
        alert("Profile picture updated successfully");
      }
    };

    const navigateToHouseholdLogs = () => {
      window.location.href = "/household-logs"; // Replace with the correct route name if using a router
    };

    const fetchUserQrCodes = async () => {
      if (!currentUser) return;
      const codes = [];
      try {
        const qrCodesQuery = query(
          collection(db, "guest_qrcodes"),
          where("createdBy", "==", currentUser.email)
        );
        const querySnapshot = await getDocs(qrCodesQuery);
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          codes.push({
            id: doc.id,
            guestName: data.guestName,
            category: data.category,
            createdAt: data.createdAt
              ? new Date(data.createdAt.seconds * 1000).toLocaleString()
              : "Unknown",
          });
        });
        qrCodes.value = codes;
      } catch (error) {
        console.error("Error fetching user QR codes:", error);
      }
    };

    const resetPassword = async () => {
      if (!user.value.email) {
        alert("No email found for this account.");
        return;
      }

      try {
        await sendPasswordResetEmail(auth, user.value.email);
        alert("Password reset email sent. Please check your inbox.");
      } catch (error) {
        console.error("Error sending password reset email:", error);
        alert(`Error: ${error.message}`);
      }
    };

    const navigateToQRCodeManagement = () => {
      window.location.href = "/manage-qr"; // Ensure the route matches your app's setup
    };

    onMounted(() => {
      fetchUserProfile();
      fetchUserQrCodes();
    });

    return {
      user,
      accountCreated,
      profilePictureUrl,
      defaultProfilePicture,
      uploadProfilePicture,
      resetPassword,
      qrCodes,
      navigateToQRCodeManagement,
      navigateToHouseholdLogs,
    };
  },
};
</script>

<style scoped>
/* General reset to avoid padding/margin issues */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* Main content area */
.main-content {
  margin-left: 250px; /* Make room for the fixed sidebar */
  padding: 20px;
  background-color: #00bfa5;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  transition: margin-left 0.3s ease-in-out;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

/* Container to wrap both sections */
.container {
  display: flex;
  margin-left: 50px;
  justify-content: space-between;
  width: 100%;
  height: 100%; /* Full height for layout purposes */
}

/* Dashboard grid for the left side */
.dashboard-grid {
  display: flex;
  flex-direction: column;
  width: 30%; /* Left side takes 30% of the width */
  margin-left: 50px;
}

/* Profile and system-alerts classes aligned in column */
.profile {
  /* margin-bottom: 20px; Add some space between items */
  padding: 20px;
  background-color: #ffffff; /* Light background for clarity */
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  height: 100%;
}

/* Recent activities to take the full right side */
.recent-activities {
  width: 70%;
  padding: 20px;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  margin-left: 20px;
}

h2 {
  color: #007f66;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

.table-container {
  height: 600px;
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.table-container table {
  width: 100%;
  border-collapse: collapse;
  text-transform: capitalize;
}

.table-container th,
.table-container td {
  padding: 10px;
  border: 1px solid #ddd;
}

.table-container th {
  background-color: #e0e0e0;
  color: #007f66;
  font-weight: bold;
}

.table-container tr:nth-child(even) {
  background-color: #f9f9f9;
}

.manage-link {
  cursor: pointer;
  color: #007f66;
  text-decoration: none;
}

.manage-link:hover {
  color: #005a48;
}

.profile h2,
.system-alerts-card h2,
.recent-activities-card h2 {
  font-size: 1.8rem;
  margin-bottom: 15px;
}

.profile-info {
  display: flex; /* Flexbox to align items in a row */
  flex-direction: column; /* Stack items vertically */
  align-items: flex-start; /* Align items to the left */
  justify-content: center; /* Center content within the profile */
  padding: 10px;
}

.profile-picture {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%; /* Make it responsive to the parent width */
  max-width: 200px; /* Set a maximum width */
  margin: 0 auto;
}

.profile-picture img {
  width: 100%;
  height: auto;
  max-width: 120px; /* Ensure it doesn't get too large */
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.profile-picture input[type="file"] {
  display: block;
  margin-top: 10px;
  width: 80px;
}

.profile-details {
  background-color: white; /* White background for details */
  padding: 15px; /* Padding for a clean look */
  border-radius: 8px; /* Rounded corners */
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1); /* Subtle shadow for a card-like effect */
  width: 100%; /* Take full width inside profile */
  margin-top: 10px; /* Add space between the heading and details */
  text-align: left;
  font-size: 16px; /* Default font size */
  line-height: 1.4;
}

.profile-details p {
  margin: 8px 0; /* Space between paragraphs */
  font-size: 1rem; /* Slightly larger font for readability */
}

.profile-details strong {
  font-weight: bold;
  color: #333; /* Darker color for strong labels */
}

.profile {
  padding: 20px;
  background-color: #f0f0f0;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  height: auto;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.reset-password-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
}

.reset-password-button {
  padding: 12px 20px;
  font-size: 1rem;
  font-weight: bold;
  color: #fff;
  background: linear-gradient(to right, #007f66, #00bfa5);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 10px rgba(0, 191, 165, 0.2);
}

.reset-password-button:hover {
  background: linear-gradient(to right, #00bfa5, #007f66);
  box-shadow: 0 6px 12px rgba(0, 191, 165, 0.4);
  transform: translateY(-2px);
}

.reset-password-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(0, 191, 165, 0.2);
}

.upload-button {
  background-color: #3498db;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-button:hover {
  background-color: #2980b9;
}

h2 {
  display: flex;
  align-items: center; /* Center-align icon and text */
  font-size: 24px;
  margin-bottom: 15px; /* Space under the heading */
}

h1 {
  font-size: 36px;
  color: #333;
}

.view-logs-container {
  display: flex;
  justify-content: center;
  margin-top: 20px; /* Add spacing above the button */
}

.view-logs-button {
  background: linear-gradient(
    to right,
    #007f66,
    #00bfa5
  ); /* Gradient background */
  color: white; /* Text color */
  font-size: 1rem; /* Font size */
  font-weight: bold; /* Bold text */
  padding: 12px 24px; /* Add padding for a larger button */
  border: none; /* Remove borders */
  border-radius: 8px; /* Rounded corners */
  cursor: pointer; /* Pointer cursor on hover */
  transition: all 0.3s ease; /* Smooth transition effect */
  box-shadow: 0 4px 10px rgba(0, 191, 165, 0.2); /* Subtle shadow */
}

.view-logs-button:hover {
  background: linear-gradient(
    to right,
    #00bfa5,
    #007f66
  ); /* Invert gradient on hover */
  box-shadow: 0 6px 12px rgba(0, 191, 165, 0.4); /* More shadow on hover */
  transform: translateY(-2px); /* Slight lift effect */
}

.view-logs-button:active {
  transform: translateY(0); /* Reset lift effect */
  box-shadow: 0 2px 6px rgba(0, 191, 165, 0.2); /* Reduce shadow on click */
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
  }

  .sidebar.active {
    transform: translateX(0);
  }

  .main-content {
    margin-left: 0;
  }

  .container {
    margin-left: 0px;
  }

  .sidebar-toggle {
    display: block;
  }

  .profile {
    margin-bottom: 0px;
    padding: 15px;
  }
  .profile-info {
    padding: 0px;
    width: 140px;
  }

  .profile-picture {
    max-width: 100px; /* Adjust max width for mobile view */
  }

  .profile-picture img {
    max-width: 60px;
    max-height: 60px;
  }

  .dashboard-grid {
    margin-left: 0px;
    width: 49%;
  }

  .recent-activities {
    width: 49%;
    margin-left: 0;
  }

  h2 {
    font-size: 2vh;
  }

  .profile-details {
    font-size: 12px;
    padding: 8px;
  }

  .profile-details p {
    font-size: 0.8rem;
  }

  .profile-details strong {
    font-size: 0.85rem;
  }
}
</style>
