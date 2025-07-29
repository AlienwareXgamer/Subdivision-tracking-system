<template>
    <div>
      <SecuritySidebar />
  
      <div class="main-content">
        <div class="faq-container">
          <h1>Frequently Asked Questions</h1>
  
          <!-- Card for Role Description -->
          <div class="faq-card">
            <h3>What is my role as a Security Guard?</h3>
            <p>
              As a security guard, you oversee the subdivision gate. You monitor the entry and exit of residents and guests using RFID scans and QR code checks. Your main responsibility is to ensure that only authorized individuals are granted access.
            </p>
          </div>
  
          <!-- Card for Dashboard Guide -->
          <div class="faq-card">
            <h3>How does the Dashboard work?</h3>
            <p>
              The Dashboard provides real-time updates of residents scanning their RFID tags. It displays their photos and entry/exit status, helping you verify their identity swiftly.
            </p>
          </div>
  
          <!-- Card for QR Code Scanner Guide -->
          <div class="faq-card">
            <h3>How do I use the QR Code Scanner?</h3>
            <p>
              The QR Code Scanner allows you to scan QR codes using a webcam. Here’s what happens when you scan a QR code:
            </p>
            <div class="guide-list">
              <div><strong>Expired:</strong> The QR code has expired and access is denied.</div>
              <div><strong>Not Started:</strong> The QR code is not yet active; access will be denied until the start date.</div>
              <div><strong>Access Granted:</strong> The QR code is valid and access is granted.</div>
              <div><strong>Exit Recorded:</strong> The visitor’s exit is logged after scanning the QR code.</div>
            </div>
            <p class="important-note">
              Click the link displayed after scanning to view detailed information in a new tab.
            </p>
          </div>
  
          <!-- Card for QR Code Generation Guide -->
          <div class="faq-card">
            <h3>How do I generate a QR Code for non-residents?</h3>
            <div class="guide-list">
              <div>1. <strong>Select a Category:</strong> Choose from Visitor, Renter, or Worker.</div>
              <div>2. <strong>Enter Location:</strong> Specify the destination for the guest.</div>
              <div>3. <strong>Choose Visit Type:</strong>
                <div class="sub-guide">For <strong>Individual</strong>: Enter the guest’s name and upload a photo.</div>
                <div class="sub-guide">For <strong>Group</strong>: Enter the representative’s name, upload their photo, and list the group members.</div>
              </div>
              <div>4. <strong>Set Expiration:</strong> Choose either "Validity Duration" or "Set Start and End Date" for the QR code.</div>
              <div>5. <strong>Generate QR Code:</strong> Click "Generate QR Code" to create it. Download and share the QR code with the guest.</div>
            </div>
            <p class="important-note">
              <strong>Note:</strong> The first scan of the QR code will always log as an <strong>Entry</strong>, followed by <strong>Exit</strong> on subsequent scans. Ensure visitors are guided accordingly.
            </p>
          </div>
  
          <!-- Card for Managing QR Codes Guide -->
          <div class="faq-card">
            <h3>How can I manage generated QR Codes?</h3>
            <p>
              On the "Manage QR Codes" page, you can view, edit, and redownload the QR codes. You can update the details without resending the image to the visitor.
            </p>
          </div>
  
          <!-- Card for Reporting Issues -->
          <div class="faq-card">
            <h3>How do I report issues or give feedback?</h3>
            <p>
              Use the Contact Form on the "Report" page for any issues or feedback. You can also reach us by phone at the provided contact numbers.
            </p>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import SecuritySidebar from "@/components/securityComp/SecuritySidebar.vue";
  
  export default {
    components: {
      SecuritySidebar,
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