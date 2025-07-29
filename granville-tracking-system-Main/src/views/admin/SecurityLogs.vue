<template>
  <div>
    <SidebarNav />

    <div class="main-content">
      <div class="content-container">
        <h2>Resident Logs</h2>
        <div class="controls">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by resident name..."
            class="search-input"
          />

          <input
            type="date"
            v-model="selectedDate"
            class="date-input"
            placeholder="Select Date"
          />

          <label class="sort-label">
            Sort by:
            <select v-model="sortOption" class="sort-select">
              <option value="latest">Latest</option>
              <option value="timestamp">Date</option>
            </select>
          </label>

          <label class="sort-label">
            Filter by Mode:
            <select v-model="selectedMode" class="mode-select">
              <option value="all">All</option>
              <option value="entry">Entry</option>
              <option value="exit">Exit</option>
            </select>
          </label>
        </div>

        <div class="table-container">
          <table class="logs-table">
            <thead>
              <tr>
                <th @click="sortLogs('residentName')">Resident Name</th>
                <th @click="sortLogs('timestamp')">Timestamp</th>
                <th @click="sortLogs('mode')">Mode</th>
                <!-- <th>Status</th>
                <th>Details</th> -->
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="log in filteredLogs"
                :key="log.id"
                :class="getRowClass(log.mode)"
              >
                <td>{{ log.residentName || "N/A" }}</td>
                <td>{{ log.timestamp }}</td>
                <td>{{ log.mode }}</td>
                <!-- <td>{{ log.message || "N/A" }}</td>
                <td>{{ log.additionalDetails || "N/A" }}</td> -->
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import SidebarNav from "@/components/SidebarNav.vue";
import { db } from "@/firebase";
import { collection, getDocs } from "firebase/firestore";
import { ref, onMounted, computed } from "vue";

export default {
  components: {
    SidebarNav,
  },
  setup() {
    const rfidLogs = ref([]);
    const searchQuery = ref("");
    const sortOption = ref("latest");
    const selectedDate = ref("");
    const selectedMode = ref("all");

    const fetchRfidLogs = async () => {
      const logs = [];
      const users = {};

      try {
        // Fetch users to map RFID tags to resident names
        const userSnapshot = await getDocs(collection(db, "users"));
        userSnapshot.forEach((userDoc) => {
          const data = userDoc.data();
          if (data.rfidTag) {
            users[data.rfidTag] = `${data.firstName} ${data.lastName}`;
          }
        });

        // Fetch RFID logs from Firestore
        const rfidLogsSnapshot = await getDocs(collection(db, "all_rfid_logs"));
        rfidLogsSnapshot.forEach((logDoc) => {
          const logData = logDoc.data();
          const residentName = users[logData.rfidTag] || "Unknown Resident";
          logs.push({
            id: logDoc.id,
            residentName,
            timestamp: logData.timestamp
              ? logData.timestamp.toDate().toLocaleString()
              : "Unknown",
            rawTimestamp: logData.timestamp,
            mode: logData.mode || "RFID",
            message: logData.message || "N/A",
            additionalDetails: logData.additionalDetails || null,
          });
        });

        rfidLogs.value = logs;
      } catch (error) {
        console.error("Error fetching RFID logs:", error);
      }
    };

    const filteredLogs = computed(() => {
      const search = searchQuery.value.toLowerCase();
      const selectedDateValue = selectedDate.value
        ? new Date(selectedDate.value).toDateString()
        : null;
      const modeFilter = selectedMode.value.toLocaleLowerCase();

      // Filter logs based on search query and selected date
      let result = rfidLogs.value.filter((log) => {
        const name = (log.residentName || "").toLowerCase();
        const matchesSearch = name.includes(search);
        const logDate = log.rawTimestamp
          ? log.rawTimestamp.toDate().toDateString()
          : null;
        const matchesDate = !selectedDateValue || logDate === selectedDateValue;
        const matchesMode =
          modeFilter === "all" || log.mode.toLowerCase().includes(modeFilter);

        return matchesSearch && matchesDate && matchesMode;
      });

      // Sort logs based on selected option
      if (sortOption.value === "latest") {
        result = result.sort(
          (a, b) => b.rawTimestamp.seconds - a.rawTimestamp.seconds
        );
      } else if (sortOption.value === "timestamp") {
        result = result.sort(
          (a, b) => a.rawTimestamp.seconds - b.rawTimestamp.seconds
        );
      }

      return result;
    });

    const getRowClass = (mode) => {
      if (!mode) return "log-unknown";
      const lowerCaseMode = mode.toLowerCase();

      if (lowerCaseMode.includes("entry")) return "log-entry";
      if (lowerCaseMode.includes("exit")) return "log-exit";
      return "log-other";
    };

    onMounted(fetchRfidLogs);

    return {
      searchQuery,
      sortOption,
      selectedDate,
      selectedMode,
      filteredLogs,
      getRowClass,
    };
  },
};
</script>

<style scoped>
.main-content {
  margin-left: 250px;
  padding: 20px;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

.content-container {
  background-color: #fff;
  padding: 20px;
  margin-left: 50px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  height: calc(100vh - 50px);
  overflow: hidden;
}

h2 {
  text-align: left;
  color: #067264;
}

.controls {
  justify-content: space-between;
  margin-bottom: 20px;
  display: flex;
  gap: 15px;
  overflow-y: auto;
}

.search-input {
  width: 300px;
  margin-top: 5px;
}

.search-input,
.date-input,
.sort-select,
.mode-select {
  padding: 10px;
  border: 2px solid #00bfa5;
  border-radius: 8px;
  outline: none;
}

.search-input:focus,
.date-input:focus,
.sort-select:focus,
.mode-select:focus {
  border-color: #007f66;
  box-shadow: 0 0 5px rgba(0, 191, 165, 0.5);
}

.sort-label {
  color: #00bfa5;
}

/* Table Styling */
.table-container {
  max-height: 83vh;
  border-radius: 10px;
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid #ddd;
  background-color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  height: calc(83vh - 205px);
}

.logs-table {
  width: 100%;
  margin-top: 0px;
  border-radius: 10px;
  background-color: white;
}

.logs-table th,
.logs-table td {
  padding: 10px;
  text-align: left;
  border: 1px solid #ddd;
}

.logs-table th {
  background-color: #e0e0e0;
  font-weight: bold;
  color: #00bfa5;
  padding: 12px;
  text-align: left;
}

/* Row Colors Based on Mode */
.log-entry {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.log-exit {
  background-color: #e3f2fd;
  color: #1e88e5;
}

.log-other {
  background-color: #fffde7;
  color: #fbc02d;
}

.log-unknown {
  background-color: #ffebee;
  color: #c62828;
}

/* Mobile View Styles */
@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
    width: 100%;
  }
  .table-container {
    max-height: 85vh;
    overflow-y: auto; /* Enable vertical scrolling */
    overflow-x: auto;
  }

  .search-input,
  .date-input,
  .sort-select,
  .mode-select {
    width: 100%;
  }

  .sort-label {
    font-size: 1rem;
  }

  .controls {
    flex-direction: column;
    gap: 10px;
  }

  .content-container {
    margin-left: 0px;
    padding: 5px;
  }

  h2 {
    font-size: 1.2rem;
  }
}
</style>
