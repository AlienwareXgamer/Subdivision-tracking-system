<template>
  <div class="home">
    <div class="login-container">
      <form @submit.prevent="handleLogin">
        <input v-model="email" type="email" placeholder="EMAIL" />
        <br />
        <div class="password-input-container">
          <input v-model="password" 
          :type="showPassword ? 'text' : 'password'" 
          placeholder="PASSWORD" />
          <span
            class="toggle-password"
            @click="togglePasswordVisibility"
          >
            <i :class="showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"></i>
          </span>
        </div>
        <br />

        <label for="role">Role:</label>
        <select v-model="role" id="role">
          <option value="admin">Admin</option>
          <option value="resident">Resident</option>
          <option value="security">Security</option>
        </select>
        <br /><br />

        <a href="#" @click.prevent="handleForgotPassword">Forgot password?</a>
        <br /><br />

        <button type="submit">LOGIN</button>
      </form>
      <p v-if="error" class="error">{{ error }}</p>

      <!-- Warning modal-->
      <div v-if="showModal" class="modal">
        <p>{{ modalMessage }}</p>
        <button @click="closeModal">OK</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from "vue";
import { auth, db } from "@/firebase";
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "vue-router";

export default {
  setup() {
    const email = ref("");
    const password = ref("");
    const role = ref("resident"); // Default role
    const error = ref(null);
    const showModal = ref(false); // Controls modal visibility
    const modalMessage = ref(""); // Modal message
    const showPassword = ref(false)

    const router = useRouter();

    // Toggle password visibility
    const togglePasswordVisibility = () => {
      showPassword.value = !showPassword.value
    }

    // Close modal function
    const closeModal = () => {
      showModal.value = false;
    };

    const handleLogin = async () => {
      try {
        // Sign in the user with Firebase Authentication
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email.value,
          password.value
        );
        const user = userCredential.user;

        console.log("Logged-in user UID:", user.uid);

        // Fetch the user's role from Firestore using the user UID
        const userDocRef = doc(db, "users", user.uid); // DocumentReference
        const userDoc = await getDoc(userDocRef); // DocumentSnapshot

        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log("User data:", userData);

          // Check if the role matches
          if (userData.role === role.value) {
            console.log(`Successful "${role.value}" user login`);

            // Redirect based on role
            if (role.value === "admin") {
              router.push({ name: "users-management" });
            } else if (role.value === "resident") {
              router.push({ name: "user-dashboard" });
            } else if (role.value === "security") {
              router.push({ name: "security-dashboard" });
            }
          } else {
            // Role mismatch, show modal and sign the user out
            modalMessage.value = `Role mismatch! You selected "${role.value}" but your role is "${userData.role}"`;
            showModal.value = true;
            await signOut(auth); // Immediately sign the user out if the role doesn't match
          }
        } else {
          // User data not found in Firestore
          modalMessage.value = "User data not found in Firestore!";
          showModal.value = true;
          await signOut(auth); // Sign out the user since no Firestore data is found
        }
      } catch (err) {
        console.error("Login failed:", err.message);

        // Display appropriate error message
        if (err.code === "auth/user-not-found") {
          modalMessage.value =
            "Account does not exist. Please check your email.";
        } else if (err.code === "auth/wrong-password") {
          modalMessage.value = "Incorrect password. Please try again.";
        } else {
          modalMessage.value = `Login failed: ${err.message}`;
        }

        showModal.value = true;
      }
    };

    const handleForgotPassword = async () => {
      if(!email.value){
        modalMessage.value = "Please enter your email address first.";
        showModal.value = true;
        return;
      }

      try {
        await sendPasswordResetEmail(auth, email.value);
        modalMessage.value = "Password reset email sent successfully. Please check your inbox.";
        showModal.value = true;
      } catch (err) {
        console.error("Error sending password reset email:", err);
        if (err.code === "auth/user-not-found") {
          modalMessage.value = "No account found with this email.";
        } else {
          modalMessage.value = `Error: ${err.message}`;
        }
        showModal.value = true;
      }
    }

    return {
      email,
      password,
      role,
      error,
      handleLogin,
      showModal,
      modalMessage,
      closeModal,
      showPassword,
      togglePasswordVisibility,
      handleForgotPassword
    };
  },
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #00bfa5;
}

input {
  display: block;
  background: #00bfa5;
  margin-bottom: 10px;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  font-size: large;
  border-radius: 5px;
  border: 1px solid white;
  padding: 10px;
  width: 100%;
}

.password-input-container {
  position: relative;
  width: 100%;
}

.toggle-password {
  position: absolute;
  top: 50%;
  right: 15px;
  transform: translateY(-50%);
  cursor: pointer;
  color: white;
}

a {
  text-decoration: none;
  color: gray;
}

button {
  width: 100%;
  background: rgb(252, 139, 97);
  padding: 10px;
  border: none;
  border-radius: 5px;
  color: white;
  font-size: 16px;
  cursor: pointer;
}

button:hover {
  background-color: rgb(240, 120, 80);
}

label {
  font-weight: bold;
}

select {
  display: block;
  background: #00bfa5;
  color: white;
  border: 1px solid white;
  padding: 10px;
  border-radius: 5px;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  width: 100%;
  margin-bottom: 10px;
  appearance: none; /* Removes default dropdown arrow */
  -webkit-appearance: none;
  -moz-appearance: none;
  text-align: center;
  font-size: large;
}

select:focus {
  outline: none;
  border-color: #fff;
}

option {
  color: #333;
  background-color: #fff;
  text-align: center;
}

/* Basic styling for modal */
.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
