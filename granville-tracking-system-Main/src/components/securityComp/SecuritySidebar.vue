<template>
  <!-- Sidebar Toggle Button for Mobile -->
  <button ref="toggleButton" class="sidebar-toggle" @click="toggleSidebar">
    ☰
  </button>

  <div
    ref="sidebar"
    :class="['sidebar', { active: isSidebarVisible }]"
    @click.stop
  >
    <!-- Welcome message -->
    <div class="welcome">
      <h2>Welcome, Security!</h2>
    </div>

    <!-- Navigation buttons -->
    <nav class="nav">
      <ul>
        <li>
          <router-link
            to="/security-dashboard"
            @click="reloadIfActive('/security-dashboard')"
            >Dashboard</router-link
          >
        </li>
        <li>
          <router-link to="/generate-qr" @click="reloadIfActive('/generate-qr')"
            >QR Code Generate</router-link
          >
        </li>
        <li>
          <router-link to="/qr-scan" @click="reloadIfActive('/qr-scan')"
            >QR Code Scanner</router-link
          >
          <!-- New Button -->
        </li>
        <!-- <li>
          <router-link to="/user-logs">Logs</router-link>
        </li> -->
        <li>
          <router-link
            to="/security-faq"
            @click="reloadIfActive('/security-faq')"
            >FAQ</router-link
          >
        </li>
        <li>
          <router-link to="/contact-us" @click="reloadIfActive('/contact-us')"
            >Report</router-link
          >
        </li>
      </ul>
    </nav>

    <div class="log-out">
      <button @click="handleSignOut">Log Out</button>
    </div>
  </div>
</template>

<script>
import { auth } from "@/firebase";
import { signOut } from "firebase/auth";
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";

export default {
  setup() {
    const isSidebarVisible = ref(false);
    const sidebar = ref(null);
    const toggleButton = ref(null);
    const router = useRouter();

    const toggleSidebar = () => {
      isSidebarVisible.value = !isSidebarVisible.value;
      if (isSidebarVisible.value) {
        document.addEventListener("click", handleOutsideClick);
      } else {
        document.removeEventListener("click", handleOutsideClick);
      }
    };

    const handleOutsideClick = (event) => {
      // Use refs instead of this.$el
      if (
        sidebar.value &&
        toggleButton.value &&
        !sidebar.value.contains(event.target) &&
        !toggleButton.value.contains(event.target)
      ) {
        isSidebarVisible.value = false;
        document.removeEventListener("click", handleOutsideClick);
      }
    };

    const handleSignOut = async () => {
      try {
        await signOut(auth);
        router.push({ name: "home" });
        console.log("Successful security logout");
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

    onBeforeUnmount(() => {
      document.removeEventListener("click", handleOutsideClick);
    });

    return {
      isSidebarVisible,
      sidebar,
      toggleButton,
      toggleSidebar,
      handleSignOut,
      reloadIfActive,
    };
  },
};
</script>

<style scoped>
* {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

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

.sidebar.active {
  transform: translateX(0);
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

.welcome {
  margin-bottom: 30px;
  text-align: center;
  font-size: 30px;
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
}

.nav li a:hover {
  text-decoration: underline;
}

.nav a.router-link-exact-active {
  background-color: skyblue; /* Active background color */
  color: white; /* Active text color */
  width: 100%; /* Ensure the link fills the entire li */
  display: block; /* Block ensures the link takes full width */
  padding: 10px; /* Keep padding consistent */
  box-sizing: border-box; /* Include padding in width calculation */
  border-radius: 20px;
}

.log-out {
  margin-top: auto;
  text-align: center;
  padding: 0;
}

.log-out button {
  padding: 10px 20px;
  font-size: 16px;
  background-color: #e74c3c;
  color: white;
  border: none;
  cursor: pointer;
  border-radius: 5px;
}

.log-out button:hover {
  background-color: #c0392b;
}

/* Mobile View Styles */
@media (max-width: 768px) {
  .sidebar-toggle {
    display: block;
  }
  .sidebar {
    transform: translateX(-100%);
    width: 250px;
  }
  .sidebar.active {
    transform: translateX(0);
  }

  .log-out {
    margin-bottom: 50px;
  }
}
</style>
