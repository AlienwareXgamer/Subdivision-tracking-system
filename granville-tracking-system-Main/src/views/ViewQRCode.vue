<template>
  <div>
    <h2>QR Code Details</h2>
    <div v-if="qrCodeDetails">
      <!-- Display the guest's image -->
      <div v-if="qrCodeDetails.imageUrl" class="guest-image">
        <img :src="qrCodeDetails.imageUrl" alt="Guest Image" />
      </div>

      <p><strong>Guest Name:</strong> {{ qrCodeDetails.guestName }}</p>
      <p><strong>Category:</strong> {{ qrCodeDetails.category }}</p>
      <p><strong>Created By:</strong> {{ qrCodeDetails.creatorName }}</p>
      <p><strong>Location:</strong> {{ qrCodeDetails.location }}</p>

      <div v-if="qrCodeDetails.entryType == 'group'">
        <p><strong>Names:</strong></p>
        <p v-for="(name, index) in qrCodeDetails.names" :key="index"> {{ name }}</p>
      </div>

      <p>
        <strong>Starting Date:</strong>
        {{ displayStartDate }}
      </p>

      <p>
        <strong>Expiration Time:</strong>
        {{ expirationDate }}
      </p>

      <!-- Display validity status based on access condition -->
      <p v-if="isExpired" class="expired-text">GUEST PASS EXPIRED</p>
      <p v-else-if="!isAccessAllowed" class="expired-text">
        ACCESS NOT YET VALID
      </p>
      <p v-else class="valid-text">GUEST PASS VALID</p>
    </div>
  </div>
</template>

<script>
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";

export default {
  data() {
    return {
      qrCodeDetails: null, // Store the fetched QR code details
      isExpired: false,
      isAccessAllowed: false,
      expirationDate: "",
      displayStartDate: "", // Displayed starting date
    };
  },
  async created() {
    const qrCodeDocumentId = this.$route.params.documentId; // Get document ID from URL

    try {
      const qrCodeDocRef = doc(db, "guest_qrcodes", qrCodeDocumentId);
      const qrCodeDoc = await getDoc(qrCodeDocRef);

      if (qrCodeDoc.exists()) {
        const data = qrCodeDoc.data(); // Fetch and store the latest QR code details
        this.qrCodeDetails = data;

        // Retrieve dates
        const now = new Date();
        const startDate = data.startDate
          ? new Date(data.startDate.seconds * 1000)
          : new Date(data.createdAt.seconds * 1000);
        const expirationTime = new Date(data.expirationTime.seconds * 1000);

        // Set formatted dates for display
        this.displayStartDate = startDate.toLocaleString();
        this.expirationDate = expirationTime.toLocaleString();

        // Check if the QR code has expired
        this.isExpired = now > expirationTime;

        // Check if access is allowed based on the scan time being within the validity period
        this.isAccessAllowed = now >= startDate && now <= expirationTime;
      } else {
        console.error("No such QR code document exists.");
      }
    } catch (error) {
      console.error("Error fetching QR code details:", error);
    }
  },
};
</script>

<style scoped>
.guest-image {
  margin-top: 20px;
}

p {
  font-size: 30px;
  padding-bottom: 12px;
}

.guest-image img {
  max-width: 400px;
  height: auto;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.expired-text {
  color: red;
  font-size: 24px;
  font-weight: bold;
  margin-top: 20px;
}

.valid-text {
  color: green;
  font-size: 50px;
  font-weight: bold;
  margin-top: 20px;
}
</style>
