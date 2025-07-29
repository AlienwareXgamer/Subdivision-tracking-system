<template>
  <div>
    <UserSideNav />

    <div class="main-content">
      <div class="faq-container">
        <h1>Resident Frequently Asked Questions</h1>

        <!-- Dashboard Guide -->
        <div class="faq-card">
          <h3>Dashboard</h3>
          <p>
            The Dashboard allows residents to view their profile information.
            You can upload a profile picture for RFID identification (2x2
            front-facing photo). The Recent Activity and System Alerts features
            are currently under development.
          </p>
        </div>

        <!-- QR Code Generation Guide -->
        <div class="faq-card">
          <h3>How to Generate a QR Code</h3>
          <div class="guide-list">
            <div>
              1. <strong>Select a Category:</strong> Choose from Guest, Renter,
              or Worker.
            </div>
            <div>
              2. <strong>Enter Location:</strong> Specify the destination for
              the guest.
            </div>
            <div>3. <strong>Choose Visit Type:</strong></div>
            <div class="sub-guide">
              For <strong>Individual</strong>: Enter the guest’s name and upload
              their photo.
            </div>
            <div class="sub-guide">
              For <strong>Group</strong>: Enter the representative’s name,
              upload their photo, and list the group members.
            </div>
            <div>
              4. <strong>Set Expiration:</strong> Choose "Validity Duration" or
              "Set Start and End Date".
            </div>
            <div>
              5. <strong>Generate QR Code:</strong> Click "Generate QR Code" to
              create it. Download and share the QR code with the guest.
            </div>
          </div>
          <p class="important-note">
            <strong>Note:</strong> Guests must present their QR codes upon entry
            and again when exiting. The first scan will log as
            <strong>Entry</strong>, and the next will log as
            <strong>Exit</strong>. Guide your visitors accordingly.
          </p>
        </div>

        <!-- Manage QR Codes Guide -->
        <div class="faq-card">
          <h3>Manage QR Codes</h3>
          <p>
            To view your created QR code, please navigate to the QR Code
            Generate page and select "Manage Your QR Codes." Here, residents can
            conveniently view, edit, and redownload their previously created QR
            codes without needing to resend the image to their guests.
          </p>
        </div>

        <!-- My Logs Guide -->
        <div class="faq-card">
          <h3>My Logs</h3>
          <p>
            The My Logs page displays your RFID entries and exits. You can sort
            the logs by:
          </p>
          <ul>
            <li><strong>Mode:</strong> Entry or Exit,</li>
            <li><strong>Date,</strong></li>
            <li><strong>Latest entries first</strong></li>
          </ul>
        </div>

        <!-- Guest Logs Guide -->
        <div class="faq-card">
          <h3>Guest Logs</h3>
          <p>The Guest Logs page shows the logs of your guests. You can:</p>
          <ul>
            <li>Search logs by <strong>guest’s name</strong></li>
            <li>
              Sort logs by
              <strong>date, category, status, and latest entries</strong>
            </li>
          </ul>
        </div>

        <!-- Report/Contact Us Guide -->
        <div class="faq-card">
          <h3>Report Issues</h3>
          <p>
            Use the "Report" page for any issues or feedback. Submit your
            concerns directly to the admin, attach files if needed, and expect a
            response to your email within 1-2 business days.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import UserSideNav from "@/components/user/UserSideNav.vue";

export default {
  components: {
    UserSideNav,
  },
};
</script>

<style scoped>
/* Global Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

/* Main Content Area */
.main-content {
  margin-left: 250px;
  padding: 40px;
  background: linear-gradient(to bottom right, #00bfa5, #007f66);
  height: 100vh;
  overflow-y: auto;
  scroll-behavior: smooth;
}

/* FAQ Container */
.faq-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* FAQ Card */
.faq-card {
  background-color: #ffffff;
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.faq-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

/* Heading Styles */
h1 {
  text-align: center;
  color: #007f66;
  font-size: 2.5rem;
  margin-bottom: 20px;
}

h3 {
  color: #007f66;
  font-size: 1.4rem;
  margin-bottom: 10px;
}

/* Text Styles */
p {
  color: #333;
  font-size: 1rem;
  line-height: 1.6;
}

ul {
  padding-left: 20px;
  list-style: none;
}

li {
  margin-bottom: 10px;
}

/* Guide List Styles */
.guide-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sub-guide {
  padding-left: 20px;
  color: #555;
}

/* Important Note */
.important-note {
  color: #c62828;
  background-color: #ffebee;
  padding: 10px;
  border-radius: 8px;
  margin-top: 15px;
  font-weight: bold;
}

/* Responsive Styles */
@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
    padding: 20px;
  }

  h1 {
    font-size: 2rem;
  }

  h3 {
    font-size: 1.2rem;
  }

  p,
  .guide-list div {
    font-size: 0.9rem;
  }
}
</style>
