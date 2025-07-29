  <template>
    <div>
      <!-- Conditionally render sidebar based on user role -->
      <div v-if="userRole === 'resident'">
        <UserSideNav />
      </div>
      <div v-else-if="userRole === 'security'">
        <SecuritySidebar />
      </div>

      <!-- Main content on the right -->
      <div class="main-content">
        <div class="contact-us">
          <h2>Contact Us</h2>

          <!-- Contact Form -->
          <form ref="contactForm" @submit.prevent="sendEmail">
            <div class="form-group">
              <label for="fromEmail">From:</label>
              <input
                type="email"
                id="fromEmail"
                v-model="fromEmail"
                readonly
                class="form-control"
              />
            </div>

            <div class="form-group">
              <label for="message">Message:</label>
              <textarea
                id="message"
                v-model="message"
                placeholder="Write your concern here..."
                required
                class="form-control message-box"
              ></textarea>
            </div>

            <!-- File Attachments -->
            <div class="form-group">
              <label for="files">Attach Files:</label>
              <input
                type="file"
                id="files"
                @change="handleFilesChange"
                multiple
                class="form-control"
                :class="messageBox"
                accept="image/*"
              />
            </div>

            <!-- Display selected files -->
            <div v-if="selectedFiles.length > 0" class="file-list">
              <h3>Selected Files:</h3>
              <ul>
                <li v-for="(file, index) in selectedFiles" :key="index">
                  {{ file.name }}
                  <button
                    type="button"
                    class="remove-button"
                    @click="removeFile(index)"
                  >
                    &#x2212; <!-- Minus sign -->
                  </button>
                </li>
              </ul>
            </div>

            <button type="submit" class="send-button">Send</button>
          </form>

          <div v-if="statusMessage" class="status-message">
            {{ statusMessage }}
          </div>
        </div>
      </div>
    </div>
  </template>

  <script>
  import SecuritySidebar from "@/components/securityComp/SecuritySidebar.vue";
  import UserSideNav from "@/components/user/UserSideNav.vue";
  import { db, storage } from "@/firebase";
  import emailjs from "emailjs-com";
  import { getAuth, onAuthStateChanged } from "firebase/auth";
  import { collection, getDocs, query, where } from "firebase/firestore";
  import { ref, onMounted } from "vue";
  import {
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
  } from "firebase/storage";

  export default {
    components: {
      UserSideNav,
      SecuritySidebar,
    },
    setup() {
      const auth = getAuth();
      const currentUser = ref(null);
      const fromEmail = ref("");
      const fromName = ref("");
      const userRole = ref("");
      const message = ref("");
      const statusMessage = ref("");
      const adminEmails = ["admin1@example.com", "admin2@example.com"];
      const selectedFiles = ref([]);
      const fileUrls = ref([]);

      // Handle file change
      const handleFilesChange = (event) => {
        const files = Array.from(event.target.files);
        selectedFiles.value = [...selectedFiles.value, ...files];
        console.log("Selected files:", selectedFiles.value);
      };

      // Trigger the file input to add more files
      const triggerFileInput = () => {
        document.getElementById("files").click();
      };

      // Fetch the current user's details from Firestore
      const fetchUserDetails = async () => {
        if (currentUser.value) {
          try {
            const userQuery = query(
              collection(db, "users"),
              where("email", "==", currentUser.value.email)
            );
            const userSnapshot = await getDocs(userQuery);

            if (!userSnapshot.empty) {
              const userData = userSnapshot.docs[0].data();
              fromEmail.value = userData.email || "";
              fromName.value =
                `${userData.firstName} ${userData.lastName}` || "Unknown User";
              userRole.value = userData.role || "";
            } else {
              console.error(
                "No matching user document found for the current email."
              );
            }
          } catch (error) {
            console.error("Error fetching user details:", error);
          }
        }
      };

      //   Upload files to Firebase Storage
      const uploadFiles = async () => {
        fileUrls.value = [];
        for (const file of selectedFiles.value) {
          const storagePath = `contact-us/${Date.now()}_${file.name}`;
          const fileRef = storageRef(storage, storagePath);
          await uploadBytes(fileRef, file);
          const fileUrl = await getDownloadURL(fileRef);
          fileUrls.value.push(fileUrl);
        }
      };

      const removeFile = (index) => {
        console.log("Removing file at index:", index);
        selectedFiles.value.splice(index, 1);
        console.log("Updated selected files:", selectedFiles.value);
      };

      // Send email with file URLs
      const sendEmail = async () => {
        if (!fromEmail.value || !message.value) {
          statusMessage.value = "Please fill in the message.";
          return;
        }

        try {
          // Upload files and get URLs
          if (selectedFiles.value.length > 0) {
            await uploadFiles();
          }

          // Construct the message with file URLs
          const attachments =
            fileUrls.value.length > 0
              ? `Attached files:\n${fileUrls.value.join("\n")}`
              : "";

          const templateParams = {
            from_name: fromName.value,
            from_email: fromEmail.value,
            to_name: "Admin Team",
            to_email: adminEmails.join(","),
            message: `${message.value}\n\n${attachments}`,
          };

          // EmailJS details
          const serviceID = "service_1fbjvtk";
          const templateID = "template_1754pe9";
          const userID = "HHEl0uW-fYw-YW80e";

          // Send email using EmailJS
          await emailjs.send(serviceID, templateID, templateParams, userID);
          statusMessage.value = "Your message has been sent successfully!";
          message.value = "";
          selectedFiles.value = [];

          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } catch (error) {
          console.error("Error sending email:", error);
          statusMessage.value = "Failed to send your message. Please try again.";
        }
      };

      onMounted(() => {
        onAuthStateChanged(auth, async (user) => {
          currentUser.value = user;
          if (user) {
            await fetchUserDetails();
          } else {
            console.error("User not authenticated.");
          }
        });
      });

      return {
        fromEmail,
        fromName,
        message,
        sendEmail,
        statusMessage,
        userRole,
        handleFilesChange,
        selectedFiles,
        triggerFileInput,
        removeFile
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
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  }

  .main-content {
    margin-left: 250px;
    padding: 20px;
    background-color: #00bfa5;
    height: 100vh;
  }

  .contact-us {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  }

  h2 {
    text-align: center;
    color: #007f66;
    margin-bottom: 20px;
    font-weight: 700;
  }

  .form-group {
    margin-bottom: 15px;
  }

  .form-control {
    width: 100%;
    padding: 12px;
    border: 2px solid #00bfa5;
    border-radius: 10px;
    outline: none;
    transition: all 0.3s ease;
  }

  .message-box {
    height: 40vh; /* Set height to 40% of the viewport */
    min-height: 200px; /* Minimum height for smaller screens */
    max-height: 60vh; /* Maximum height to prevent overflow */
    resize: vertical; /* Allow users to resize the box vertically */
  }

  .form-control:focus {
    border-color: #007f66;
    box-shadow: 0 0 10px rgba(0, 191, 165, 0.5);
  }

  .send-button {
    width: 100%;
    padding: 12px;
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.3s ease;
  }

  .send-button:hover {
    background-color: #2980b9;
  }

  .status-message {
    margin-top: 15px;
    text-align: center;
    color: #2ecc71;
    font-weight: 500;
  }

  .file-list h3 {
    margin-top: 10px;
    color: #007f66;
  }

  .file-list ul {
    padding: 0;
    list-style: none;
  }
  /* Additional styling for responsiveness */
  @media (max-width: 768px) {
    .sidebar {
      width: 200px; /* Adjust sidebar width on smaller screens */
    }

    .main-content {
      margin-left: 0px; /* Adjust content margin accordingly */
    }
  }
  </style>
