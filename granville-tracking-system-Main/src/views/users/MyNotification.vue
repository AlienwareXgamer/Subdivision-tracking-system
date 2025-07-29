<template>
    <div>
      <!-- Fixed Sidebar on the left -->
      <UserSideNav/>
  
      <!-- Main content on the right -->
      <div class="main-content">
        <h1>WHERE RESIDENTS VIEW NOTIFICATIONS</h1>
        <!-- Add more content here -->
      </div>
    </div>
  </template>
  
  <script>
import UserSideNav from '@/components/user/UserSideNav.vue';

  // Importing SidebarNav component
  
  export default {
    components: { 
      UserSideNav
    }
  };
  </script>
  
  <style>
  /* General reset to avoid padding/margin issues */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  /* Style for the container */
  body {
    font-family: Arial, sans-serif;
  }
  
  /* Sidebar styles */
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 300px; /* Fixed width of the sidebar */
    height: 100vh; /* Full viewport height */
    background-color: #2c3e50;
    color: white;
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    z-index: 1000; /* Keeps the sidebar above the main content */
  }
  
  /* Main content area */
  .main-content {
    margin-left: 250px; /* Make room for the fixed sidebar */
    padding: 20px;
    background-color: #00bfa5;
    height:100vh;
  }
  
  h1 {
    font-size: 36px;
    color: #333;
  }
  
  /* Additional styling for responsiveness */
  @media (max-width: 768px) {
    .sidebar {
      width: 200px; /* Adjust sidebar width on smaller screens */
    }
  
    .main-content {
      margin-left: 200px; /* Adjust content margin accordingly */
    }
  }
  </style>
  