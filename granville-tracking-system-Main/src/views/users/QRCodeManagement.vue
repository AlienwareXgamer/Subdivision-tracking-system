<template>
  <div>
    <!-- Sidebar based on user role -->
    <SidebarNav v-if="userRole && userRole === 'admin'" />
    <UserSideNav v-else-if="userRole && userRole === 'resident'" />
    <SecuritySidebar v-else-if="userRole && userRole === 'security'" />

    <div class="main-content">
      <div class="content-container">
        <h2>Your Generated QR Codes</h2>

        <div class="controls">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by guest name..."
            class="search-input"
          />

          <select v-model="selectedCategory" class="sort-select">
            <option value="">All Categories</option>
            <option value="guest">Guest</option>
            <option value="renter">Renter</option>
            <option value="worker">Worker</option>
          </select>

          <select v-model="sortOption" class="sort-select">
            <option value="latest">Sort by Latest</option>
            <option value="oldest">Sort by Oldest</option>
          </select>
        </div>

        <div v-if="filteredQRCodes.length === 0">
          <p>You have not generated any QR codes yet.</p>
        </div>

        <div v-else class="table-container">
          <table>
            <thead>
              <tr>
                <th>Guest Name</th>
                <th>Category</th>
                <th>Start Date</th>
                <th>Expiration Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(qrCode, index) in filteredQRCodes" :key="index">
                <td>
                  <a
                    href="#"
                    @click.prevent="viewQRCode(qrCode)"
                    class="guest-link"
                  >
                    {{ qrCode.guestName }}
                  </a>
                </td>
                <td>{{ qrCode.category }}</td>
                <td>{{ getStartDate(qrCode) }}</td>
                <td>{{ formatExpirationTime(qrCode.expirationTime) }}</td>
                <td>
                  <button @click="openEditModal(qrCode)">Edit</button>
                  <!-- <button @click="deleteQRCode(qrCode.id)" class="delete-button">
                  Delete
                </button> -->
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Edit Modal -->
        <div v-if="showEditModal" class="modal-overlay">
          <div class="modal">
            <h3>Edit QR Code</h3>
            <form @submit.prevent="updateQRCode">
              <div class="form-group">
                <label for="guestName">Guest Name:</label>
                <input
                  type="text"
                  v-model="selectedQRCode.guestName"
                  id="guestName"
                  required
                />
              </div>

              <div
                v-if="selectedQRCode.entryType === 'group'"
                class="form-group"
              >
                <label for="guestList"
                  >List of Names (Separate names by pressing enter):</label
                >
                <textarea
                  v-model="selectedQRCode.names"
                  id="guestList"
                  placeholder="Enter one name per line"
                ></textarea>
              </div>

              <div class="form-group">
                <label for="newImage">Update Image:</label>
                <input
                  type="file"
                  @change="uploadNewImage"
                  id="newImage"
                  accept="image/*"
                />
                <small v-if="selectedQRCode.imageUrl">
                  Current Image:
                  <img
                    :src="selectedQRCode.imageUrl"
                    alt="Current Image"
                    class="current-image"
                  />
                </small>
              </div>

              <div class="form-group">
                <label for="startDate">Start Date:</label>
                <input
                  type="datetime-local"
                  v-model="newStartDate"
                  id="startDate"
                  required
                />
              </div>

              <div class="form-group">
                <label for="expirationTime">Expiration Time:</label>
                <input
                  type="datetime-local"
                  v-model="newExpirationTime"
                  id="expirationTime"
                  required
                />
              </div>

              <div class="form-actions">
                <button type="submit" class="save-button">Save</button>
                <button
                  type="button"
                  @click="closeEditModal"
                  class="cancel-button"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  @click="expireQRCodeNow"
                  class="expire-button"
                >
                  Expire Now
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- QR Code Modal -->
        <div v-if="showQRCodeModal" class="modal-overlay">
          <div class="modal">
            <h3>
              QR Code for
              {{ selectedQRCode.guestName }}
            </h3>
            <img :src="selectedQRCode.qrCodeUrl" alt="Generated QR Code" />
            <div class="modal-actions">
              <a
                :href="selectedQRCode.qrCodeUrl"
                :download="selectedQRCode.guestName + '-QRCode.png'"
                class="download-button"
              >
                Download QR Code
              </a>
              <button @click="closeQRCodeModal">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import UserSideNav from "@/components/user/UserSideNav.vue";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db, storage } from "@/firebase";
import { getAuth } from "firebase/auth";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import SidebarNav from "@/components/SidebarNav.vue";
import SecuritySidebar from "@/components/securityComp/SecuritySidebar.vue";

export default {
  components: { UserSideNav, SidebarNav, SecuritySidebar },
  data() {
    return {
      qrCodes: [],
      showEditModal: false,
      selectedQRCode: null,
      showQRCodeModal: false,
      newImageUrl: null,
      newStartDate: null,
      newExpirationTime: null,
      userRole: null,
      searchQuery: "",
      selectedCategory: "",
      sortOption: "latest",
    };
  },
  async created() {
    await this.fetchUserQRCodes();
    await this.getUserRole();
  },
  computed: {
    filteredQRCodes() {
      let filtered = this.qrCodes;

      // Filter by search query
      if (this.searchQuery) {
        filtered = filtered.filter((qrCode) =>
          qrCode.guestName
            .toLowerCase()
            .includes(this.searchQuery.toLowerCase())
        );
      }

      // Filter by category
      if (this.selectedCategory) {
        filtered = filtered.filter(
          (qrCode) =>
            qrCode.category.toLowerCase() ===
            this.selectedCategory.toLowerCase()
        );
      }

      // Sort by date (latest or oldest)
      if (this.sortOption === "latest") {
        filtered.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0; // Skip if createdAt is missing
          return b.createdAt.seconds - a.createdAt.seconds;
        });
      } else if (this.sortOption === "oldest") {
        filtered.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0; // Skip if createdAt is missing
          return a.createdAt.seconds - b.createdAt.seconds;
        });
      }

      return filtered;
    },
  },
  methods: {
    async getUserRole() {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) return;

      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          this.userRole = userData.role;
          this.creatorName = `${userData.firstName} ${userData.lastName}`;
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    },

    async fetchUserQRCodes() {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
        alert("Please log in to view your QR codes.");
        return;
      }

      try {
        const q = query(
          collection(db, "guest_qrcodes"),
          where("createdBy", "==", currentUser.email)
        );

        const querySnapshot = await getDocs(q);
        this.qrCodes = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch (error) {
        console.error("Error fetching QR codes:", error);
      }
    },
    getStartDate(qrCode) {
      // Return startDate if it exists, otherwise return createdAt
      return qrCode.startDate
        ? this.formatTimestamp(qrCode.startDate)
        : this.formatTimestamp(qrCode.createdAt);
    },
    formatTimestamp(timestamp) {
      if (!timestamp) return "";
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleString();
    },
    viewQRCode(qrCode) {
      this.selectedQRCode = qrCode;
      this.showQRCodeModal = true;
    },
    closeQRCodeModal() {
      this.selectedQRCode = null;
      this.showQRCodeModal = false;
    },
    openEditModal(qrCode) {
      this.selectedQRCode = { ...qrCode };
      this.newStartDate = qrCode.startDate
        ? new Date(qrCode.startDate.seconds * 1000).toISOString().slice(0, 16)
        : new Date(qrCode.createdAt.seconds * 1000).toISOString().slice(0, 16);
      this.newExpirationTime = qrCode.expirationTime
        ? new Date(qrCode.expirationTime.seconds * 1000)
            .toISOString()
            .slice(0, 16)
        : null;
      this.showEditModal = true;
    },
    closeEditModal() {
      this.selectedQRCode = null;
      this.newExpirationTime = null;
      this.showEditModal = false;
    },
    async uploadNewImage(event) {
      const file = event.target.files[0];
      if (file && this.selectedQRCode) {
        try {
          const imageRef = storageRef(
            storage,
            `guestImages/${this.selectedQRCode.id}/${file.name}`
          );
          await uploadBytes(imageRef, file);
          this.newImageUrl = await getDownloadURL(imageRef);
          console.log("Image uploaded successfully:", this.newImageUrl);
        } catch (error) {
          console.error("Error uploading image:", error);
        }
      }
    },
    async updateQRCode() {
      if (this.selectedQRCode) {
        try {
          const qrCodeRef = doc(db, "guest_qrcodes", this.selectedQRCode.id);

          // Prepare data to update in guest_qrcodes
          const updatedData = {
            guestName: this.selectedQRCode.guestName || null,
            startDate: this.newStartDate
              ? new Date(this.newStartDate)
              : this.selectedQRCode.startDate,
            expirationTime: this.newExpirationTime
              ? new Date(this.newExpirationTime)
              : this.selectedQRCode.expirationTime,
          };

          if (this.selectedQRCode.entryType === "group") {
            // Check if `names` is a string; if so, split it, otherwise use it directly
            updatedData.names =
              typeof this.selectedQRCode.names === "string"
                ? this.selectedQRCode.names.split("\n")
                : this.selectedQRCode.names;
          } else {
            updatedData.names = null; // Clear names array for individual entry
          }

          if (this.newImageUrl) {
            updatedData.imageUrl = this.newImageUrl;
          }

          // Update Firestore document
          await updateDoc(qrCodeRef, updatedData);

          alert("QR Code updated successfully!");
          this.closeEditModal();
          await this.fetchUserQRCodes();
        } catch (error) {
          console.error("Error updating QR code:", error);
        }
      }
    },
    async deleteQRCode(qrCodeId) {
      if (confirm("Are you sure you want to delete this QR code?")) {
        try {
          await deleteDoc(doc(db, "guest_qrcodes", qrCodeId));
          alert("QR Code deleted successfully!");
          await this.fetchUserQRCodes();
        } catch (error) {
          console.error("Error deleting QR code:", error);
        }
      }
    },
    async expireQRCodeNow() {
      const qrCodeRef = doc(db, "guest_qrcodes", this.selectedQRCode.id);
      await updateDoc(qrCodeRef, { expirationTime: new Date() });
      alert("QR Code expired successfully!");
      this.closeEditModal();
      await this.fetchUserQRCodes();
    },
    formatExpirationTime(timestamp) {
      if (!timestamp) return "";
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleString();
    },
  },
};
</script>

<style scoped>
/* Styling for the table, modal, and other elements */
.main-content {
  margin-left: 250px;
  padding: 20px;
  background: linear-gradient(to bottom right, #00bfa5, #007f66);
  min-height: 100vh;
  box-sizing: border-box;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

.content-container {
  /* max-width: 900px; */
  width: -webkit-fill-available;
  margin-left: 50px;
  background-color: #ffffff;
  padding: 20px;
  border-radius: 15px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  height: calc(100vh - 30px);
  overflow: hidden;
}

.controls {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  justify-content: space-between;
  margin-top: 10px;
  gap: 15px;
  overflow-y: auto;
}

.search-input {
  width: 300px;
}

.search-input,
.sort-select {
  padding: 12px;
  border: 2px solid #00bfa5;
  border-radius: 10px;
  outline: none;
  transition: all 0.3s ease;
  font-size: 1rem;
}

.search-input:focus,
.sort-select:focus {
  border-color: #007f66;
  box-shadow: 0 0 10px rgba(0, 191, 165, 0.5);
}

h2 {
  text-align: left;
}

.table-container {
  max-height: 80vh;
  border-radius: 10px;
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid #ddd;
  background-color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  height: calc(100vh - 100px);
}

.guest-link {
  text-decoration: none; /* Remove underline */
  color: #3498db; /* Modern blue color */
  font-weight: 600; /* Make the text bold */
  cursor: pointer;
  transition: color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.guest-link:hover {
  color: #2980b9; /* Darker blue on hover */
  text-decoration: none; /* Ensure underline is not added on hover */
  box-shadow: 0 2px 0 #2980b9; /* Add a subtle shadow effect */
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0px;
}

th,
td {
  padding: 12px;
  text-align: left;
  border: 1px solid #ddd;
  cursor: pointer;
  font-size: 1rem;
}

th {
  background-color: #e0e0e0;
  color: #00bfa5;
  font-weight: bold;
}

td {
  font-size: 0.9rem;
}

tr:nth-child(even) {
  background-color: #f1f1f1;
}

.table-container tr:nth-child(even) {
  background-color: #f1f1f1;
}

.table-container button {
  padding: 8px 12px;
  background-color: #2ecc71;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 5px;
}

.table-container button:hover {
  background-color: #27ae60;
}

.table-container .delete-button {
  background-color: #e74c3c;
}

.table-container .delete-button:hover {
  background-color: #c0392b;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: #ffffff;
  border-radius: 15px;
  padding: 20px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: fadeIn 0.3s ease;
}

.modal h3 {
  color: #007f66;
  text-align: center;
  margin-bottom: 20px;
}

/* Form Group */
.form-group {
  margin-bottom: 15px;
}

.form-group label {
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
  display: block;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px;
  border: 2px solid #00bfa5;
  border-radius: 10px;
  outline: none;
  transition: border-color 0.2s ease;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #007f66;
}

.modal .download-button {
  background-color: #3498db;
  color: white;
  padding: 10px 20px;
  text-decoration: none;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
  transition: background-color 0.3s;
}

.modal .download-button:hover {
  background-color: #2980b9;
}

.modal button {
  padding: 10px 20px;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 5px;
}

.current-image {
  display: block;
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 10px;
  margin-top: 10px;
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 20px;
}

/* Buttons */
.save-button {
  background-color: #007f66;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s ease;
}

.save-button:hover {
  background-color: #005a48;
}

.cancel-button {
  background-color: #f39c12;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s ease;
}

.cancel-button:hover {
  background-color: #d08704;
}

.expire-button {
  background-color: #c0392b;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s ease;
}

.expire-button:hover {
  background-color: #a93226;
}

/* Animation */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Styles */
@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
    padding: 10px;
  }

  .content-container {
    padding: 15px;
  }

  .controls {
    flex-direction: column;
  }

  .search-input,
  .sort-select {
    width: 100%;
    font-size: 0.9rem;
  }

  table {
    font-size: 0.8rem;
  }

  th,
  td {
    padding: 8px;
  }

  .modal {
    max-width: 100%;
    padding: 15px;
  }

  button {
    width: 100%;
    padding: 10px;
  }
}

/* Extra Small Screens */
@media (max-width: 480px) {
  .search-input,
  .sort-select,
  input[type="text"],
  input[type="datetime-local"],
  textarea {
    font-size: 0.8rem;
    padding: 8px;
  }

  .content-container {
    margin-left: 0px;
  }

  .form-actions {
    flex-direction: column;
  }

  button {
    font-size: 0.9rem;
  }

  .current-image {
    width: 80px;
    height: 80px;
  }
}
</style>
