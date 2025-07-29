<template>
    <div>
      <!-- Fixed Sidebar on the left -->
      <SidebarNav />
  
      <!-- Main content on the right -->
      <div class="main-content">
        <h1>THIS IS WHERE THE ADMIN CONFIGURES SYSTEM SETTINGS</h1>
        <!-- Add more content here -->
         <h2>What could be in the settings?</h2>
         <h2>change password</h2>
         <h2>possible nga change dp</h2>
      </div>
    </div>
  </template>
  
  <script>
  // Importing SidebarNav component
  import SidebarNav from '@/components/SidebarNav.vue';
  
  export default {
    components: { 
      SidebarNav
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
  