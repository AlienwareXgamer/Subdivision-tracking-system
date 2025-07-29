<template>
  <div>
    <!-- Sidebar based on user role -->
    <SidebarNav v-if="userRole === 'admin'" />
    <UserSideNav v-else-if="userRole === 'resident'" />
    <SecuritySidebar v-else-if="userRole === 'security'" />

    <div class="main-content">
      <div class="qr-generator scrollable-container">
        <h2>Generate QR Code for non-resident entry</h2>

        <form @submit.prevent="generateQRCode">
          <div class="form-group">
            <label for="category">Category: </label>
            <select v-model="guestDetails.category" id="category" required>
              <option value="guest">Guest</option>
              <option value="worker">Worker</option>
              <option value="renter">Renter</option>
            </select>
          </div>

          <!-- Guest/Renter Options -->
          <div
            v-if="
              guestDetails.category === 'guest' ||
              guestDetails.category === 'renter' ||
              guestDetails.category === 'worker'
            "
          >

          <label for="location" class="special-case">Location:</label>
            <div class="form-group">
              <input
              type="text"
              v-model="guestDetails.location"
              id="location"
              placeholder="Enter rental location"
              required
            />
            </div>
            <div class="form-group">
              <label>Entry Type:</label>
              <div class="select-mode">
                <label>
                  <input
                    type="radio"
                    value="individual"
                    v-model="guestDetails.entryType"
                  />
                  Individual
                </label>
                <label>
                  <input
                    type="radio"
                    value="group"
                    v-model="guestDetails.entryType"
                  />
                  Group
                </label>
              </div>
            </div>

            <!-- Individual Entry -->
            <div
              v-if="guestDetails.entryType === 'individual'"
              class="form-group"
            >
              <label for="guestName">Name:</label>
              <input
                type="text"
                v-model="guestDetails.guestName"
                id="guestName"
                required
              />
              <label for="individualImage" class="just-space">Upload Image:</label>
              <input
                type="file"
                @change="uploadImage('individual')"
                id="individualImage"
                accept="image/*"
                required
              />
            </div>

            <!-- Group Entry -->
            <div
              v-else-if="guestDetails.entryType === 'group'"
              class="form-group"
            >
              <label for="guestName">Guest Name (Main):</label>
              <input
                type="text"
                v-model="guestDetails.guestName"
                id="guestName"
                required
              />
              <label for="names" class="just-space">Names of Passengers (Separate by line):</label>
              <textarea
                v-model="guestDetails.names"
                id="names"
                placeholder="Enter one name per line"
                required
              ></textarea>
              <label for="driverImage" class="just-space">Upload Driver Image:</label>
              <input
                type="file"
                @change="uploadImage('driver')"
                id="driverImage"
                accept="image/*"
                required
              />
            </div>
          </div>

          <!-- Expiration Options -->
          <div class="form-group">
            <label>Set Expiration:</label>
            <div class="select-mode">
              <label>
                <input type="radio" value="duration" v-model="expirationType" />
                Set Validity Duration (in hours)
              </label>
              <label>
                <input type="radio" value="date" v-model="expirationType" />
                Set Start and End Date
              </label>
            </div>
          </div>

          <div v-if="expirationType === 'duration'" class="form-group">
            <label for="validityDuration">Validity Duration (in hours):</label>
            <input
              type="number"
              v-model="validityDuration"
              id="validityDuration"
              required
            />
          </div>

          <div v-if="expirationType === 'date'" class="form-group">
            <label for="startDate">Start Date:</label>
            <input
              type="datetime-local"
              v-model="startDate"
              id="startDate"
              required
            />
            <label for="endDate">End Date:</label>
            <input
              type="datetime-local"
              v-model="endDate"
              id="endDate"
              required
            />
          </div>

          <button type="submit" class="generate-qr-button">Generate QR Code</button>
        </form>

        <div v-if="qrCodeUrl" class="qr-code">
          <h3>
            QR Code for
            {{ guestDetails.guestName }}
            - {{ guestDetails.category }}
          </h3>
          <img :src="qrCodeUrl" alt="Generated QR Code" />
          <a
            :href="qrCodeUrl"
            :download="guestDetails.guestName + '-QRCode.png'"
            class="download-button"
          >
            Download QR Code
          </a>

          <button @click="refreshPage" class="generate-another-button">
            Generate Another QR
          </button>
        </div>

        <div class="manage-button-container">
          <button @click="navigateToQRCodeManagement">
            Manage Your QR Codes
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SidebarNav from "@/components/SidebarNav.vue";
import UserSideNav from "@/components/user/UserSideNav.vue";
import SecuritySidebar from "@/components/securityComp/SecuritySidebar.vue";
import { db, storage } from "@/firebase";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import QRCode from "qrcode";

export default {
  components: { SidebarNav, UserSideNav, SecuritySidebar },
  data() {
    return {
      guestDetails: {
        category: "",
        entryType: "",
        guestName: "", // Main guest name for both individual and group entries
        names: "", // Passenger names for group entries only
        imageUrl: "", // Image URL for driver or individual
        location: "",
      },
      validityDuration: 1,
      qrCodeUrl: "",
      userRole: "",
      creatorName: "",
      expirationType: "duration",
      startDate: "",
      endDate: "",
    };
  },
  watch:{
    'guestDetails.category'(){
      this.resetForm()
    }
  },
  async created() {
    await this.getUserRole();
  },
  methods: {
    navigateToQRCodeManagement() {
      this.$router.push({ name: "manage-qr" });
    },
    refreshPage(){
      window.location.reload()
    },
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
    resetForm(){
      this.guestDetails.entryType = "";
      this.guestDetails.guestName = "";
      this.guestDetails.names = "";
      this.guestDetails.imageUrl = "";
      this.guestDetails.location = "";
      this.validityDuration = 1;
      this.startDate = "";
      this.endDate = "";
      this.expirationType = "duration";
      this.qrCodeUrl = "";
    },
    async uploadImage(type) {
      const file = event.target.files[0];
      if (file) {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const storageReference = storageRef(
          storage,
          `guestImages/${currentUser.uid}/${file.name}`
        );
        await uploadBytes(storageReference, file);
        this.guestDetails.imageUrl = await getDownloadURL(storageReference);
      }
    },
    async generateQRCode() {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) return;

      try {
        const expirationTime =
          this.expirationType === "duration"
            ? new Date(
                new Date().getTime() + this.validityDuration * 60 * 60 * 1000
              )
            : new Date(this.endDate);

        const names =
          this.guestDetails.entryType === "group"
            ? this.guestDetails.names.split("\n")
            : null;

        const qrCodeRef = await addDoc(collection(db, "guest_qrcodes"), {
          guestName: this.guestDetails.guestName, // Unified guest name for individual and main group name
          names,
          category: this.guestDetails.category,
          entryType: this.guestDetails.entryType,
          location: this.guestDetails.location,
          createdBy: currentUser.email,
          creatorName: this.creatorName,
          imageUrl: this.guestDetails.imageUrl,
          expirationTime,
          startDate:
            this.expirationType === "date" ? new Date(this.startDate) : null,
          createdAt: serverTimestamp(),
        });

        const qrCodeData = `https://itcapstonerfidandqr.web.app/view-qr/${qrCodeRef.id}`;
        this.qrCodeUrl = await QRCode.toDataURL(qrCodeData, { width: 300 });

        await updateDoc(doc(db, "guest_qrcodes", qrCodeRef.id), {
          qrCodeUrl: this.qrCodeUrl,
        });

        alert("QR Code generated and stored successfully!");
      } catch (error) {
        console.error("Error generating QR code", error);
      }
    },
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

/* Style for the container */
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* Main content area */
.main-content {
  margin-left: 250px; /* Make room for the fixed sidebar */
  padding: 20px;
  background-color: #00bfa5;
  height: 100vh;
  overflow: hidden;
}

h2 {
  text-align: center;
  margin-bottom: 20px;
  font-size: 2rem;
  font-weight: bold;
  text-transform: uppercase;
  background: linear-gradient(to right, #00bfa5, #007f66);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 1px 1px 5px rgba(0, 0, 0, 0.2);
  font-family: 'Poppins', sans-serif;
  letter-spacing: 1.5px;
  padding-bottom: 10px;
  border-bottom: 2px solid #00bfa5;
  display: inline-block;
}

.qr-generator {
  max-width: 600px;
  height: 95vh;
  margin: auto;
  background-color: #f9f9f9;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  max-height: (100vh - 100px);
}

.scrollable-container {
  max-height: 100vh;
  overflow-y: auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.just-space{
  margin-top: 10px;
}

.form-group label {
  display: block;
  margin-bottom: 10px;
  font-weight: bold;
  color: #00bfa5;
}

.special-case{
  font-weight: bold;
  color: #00bfa5;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 2px solid #00bfa5;
  border-radius: 10px;
  font-size: 1rem;
  outline: none;
  transition: all 0.3s ease;
}

.form-group textarea:focus,
.form-group select:focus {
  border-color: #007f66;
  box-shadow: 0 0 10px rgba(0, 191, 165, 0.5);
}

/* Radio Button Group */
.form-group div {
  display: flex;
  gap: 15px;
  align-items: center;
}

.form-group label input[type="radio"] {
  margin-right: 10px;
}

/* File Input Styles */
.form-group input[type="file"] {
  padding: 10px;
  border: 2px dashed #00bfa5;
  border-radius: 10px;
  background-color: #e0f7fa;
  cursor: pointer;
}

.form-group input[type="file"]:hover {
  border-color: #007f66;
}

.select-mode{
  justify-content: space-evenly;
}

/* Button Styles */
button {
  width: 100%;
  padding: 15px;
  font-size: 1rem;
  font-weight: bold;
  border: none;
  border-radius: 10px;
  color: #fff;
  cursor: pointer;
  transition: background-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
  margin-top: 20px;
}

.generate-qr-button{
  background: linear-gradient(to right, #00bfa5, #007f66);
}

.generate-qr-button:hover {
  background: linear-gradient(to right, #007f66, #00bfa5);
  box-shadow: 0 4px 10px rgba(0, 191, 165, 0.5);
  transform: translateY(-3px);
}

/* Download Button */
.download-button {
  display: inline-block;
  text-align: center;
  padding: 10px 20px;
  font-size: 1rem;
  margin-top: 20px;
  border-radius: 10px;
  background: linear-gradient(to right, #27ae60, #2ecc71);
  box-shadow: 0 4px 10px rgba(0, 191, 165, 0.2);
  color: #fff;
  text-decoration: none;
  transition: all 0.3s ease;
}

.download-button:hover {
  background: linear-gradient(to right, #1e8449, #27ae60);
  box-shadow: 0 8px 20px rgba(0, 191, 165, 0.4);
  transform: translateY(-3px);
}

/* QR Code Image */
.qr-code img {
  display: block;
  margin: 20px auto;
  width: 300px;
  height: 300px;
}

.generate-another-button {
  width: 100%;
  padding: 15px;
  font-size: 1rem;
  font-weight: bold;
  border: none;
  border-radius: 10px;
  background: linear-gradient(to right, #16a085, #1abc9c);
  box-shadow: 0 4px 10px rgba(0, 191, 165, 0.2);
  color: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 20px;
}

.generate-another-button:hover {
  background: linear-gradient(to right, #0e6655, #16a085);
  box-shadow: 0 8px 20px rgba(0, 191, 165, 0.4);
  transform: translateY(-3px);
}

/* Manage Button Container */
.manage-button-container {
  margin-top: 30px;
}

.manage-button-container button {
  padding: 15px;
  background: linear-gradient(to right, #3498db, #2980b9);
  color: #fff;
  border-radius: 10px;
  font-size: 1rem;
  box-shadow: 0 4px 10px rgba(52, 152, 219, 0.2);
}

.manage-button-container button:hover {
  background-color: #2980b9;
  box-shadow: 0 8px 20px rgba(52, 152, 219, 0.4);
  transform: translateY(-3px);
}

/* Additional styling for responsiveness */
@media (max-width: 768px) {
  .sidebar {
    width: 200px; /* Adjust sidebar width on smaller screens */
  }

  .main-content {
    margin-left: 0px;
    width: 100%;
  }
}
</style>
