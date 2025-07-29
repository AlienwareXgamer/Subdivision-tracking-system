<template>
  <div>
    <!-- Sidebar Toggle Button for Mobile -->
    <button class="sidebar-toggle" @click="toggleSidebar">☰</button>

    <!-- Sidebar -->
    <div :class="['sidebar', { active: isSidebarVisible }]" @click.stop>
      <div class="welcome">
        <h2>Welcome!</h2>
      </div>

      <!-- Navigation buttons -->
      <nav class="nav">
        <ul>
          <!-- <li>
            <router-link to="/dashboard">Dashboard</router-link>
          </li> -->
          <li>
            <router-link
              to="/users-management"
              @click="reloadIfActive('/users-management')"
              >Users Management</router-link
            >
          </li>
          <li>
            <router-link
              to="/all-qr-codes"
              @click="reloadIfActive('/all-qr-codes')"
              >QR Codes</router-link
            >
          </li>
          <li>
            <router-link
              to="/security-logs"
              @click="reloadIfActive('/security-logs')"
              >Resident Logs</router-link
            >
          </li>
          <li>
            <router-link
              to="/all-guest-logs"
              @click="reloadIfActive('/all-guest-logs')"
              >Guest Logs</router-link
            >
          </li>
          <li>
            <router-link
              to="/generate-qr"
              @click="reloadIfActive('/generate-qr')"
              >QR Code Generate</router-link
            >
          </li>
          <!-- <li>
            <router-link to="/system-management">System Management</router-link>
          </li> -->
        </ul>
      </nav>

      <!-- Add new resident button -->
      <div class="add-resident">
        <button @click="openModal" id="addRes">Add A New User</button>

        <!-- New Button for Assigning Residents to Household -->
        <button @click="openAssignModal" id="assignHousehold">
          Assign Residents to Household
        </button>

        <br /><br />
        <div class="logout">
          <button @click="handleSignOut">Log Out</button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal">
        <h2>Add New User</h2>
        <form @submit.prevent="addResident" class="modal-content">
          <div class="form-group">
            <label for="uid">User UID:</label>
            <input type="text" v-model="newResident.uid" id="uid" required />
          </div>

          <div class="form-group">
            <label for="firstName">First Name:</label>
            <input
              type="text"
              v-model="newResident.firstName"
              id="firstName"
              required
            />
          </div>
          <div class="form-group">
            <label for="lastName">Last Name:</label>
            <input
              type="text"
              v-model="newResident.lastName"
              id="lastName"
              required
            />
          </div>
          <div class="form-group">
            <label for="email">Email:</label>
            <input
              type="email"
              v-model="newResident.email"
              id="email"
              required
            />
          </div>
          <div class="form-group">
            <label for="role">Role:</label>
            <select v-model="newResident.role" id="role" required>
              <option value="resident">Resident</option>
              <option value="security">Security</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <!-- Resident Specific Fields -->
          <div v-if="newResident.role === 'resident'">
            <!-- Address Fields -->
            <div class="form-group">
              <label for="phase">Phase:</label>
              <input
                type="text"
                v-model="newResident.phase"
                id="phase"
                required
              />
            </div>
            <div class="form-group">
              <label for="street">Street:</label>
              <input type="text" v-model="newResident.street" id="street" />
            </div>
            <div class="form-group">
              <label for="houseLotNumber">House Lot & Block Number:</label>
              <input
                type="text"
                v-model="newResident.houseLotNumber"
                id="houseLotNumber"
                required
              />
            </div>

            <div class="form-group">
              <label for="contactNumber">Contact Number:</label>
              <input
                type="text"
                v-model="newResident.contactNumber"
                id="contactNumber"
                required
              />
            </div>

            <!-- RFID Tag Selection -->
            <div class="form-group" v-if="newResident.role === 'resident'">
              <label for="rfidTag">RFID Tag:</label>
              <select v-model="newResident.rfidTag" id="rfidTag" required>
                <option value="" disabled>Select an unassigned RFID tag</option>
                <option v-for="tag in rfidTags" :key="tag.id" :value="tag.tag">
                  {{ tag.tag }}
                </option>
              </select>
            </div>
          </div>

          <!-- Active Status -->
          <div class="form-group">
            <label for="activeStatus">Active Status:</label>
            <select
              v-model="newResident.activeStatus"
              id="activeStatus"
              required
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="submit">Add User</button>
            <button type="button" @click="closeModal">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Assign Residents to Household Modal -->
    <div v-if="showAssignModal" class="modal-overlay">
      <div class="modal">
        <h2>Assign Residents to Household</h2>
        <form @submit.prevent="assignToHousehold">
          <div class="form-group">
            <label for="householdID">Household ID:</label>
            <input
              v-model="householdId"
              type="text"
              id="householdId"
              placeholder="Enter Household ID"
              required
            />
          </div>

          <div class="form-group">
            <label>Select Residents:</label>

            <!-- Search input -->
            <input
              v-model="searchQuery"
              type="text"
              class="search-input"
              placeholder="Search residents by name or house lot number..."
            />
            <div v-if="residents.length === 0">
              <p>All residents are already assigned to a household.</p>
            </div>
            <div v-else class="dropdown">
              <div
                v-for="resident in filteredResidents"
                :key="resident.id"
                class="dropdown-item"
              >
                <input
                  type="checkbox"
                  :value="resident.id"
                  v-model="selectedResidents"
                />
                <span>{{ resident.firstName }} {{ resident.lastName }}</span>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit">Assign to Household</button>
            <button type="button" @click="closeAssignModal">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Choose head of household -->
    <div v-if="showHeadModal" class="modal-overlay">
      <div class="modal">
        <h2>Select Head of household</h2>
        <form @submit.prevent="assignHead">
          <div v-if="householdResidents.length > 0">
            <div
              v-for="resident in householdResidents"
              :key="resident.id"
              class="dropdown-item"
            >
              <input type="radio" :value="resident.id" v-model="selectedHead" />
              <span>{{ resident.firstName }} {{ resident.lastName }}</span>
            </div>
          </div>
          <div v-else>
            <p v-if="householdResidents === null">Loading residents...</p>
            <p>No residents found for this household.</p>
          </div>
          <div class="form-actions">
            <button type="submit">Confirm Head</button>
            <button type="button" @click="closeHeadModal">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { db, auth } from "@/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  writeBatch,
  onSnapshot,
} from "firebase/firestore";
import { ref, onMounted, computed, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";

export default {
  name: "SidebarNav",
  data() {
    return {
      isSidebarVisible: false,
      showAssignModal: false,
      showHeadModal: false,
      householdId: "",
      searchQuery: "",
      residents: [],
      selectedResidents: [],
      householdResidents: [],
      selectedHead: null,
    };
  },
  computed: {
    filteredResidents() {
      return this.residents.filter((resident) => {
        const query = this.searchQuery.toLowerCase();
        return (
          resident.firstName.toLowerCase().includes(query) ||
          resident.lastName.toLowerCase().includes(query) ||
          resident.houseLotNumber?.toLowerCase().includes(query)
        );
      });
    },
  },
  watch: {
    householdResidents(newValue) {
      console.log("Updated householdResidents:", newValue);
    },
  },
  methods: {
    toggleSidebar() {
      this.isSidebarVisible = !this.isSidebarVisible;
      if (this.isSidebarVisible) {
        document.addEventListener("click", this.handleOutsideClick);
      } else {
        document.removeEventListener("click", this.handleOutsideClick);
      }
    },
    openAssignModal() {
      this.fetchResidents();
      this.showAssignModal = true;
    },
    closeAssignModal() {
      this.showAssignModal = false;
      this.selectedResidents = [];
      this.householdId = "";
    },
    async fetchResidents() {
      try {
        console.log("Fetching unassigned residents...");
        const q = query(
          collection(db, "users"),
          where("role", "==", "resident")
        );
        const querySnapshot = await getDocs(q);

        console.log(
          `Number of unassigned residents fetched: ${querySnapshot.size}`
        );
        this.residents = querySnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((resident) => !resident.householdId);
      } catch (error) {
        console.error("Error fetching residents:", error);
      }
    },
    async assignHead() {
      if (!this.selectedHead) {
        alert("Please select a head of household.");
        return;
      }

      try {
        console.log("Assigning head of household:", this.selectedHead);
        const batch = writeBatch(db);

        this.householdResidents.forEach((resident) => {
          const residentRef = doc(db, "users", resident.id);
          batch.update(residentRef, {
            isHead: resident.id === this.selectedHead,
          });
        });

        await batch.commit();
        alert("Head of household successfully assigned!");
        this.closeHeadModal();
      } catch (error) {
        console.error("Error assigning head of household:", error);
        alert("Failed to assign head of household.");
      }
    },
    closeHeadModal() {
      this.showHeadModal = false;
      this.householdResidents = [];
      this.selectedHead = null;
    },
    async assignToHousehold() {
      if (!this.householdId || this.selectedResidents.length === 0) {
        alert("Please provide a Household ID and select at least one resident");
        return;
      }

      try {
        console.log(
          "Assigning residents to household:",
          this.selectedResidents
        );
        const batch = writeBatch(db);

        // Update each selected resident with the household ID
        this.selectedResidents.forEach((residentId) => {
          const residentRef = doc(db, "users", residentId);
          batch.update(residentRef, { householdId: this.householdId });
        });

        await batch.commit();
        alert("Residents successfully assigned to household!");
        this.showHeadModal = true;

        await this.fetchHouseholdResidents(this.householdId);
        this.closeAssignModal();
      } catch (error) {
        console.error("Error assigning household:", error);
        alert("Failed to assign residents to the household.");
      }
    },
    async fetchHouseholdResidents(householdId) {
      try {
        console.log("Fetching residents for householdId:", householdId);

        // Check for null or undefined householdId
        if (!householdId) {
          console.error("householdId is null or undefined.");
          this.householdResidents = [];
          return;
        }

        const q = query(
          collection(db, "users"),
          where("householdId", "==", householdId)
        );
        const querySnapshot = await getDocs(q);

        // Log the size of the result and check if it's empty
        console.log(
          `Number of residents fetched for householdId ${householdId}: ${querySnapshot.size}`
        );
        if (querySnapshot.empty) {
          console.warn("No residents found for this householdId.");
          this.householdResidents = [];
          return;
        }

        this.householdResidents = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log("Fetched household residents:", this.householdResidents);
      } catch (error) {
        console.error("Error fetching household residents:", error);
      }
    },
    handleOutsideClick(event) {
      const sidebar = this.$el.querySelector(".sidebar");
      const toggleButton = this.$el.querySelector(".sidebar-toggle");

      // Check if the click was outside the sidebar and toggle button
      if (
        !sidebar.contains(event.target) &&
        !toggleButton.contains(event.target)
      ) {
        this.isSidebarVisible = false;
        document.removeEventListener("click", this.handleOutsideClick);
      }
    },
  },
  beforeUnmount() {
    // Clean up the event listener when the component is unmounted
    document.removeEventListener("click", this.handleOutsideClick);
  },
  setup() {
    const showModal = ref(false);
    const rfidTags = ref([]);
    const unsubscribe = ref(null);
    const newResident = ref({
      uid: "",
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "resident",
      phase: "",
      street: "",
      houseLotNumber: "",
      contactNumber: "",
      rfidTag: "",
      activeStatus: "true",
    });

    const router = useRouter();

    const openModal = () => {
      showModal.value = true;
    };

    const closeModal = () => {
      showModal.value = false;
    };

    const setupListener = () => {
      const unassignedTagsQuery = query(
        collection(db, "residents"),
        where("assigned", "==", false)
      );

      unsubscribe.value = onSnapshot(unassignedTagsQuery, (snapshot) => {
        rfidTags.value = snapshot.docs.map((doc) => ({
          id: doc.id,
          tag: doc.id,
        }));
      });
    };

    const cleanupListener = () => {
      if (unsubscribe.value) {
        unsubscribe.value();
        unsubscribe.value = null;
      }
    };

    // const fetchUnassignedRfidTags = async () => {
    //   const unassignedTagsQuery = query(
    //     collection(db, "residents"),
    //     where("assigned", "==", false)
    //   );

    //   const querySnapshot = await getDocs(unassignedTagsQuery);
    //   rfidTags.value = querySnapshot.docs.map((doc) => ({
    //     id: doc.id,
    //     tag: doc.id,
    //   }));
    // };

    const addResident = async () => {
      try {
        if (!newResident.value.uid) {
          alert("Please enter the UID for the new user.");
          return;
        }

        // // Check if RFID tag already exists in the users collection
        // const rfidQuery = query(
        //   collection(db, "users"),
        //   where("rfidTag", "==", newResident.value.rfidTag)
        // );
        // const rfidQuerySnapshot = await getDocs(rfidQuery);

        // if (!rfidQuerySnapshot.empty) {
        //   alert(
        //     "This RFID tag is already assigned to another user. Please select a different RFID tag."
        //   );
        //   return; // Exit if the RFID tag is already in use
        // }

        // If the role is 'resident', validate RFID
        if (newResident.value.role === "resident") {
          // Check if RFID tag already exists in the 'users' collection
          const rfidQuery = query(
            collection(db, "users"),
            where("rfidTag", "==", newResident.value.rfidTag)
          );
          const rfidQuerySnapshot = await getDocs(rfidQuery);

          if (!rfidQuerySnapshot.empty) {
            alert(
              "This RFID tag is already assigned to another user. Please select a different RFID tag."
            );
            return; // Exit if the RFID tag is already in use
          }
        } else {
          // For admin or security, set RFID tag as null
          newResident.value.rfidTag = null;
        }

        await setDoc(doc(db, "users", newResident.value.uid), {
          firstName: newResident.value.firstName,
          lastName: newResident.value.lastName,
          email: newResident.value.email,
          role: newResident.value.role,
          phase: newResident.value.phase || null,
          street: newResident.value.street || null,
          houseLotNumber: newResident.value.houseLotNumber || null,
          contactNumber: newResident.value.contactNumber,
          rfidTag: newResident.value.rfidTag || null,
          activeStatus: newResident.value.activeStatus === "true",
          createdAt: serverTimestamp(),
        });

        // If role is 'resident', mark the RFID tag as assigned
        if (newResident.value.role === "resident") {
          await updateDoc(doc(db, "residents", newResident.value.rfidTag), {
            assigned: true,
          });
        }

        alert("User information added successfully!");

        // Refresh the page to clear the form
        window.location.reload();
      } catch (error) {
        console.error("Error adding user:", error);
        alert(`Error adding user: ${error.message}`);
      }
    };

    const handleSignOut = async () => {
      try {
        cleanupListener();
        await signOut(auth);
        router.push({ name: "home" });
        console.log("Successful sign out");
      } catch (error) {
        console.error("Error signing out:", error);
        alert(`Error signing out: ${error.message}`);
      }
    };

    const reloadIfActive = (path) => {
      if (router.currentRoute.value.path === path) {
        window.location.reload();
      }
    };

    onMounted(() => {
      setupListener();
      onAuthStateChanged(auth, (user) => {
        if (!user) {
          cleanupListener();
        }
      });
    });

    onUnmounted(() => {
      cleanupListener();
    });

    return {
      showModal,
      newResident,
      rfidTags,
      openModal,
      closeModal,
      addResident,
      handleSignOut,
      reloadIfActive,
    };
  },
};
</script>

<style scoped>
/* Sidebar styles remain the same as before */
.sidebar {
  width: 300px;
  height: 100vh;
  background-color: #2c3e50;
  color: white;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1000;
  padding: 20px;
  border-radius: 0 20px 20px 0;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease-in-out;
}

/* Sidebar Toggle Button */
.sidebar-toggle {
  display: block;
  position: absolute;
  top: 20px;
  left: 20px;
  background-color: rgba(52, 152, 219, 0.4);
  color: rgba(255, 255, 255, 0.7);
  padding: 10px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  z-index: 1100;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s ease, color 0.3s ease;
  opacity: 0.8;
}

/* Hover and active state */
.sidebar-toggle:hover,
.sidebar-toggle:focus {
  background-color: rgba(52, 152, 219, 0.8);
  color: rgba(255, 255, 255, 1);
  opacity: 1;
}

/* Optional active state for when the button is clicked */
.sidebar-toggle:active {
  background-color: rgba(41, 128, 185, 0.9);
  color: white;
}

.welcome {
  text-align: center;
  margin-bottom: 20px;
  color: #00bfa5;
}

.welcome h2 {
  font-size: 1.6rem;
  font-weight: bold;
}

.nav {
  margin: 0;
  padding: 0;
}

.nav ul {
  list-style-type: none;
  padding: 0;
}

.nav li {
  margin: 15px 0;
  padding-top: 15px;
  width: 100%;
}

.nav li a {
  color: white;
  text-decoration: none;
  font-size: 16px;
  padding: 20px;
  font-size: 1rem;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.nav li a:hover {
  background-color: #007f66;
  color: white;
}

.nav a.router-link-exact-active {
  background-color: skyblue;
  color: white;
  width: 100%;
  display: block;
  padding: 10px;
  box-sizing: border-box;
  border-radius: 20px;
}

.add-resident {
  margin-top: auto;
  text-align: center;
  padding: 0;
}

#addRes {
  background: blue;
}

.add-resident button {
  width: 100%;
  padding: 15px;
  margin-bottom: 15px;
  font-size: 1rem;
  font-weight: bold;
  background: linear-gradient(to right, #00bfa5, #007f66);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.add-resident button:hover {
  background: linear-gradient(to right, #007f66, #00bfa5);
  box-shadow: 0 4px 10px rgba(0, 191, 165, 0.5);
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  background: linear-gradient(to bottom, #f9f9f9, #e0f7fa);
  border-radius: 15px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  margin: 0 auto;
}

.dropdown {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 10px;
  background-color: #f9f9f9;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 5px 10px;
  border-bottom: 1px solid #ddd;
  width: 50px;
}

.dropdown-item input[type="checkbox"] {
  margin-right: 30px;
  flex-shrink: 0;
}

.dropdown-item span {
  flex-grow: 1;
  font-size: 1rem;
  color: #333;
  white-space: nowrap;
  text-overflow: ellipsis;
  display: inline-block;
}

/* Remove border for the last item */
.dropdown-item:last-child {
  border-bottom: none;
}

/* Style hover effect for better visibility */
.dropdown-item:hover {
  background-color: #e6f7ff;
  border-radius: 5px;
}

#assignHousehold {
  background: linear-gradient(to right, #00bfa5, #007f66);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 10px 15px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.3s;
}

#assignHousehold:hover {
  background: linear-gradient(to right, #007f66, #00bfa5);
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #00bfa5;
  font-weight: bold;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 2px solid #00bfa5;
  border-radius: 10px;
  font-size: 1rem;
  outline: none;
  transition: all 0.3s ease;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #007f66;
  box-shadow: 0 0 5px rgba(0, 191, 165, 0.5);
}

/* Action Buttons in Modal */
.form-actions {
  display: flex;
  justify-content: space-between;
}

.form-actions button {
  flex: 1;
  padding: 12px;
  font-size: 1rem;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.form-actions button:first-of-type {
  background-color: #3498db;
  color: white;
  margin-right: 10px;
}

.form-actions button:last-of-type {
  background-color: #e74c3c;
  color: white;
}

.form-actions button:hover {
  opacity: 0.9;
}

/* Responsive Styles for Mobile Screens */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    width: 250px;
  }

  .sidebar.active {
    transform: translateX(0);
  }

  .sidebar-toggle {
    display: block;
  }
}
</style>
