<template>
  <div>
    <!-- Fixed Sidebar on the left -->
    <SidebarNav />

    <!-- Main content on the right -->
    <div class="main-content">
      <div class="user-management-content">
        <div class="role-menu">
          <button
            :class="{ active: currentRoleFilter === 'all' }"
            @click="filterByRole('all')"
          >
            All Users
          </button>
          <button
            :class="{ active: currentRoleFilter === 'resident' }"
            @click="filterByRole('resident')"
          >
            Residents
          </button>
          <button
            :class="{ active: currentRoleFilter === 'security' }"
            @click="filterByRole('security')"
          >
            Security
          </button>
          <button
            :class="{ active: currentRoleFilter === 'admin' }"
            @click="filterByRole('admin')"
          >
            Admin
          </button>
        </div>

        <div class="search-filter">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by full name, RFID tag, or household ID..."
          />

          <select v-model="selectedFilter" @change="sortUsers">
            <option value="alphabetical">Sort by Name (A-Z)</option>
            <option value="latest">Sort by Latest</option>
            <option value="first">Sort by Oldest</option>
          </select>
        </div>

        <div class="user-list">
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Role</th>
                  <th>RFID Tag</th>
                  <th>Household ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in filteredUsers" :key="user.id">
                  <td class="info">{{ user.firstName }} {{ user.lastName }}</td>
                  <td class="info">{{ user.role }}</td>
                  <td class="info">{{ user.rfidTag }}</td>
                  <td class="info">{{ user.householdId }}</td>
                  <td>
                    <button @click="openEditModal(user)">Edit</button>
                    <button @click="deleteUser(user.id)">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Edit User modal-->
        <div v-if="showEditModal" class="modal-overlay">
          <div class="modal">
            <h2>Edit User</h2>
            <form @submit.prevent="updateUser">
              <div class="form-group">
                <label for="firstName">First Name:</label>
                <input
                  type="text"
                  v-model="selectedUser.firstName"
                  id="firstName"
                  required
                />
              </div>
              <div class="form-group">
                <label for="lastName">Last Name:</label>
                <input
                  type="text"
                  v-model="selectedUser.lastName"
                  id="lastName"
                  required
                />
              </div>
              <div class="form-group">
                <label for="role">Role:</label>
                <select v-model="selectedUser.role" id="role" required>
                  <option value="resident">Resident</option>
                  <option value="security">Security</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div v-if="selectedUser.role === 'resident'">
                <div class="form-group">
                  <label for="phase">Phase:</label>
                  <input
                    type="text"
                    v-model="selectedUser.phase"
                    id="phase"
                    required
                  />
                </div>
                <div class="form-group">
                  <label for="houseBlockAndLot"
                    >House Block & Lot Number:</label
                  >
                  <input
                    type="text"
                    v-model="selectedUser.houseLotNumber"
                    id="houseLotNumber"
                    required
                  />
                </div>
                <div class="form-group">
                  <label for="street">Street Name:</label>
                  <input
                    type="text"
                    v-model="selectedUser.street"
                    id="street"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="isHead"
                    >Is this resident the head of household?</label
                  >
                  <select v-model="selectedUser.isHead" id="isHead" required>
                    <option :value="true">Yes</option>
                    <option :value="false">No</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label for="activeStatus">Active Status:</label>
                <select
                  v-model="selectedUser.activeStatus"
                  id="activeStatus"
                  required
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div class="form-actions">
                <button class="update-btn" type="submit">Update User</button>
                <button
                  class="cancel-btn"
                  type="button"
                  @click="closeEditModal"
                >
                  Cancel
                </button>
              </div>
            </form>
            <br />
            <br />
            <h3>Reset User Password</h3>
            <button
              class="reset-btn"
              @click="resetPassword(selectedUser.email)"
            >
              Send Password Reset Email
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SidebarNav from "@/components/SidebarNav.vue";
import { db, auth } from "@/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { connectStorageEmulator } from "firebase/storage";
import { ref, computed } from "vue";

export default {
  components: {
    SidebarNav,
  },
  setup() {
    const users = ref([]);
    const searchQuery = ref("");
    const selectedFilter = ref("alphabetical");
    const currentRoleFilter = ref("all");
    const showEditModal = ref(false);
    const selectedUser = ref(null);

    // Fetch users from Firestore
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        users.value = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    // Run fetchUsers on created
    fetchUsers();

    // Filter by role
    const filterByRole = (role) => {
      currentRoleFilter.value = role;
    };

    // Computed filtered and sorted users
    const filteredUsers = computed(() => {
      let result = users.value;

      // Search by full name
      if (searchQuery.value) {
        result = result.filter(
          (user) =>
            `${user.firstName} ${user.lastName}`
              .toLowerCase()
              .includes(searchQuery.value.toLowerCase()) ||
            `${user.rfidTag}`
              .toLowerCase()
              .includes(searchQuery.value.toLowerCase()) ||
            `${user.householdId}`
              .toLowerCase()
              .includes(searchQuery.value.toLowerCase())
        );
      }

      // Filter by role
      if (currentRoleFilter.value !== "all") {
        result = result.filter((user) => user.role === currentRoleFilter.value);
      }

      // Sort users
      if (selectedFilter.value === "alphabetical") {
        result.sort((a, b) => a.firstName.localeCompare(b.firstName));
      } else if (selectedFilter.value === "latest") {
        result.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
      } else if (selectedFilter.value === "first") {
        result.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);
      }

      return result;
    });

    // Open Edit Modal
    const openEditModal = (user) => {
      selectedUser.value = { ...user };
      showEditModal.value = true;
    };

    // Close Edit Modal
    const closeEditModal = () => {
      showEditModal.value = false;
      selectedUser.value = null;
    };

    // Update user in Firestore
    const updateUser = async () => {
      if (!selectedUser.value) return;
      const userRef = doc(db, "users", selectedUser.value.id);
      try {
        await updateDoc(userRef, {
          firstName: selectedUser.value.firstName,
          lastName: selectedUser.value.lastName,
          role: selectedUser.value.role,
          phase: selectedUser.value.phase,
          houseLotNumber: selectedUser.value.houseLotNumber,
          street: selectedUser.value.street,
          isHead: selectedUser.value.isHead || false,
          activeStatus: selectedUser.value.activeStatus === "true",
        });

        const rfidTag = selectedUser.value.rfidTag;

        if (rfidTag) {
          const rfidRef = doc(db, "residents", rfidTag);
          const rfidDoc = await getDoc(rfidRef);

          if (rfidDoc.exists()) {
            if (selectedUser.value.activeStatus === "false") {
              await updateDoc(rfidRef, {
                assigned: false,
                inactiveUser: true,
              });
              console.log("RFID document updated to inactive successfully");
            }

            if (selectedUser.value.activeStatus === "true") {
              await updateDoc(rfidRef, {
                assigned: true,
                inactiveUser: false,
              });
              console.log("RFID document updated to active successfully");
            }
          } else {
            console.error("RFID Document not found.");
            alert("RFID document not found. Please check the RFID tag.");
          }
        }
        alert("User updated successfully!");
        closeEditModal();
        fetchUsers();
      } catch (error) {
        console.error("Error updating user", error);
      }
    };

    // Reset Password for the user
    const resetPassword = async (email) => {
      try {
        await sendPasswordResetEmail(auth, email);
        alert("Password reset request sent successfully!");
      } catch (error) {
        console.error("Error sending password reset email:", error);
      }
    };

    // Edit user action
    const editUser = (user) => {
      console.log("Edit user", user);
      // Handle edit action (e.g., navigate to edit page or show modal)
    };

    // Delete user action
    const deleteUser = async (userId) => {
      try {
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const rfidTag = userData.rfidTag;

          // Delete the user document from 'users' collection
          await deleteDoc(userRef);
          console.log("User document deleted successfully.");

          // Check if the RFID tag is provided
          if (rfidTag) {
            const rfidRef = doc(db, "residents", rfidTag);

            // Delete the corresponding document in the 'residents' collection
            const rfidDoc = await getDoc(rfidRef);
            if (rfidDoc.exists()) {
              await deleteDoc(rfidRef);
              console.log(
                "RFID document deleted successfully from the 'residents' collection."
              );
            } else {
              console.error(
                "RFID document not found in the 'residents' collection."
              );
              alert("RFID document not found. Please check the RFID tag.");
            }
          }
        } else {
          console.error("User document not found in the 'users' collection.");
          alert("User document not found. Please check the user ID.");
        }

        alert("User and corresponding RFID document deleted successfully.");
        fetchUsers();
      } catch (error) {
        console.error("Error deleting user or RFID document:", error);
        alert(`Error deleting user or RFID document: ${error.message}`);
      }
    };

    return {
      users,
      searchQuery,
      selectedFilter,
      currentRoleFilter,
      filteredUsers,
      showEditModal,
      selectedUser,
      filterByRole,
      openEditModal,
      closeEditModal,
      updateUser,
      resetPassword,
      editUser,
      deleteUser,
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

/* Sidebar and main content styles */
.main-content {
  margin-left: 250px; /* Adjust based on sidebar width */
  padding: 20px;
  background-color: #00bfa5;
  height: 100vh;
}

.user-management-content {
  background-color: white;
  margin-left: 50px;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  height: calc(100vh - 40px);
  overflow: hidden;
}
.table-container {
  max-height: 78.5vh;
  overflow-y: auto;
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
}
.table-container table {
  width: 100%; /* Ensure the table takes the full width of the container */
  border-collapse: collapse;
}

.table-container th,
.table-container td {
  padding: 15px;
  text-align: left;
  border: 1px solid #e0e0e0;
}

.table-container th {
  color: #00bfa5;
}

.table-container td {
  background-color: #fff;
}

.table-container tbody tr {
  transition: background-color 0.3s ease, transform 0.2s ease;
}

.table-container tbody tr:hover td {
  background-color: #b0bec5; /* Light green background on hover */
  transform: scale(1.02);
  cursor: pointer;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background-color: #fff;
  padding: 20px;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #00796b;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.form-actions {
  display: flex;
  justify-content: space-between;
}

.form-actions .update-btn {
  background-color: #3498db;
  color: white;
  padding: 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.form-actions .cancel-btn {
  background-color: #e74c3c;
  color: white;
  padding: 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.form-actions .update-btn:hover,
.form-actions .cancel-btn:hover {
  opacity: 0.8;
}

.reset-btn {
  background-color: #f39c12;
  color: white;
  padding: 10px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  width: 100%;
  margin-top: 20px;
}

.reset-btn:hover {
  opacity: 0.8;
}

/* Role menu styles */
.role-menu {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.role-menu button {
  flex: 1;
  padding: 10px;
  background-color: #e0f7fa;
  color: #00796b;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.role-menu button.active {
  background-color: #00bfa5;
  color: #fff;
}

.role-menu button:hover {
  background-color: #00a18f;
}

/* Search and filter styles */
.search-filter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-filter input {
  width: 100%;
  max-width: 400px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.search-filter select {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #ccc;
}

/* User list table styles */
.user-list table {
  width: 100%;
  border-collapse: collapse;
}

.user-list th,
.user-list td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: left;
}

.user-list th {
  background-color: #f0f0f0;
}

.info {
  text-transform: capitalize;
}

.user-list button {
  padding: 8px 12px;
  margin-right: 5px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.user-list button:first-of-type {
  background-color: #00bfa5;
  color: #fff;
  border: none;
}

.user-list button:last-of-type {
  background-color: #e74c3c;
  color: white;
  border: none;
}

.user-list button:hover {
  opacity: 0.9;
}

/* Mobile View Styles */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
  }

  .sidebar.active {
    transform: translateX(0);
  }

  .main-content {
    margin-left: 0;
    width: 100%;
  }

  .main-content.full-width {
    margin-left: 0;
    width: 100%;
  }
  .user-management-content {
    /* width: 100%; */
    margin-left: 0px;
    height: 92vh;
    padding: 5px;
  }

  .table-container {
    max-height: 70vh;
  }
  .role-menu button {
    margin-right: 10px;
    padding: 5px;
    font-size: 0.9rem;
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
  h2 {
    font-size: 1.2rem;
  }

  .info {
    font-size: 0.9rem;
  }

  .sidebar-toggle {
    display: block;
  }
}
</style>
