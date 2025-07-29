<template>
  <div>
    <!-- Fixed Sidebar on the left -->
    <SecuritySidebar />

    <!-- Main content on the right -->
    <div class="main-content">
      <div class="controls">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by name..."
          class="search-input"
        />

        <div class="filter-options">
          <label>
            <input type="radio" value="all" v-model="selectedFilter" />
            All
          </label>
          <label>
            <input type="radio" value="entry" v-model="selectedFilter" />
            Entries
          </label>
          <label>
            <input type="radio" value="exit" v-model="selectedFilter" />
            Exits
          </label>
        </div>
      </div>

      <div class="table-container">
        <table class="logs-table">
          <thead>
            <tr>
              <th>Resident Name</th>
              <th>Timestamp</th>
              <th>Mode</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="log in filteredLogs"
              :key="log.id"
              :class="{
                entry: log.mode.includes('entry') || log.mode.includes('Entry'),
                exit: log.mode.includes('exit') || log.mode.includes('Exit'),
              }"
            >
              <td>{{ log.residentName }}</td>
              <td>{{ log.timestamp }}</td>
              <td>{{ log.mode }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import SecuritySidebar from "@/components/securityComp/SecuritySidebar.vue";
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { ref, onMounted, computed } from "vue";

export default {
  components: {
    SecuritySidebar,
  },
  setup() {
    const todaysLogs = ref([]);
    const users = ref([]);
    const searchQuery = ref("");
    const selectedFilter = ref("all");

    const fetchUserLogs = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch all users to cache their names by rfidTag
      const userSnapshot = await getDocs(collection(db, "users"));
      userSnapshot.forEach((userDoc) => {
        const data = userDoc.data();
        users.value[data.rfidTag] = `${data.firstName} ${data.lastName}`;
      });

      // Fetch today's logs from 'all_rfid_logs' collection
      const logsQuery = query(
        collection(db, "all_rfid_logs"),
        where("timestamp", ">=", Timestamp.fromDate(today))
      );
      const logsSnapshot = await getDocs(logsQuery);

      // Process logs
      const logs = [];
      logsSnapshot.forEach((logDoc) => {
        const logData = logDoc.data();
        const rfidTag = logData.rfidTag;

        // Check if we have a matching user in the cache
        if (users.value[rfidTag]) {
          logs.push({
            id: logDoc.id,
            residentName: users.value[rfidTag],
            timestamp: logData.timestamp.toDate().toLocaleString(),
            mode: logData.mode,
          });
        }
      });

      todaysLogs.value = logs;
    };

    const filteredLogs = computed(() => {
      const filter = selectedFilter.value;
      const search = searchQuery.value.toLowerCase();

      return todaysLogs.value.filter((log) => {
        const matchesSearch = log.residentName.toLowerCase().includes(search);

        const matchesFilter =
          filter === "all" ||
          (filter === "entry" &&
            (log.mode === "entry1" || log.mode === "entry2")) ||
          (filter === "exit" && (log.mode === "exit1" || log.mode === "exit2"));

        return matchesSearch && matchesFilter;
      });
    });

    onMounted(fetchUserLogs);

    return {
      todaysLogs,
      searchQuery,
      selectedFilter,
      filteredLogs,
    };
  },
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
  height: 100vh;
}

.controls {
  margin-bottom: 15px;
}

.search-input {
  padding: 8px;
  width: 200px;
  margin-right: 15px;
}

.filter-options label {
  margin-right: 10px;
}

/* Style the table */
.logs-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  background-color: white; /* Set the table's background to white */
}

.logs-table th,
.logs-table td {
  padding: 10px;
  text-align: left;
  border: 1px solid #ddd;
}

.logs-table th {
  background-color: #f4f4f4;
  font-weight: bold;
}

.logs-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

/* Conditional styling based on mode */
.logs-table tr.entry {
  background-color: #e8f5e9; /* Light green for entries */
  color: #2e7d32; /* Dark green text color for entries */
}

.logs-table tr.exit {
  background-color: #ffffff; /* Light red for exits */
  color: #eb7d51; /* Dark red text color for exits */
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
