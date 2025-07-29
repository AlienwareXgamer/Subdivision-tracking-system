<template>
  <!-- Sidebar Toggle Button for Mobile -->
  <button ref="toggleButton" class="sidebar-toggle" @click="toggleSidebar">
    ☰
  </button>

  <div
    :class="['sidebar', { active: isSidebarVisible }]"
    ref="sidebar"
    @click.stop
  >
    <!-- Welcome message -->
    <div class="welcome">
      <h2>Welcome!</h2>
    </div>

    <!-- Navigation buttons -->
    <nav class="nav">
      <ul>
        <li>
          <router-link
            to="/user-dashboard"
            @click="reloadIfActive('/user-dashboard')"
            >Dashboard</router-link
          >
        </li>
        <li>
          <router-link to="/generate-qr" @click="reloadIfActive('/generate-qr')"
            >QR Code Generate</router-link
          >
        </li>
        <li>
          <router-link to="/my-logs" @click="reloadIfActive('/my-logs')"
            >My Logs</router-link
          >
        </li>
        <li>
          <router-link
            to="/my-guest-logs"
            @click="reloadIfActive('/my-guest-logs')"
            >Guest Logs</router-link
          >
        </li>
        <!-- <li>
          <router-link to="/user-notification">Notifications</router-link>
        </li> -->
        <li>
          <router-link
            to="/resident-faq"
            @click="reloadIfActive('/resident-faq')"
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

    <!-- Add new resident button -->
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
  // props: ['showSidebar'],
  setup() {
    const isSidebarVisible = ref(false);
    const sidebar = ref(null);
    const toggleButton = ref(null);
    const router = useRouter();

    const toggleSidebar = () => {
      isSidebarVisible.value = !isSidebarVisible.value;
      console.log("Toggled sidebar:", isSidebarVisible.value);

      // Add or remove the outside click event listener
      if (isSidebarVisible.value) {
        document.addEventListener("click", handleOutsideClick);
        console.log("Added outside click listener");
      } else {
        document.removeEventListener("click", handleOutsideClick);
        console.log("Removed outside click listener");
      }
    };

    // Handle clicks outside of the sidebar
    const handleOutsideClick = (event) => {
      console.log("Outside click detected");
      if (
        sidebar.value &&
        toggleButton.value &&
        !sidebar.value.contains(event.target) &&
        !toggleButton.value.contains(event.target)
      ) {
        console.log("Clicked outside the sidebar");
        isSidebarVisible.value = false;
        document.removeEventListener("click", handleOutsideClick);
        console.log("Sidebar closed");
      }
    };

    const handleSignOut = async () => {
      try {
        await signOut(auth);
        router.push({ name: "home" });
        console.log("Successful resident logout");
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
      console.log("Cleaned up event listeners on unmount");
    });

    onMounted(() => {
      console.log("UserSideNav mounted");
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
.sidebar {
  width: 300px;
  height: 100vh;
  background-color: #2c3e50;
  color: white;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  padding: 20px;
  border-radius: 0 20px 20px 0;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease-in-out;
}

.sidebar.active {
  transform: translateX(0);
}

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
  margin-bottom: 30px;
  text-align: center;
  font-size: 30px;
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

.nav li:hover {
  background-color: #007f66;
  padding-bottom: 10px;
  border-radius: 17px;
}

.nav li a.router-link-exact-active {
  background-color: skyblue;
  color: white;
  width: 100%;
  display: block;
  transform: translateY(-3px);
  box-sizing: border-box;
  border-radius: 20px;
}

.nav li a.router-link-exact-active {
  padding: 12px;
}

/* Log Out Button */
.log-out {
  margin-top: auto;
  text-align: center;
}

.log-out button {
  width: 100%;
  padding: 12px;
  font-size: 1rem;
  font-weight: bold;
  background: linear-gradient(to right, #e74c3c, #c0392b);
  color: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.log-out button:hover {
  background: linear-gradient(to right, #c0392b, #e74c3c);
  box-shadow: 0 4px 10px rgba(231, 76, 60, 0.5);
}

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
  .log-out {
    margin-bottom: 50px;
  }
}
</style>
