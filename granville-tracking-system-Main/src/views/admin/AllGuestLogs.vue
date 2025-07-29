<template>
  <div>
    <SidebarNav />

    <div class="main-content">
      <div class="content-container">
        <h2>Guest Logs</h2>
        <div class="controls">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by guest name..."
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
            Filter by Status:
            <select v-model="selectedStatus" class="status-select">
              <option value="all">All</option>
              <option value="entry">Entry</option>
              <option value="exit">Exit</option>
              <option value="expired">Expired</option>
              <option value="not_started">Not Started</option>
            </select>
          </label>
        </div>

        <div class="table-container">
          <table class="logs-table">
            <thead>
              <tr>
                <th @click="sortLogs('guestName')">Guest Name</th>
                <th @click="sortLogs('creatorName')">Created By</th>
                <th @click="sortLogs('timestamp')">Timestamp</th>
                <th @click="sortLogs('category')">Category</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="log in filteredLogs"
                :key="log.id"
                :class="getRowClass(log.status)"
              >
                <td>{{ log.guestName || "N/A" }}</td>
                <td>{{ log.creatorName || "Unknown" }}</td>
                <td>{{ log.timestamp }}</td>
                <td class="capitalize">{{ log.category || "QR Code" }}</td>
                <td>{{ log.message || "N/A" }}</td>
                <td>{{ log.additionalDetails || "N/A" }}</td>
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
import {
  collection,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { ref, onMounted, computed, onUnmounted } from "vue";

export default {
  components: {
    SidebarNav,
  },
  setup() {
    const qrLogs = ref([]);
    const searchQuery = ref("");
    const sortOption = ref("latest");
    const selectedDate = ref("");
    const selectedStatus = ref("all");
    let unsubscribe = null;

    // Function to extract creatorName from 'guest_qrcodes' collection
    const fetchCreatorName = async (documentId) => {
      try {
        if (!documentId) {
          console.warn("Invalid document ID:", documentId);
          return "Unknown";
        }

        const qrCodeDocRef = doc(db, "guest_qrcodes", documentId);
        const qrCodeDoc = await getDoc(qrCodeDocRef);

        if (qrCodeDoc.exists()) {
          const creatorName = qrCodeDoc.data().creatorName || "Unknown Creator";
          return creatorName;
        } else {
          console.warn("No document found for document ID:", documentId);
        }
      } catch (error) {
        console.error(
          "Error fetching creatorName for document ID:",
          documentId,
          error
        );
      }

      return "Unknown";
    };

    // const fetchQrLogs = async () => {
    //   const logs = [];

    //   try {
    //     const qrLogsSnapshot = await getDocs(collection(db, "qr_scan_logs"));

    //     for (const logDoc of qrLogsSnapshot.docs) {
    //       const logData = logDoc.data();

    //       // Extract document ID from scanData URL
    //       const documentId = logData.scanData
    //         ? logData.scanData.split("/").pop()
    //         : "";

    //       // Fetch creatorName using the extracted document ID
    //       const creatorName = await fetchCreatorName(documentId);

    //       // Construct the log entry
    //       const logEntry = {
    //         id: logDoc.id,
    //         guestName: logData.guestName,
    //         creatorName,
    //         category: logData.category || "QR Code",
    //         timestamp: logData.scanTime
    //           ? logData.scanTime.toDate().toLocaleString()
    //           : "Unknown",
    //         rawTimestamp: logData.scanTime,
    //         message: logData.message || "N/A",
    //         additionalDetails: logData.additionalDetails || null,
    //         status: logData.status,
    //       };

    //       logs.push(logEntry);
    //     }

    //     qrLogs.value = logs;
    //     console.log("All QR logs processed and stored.");
    //   } catch (error) {
    //     console.error("Error fetching QR logs:", error);
    //   }
    // };

    // Real-time Listener for QR Logs
    const setupRealtimeListener = () => {
      const qrLogsCollection = collection(db, "qr_scan_logs");

      unsubscribe = onSnapshot(qrLogsCollection, async (snapshot) => {
        const logs = [];
        for (const logDoc of snapshot.docs) {
          const logData = logDoc.data();

          // Extract document ID from scanData URL
          const documentId = logData.scanData
            ? logData.scanData.split("/").pop()
            : "";

          // Fetch creatorName using the extracted document ID
          const creatorName = await fetchCreatorName(documentId);

          // Construct the log entry
          logs.push({
            id: logDoc.id,
            guestName: logData.guestName,
            creatorName,
            category: logData.category || "QR Code",
            timestamp: logData.scanTime
              ? logData.scanTime.toDate().toLocaleString()
              : "Unknown",
            rawTimestamp: logData.scanTime,
            message: logData.message || "N/A",
            additionalDetails: logData.additionalDetails || null,
            status: logData.status,
          });
        }

        qrLogs.value = logs;
        console.log("QR logs updated in real-time:", logs);
      });
    };

    // Cleanup the listener when the component unmounts
    onUnmounted(() => {
      if (unsubscribe) {
        unsubscribe();
      }
    });

    const filteredLogs = computed(() => {
      const search = searchQuery.value.toLowerCase();
      const selectedDateValue = selectedDate.value
        ? new Date(selectedDate.value).toDateString()
        : null;
      const statusFilter = selectedStatus.value.toLowerCase();

      // Filter logs based on search query and selected date
      let result = qrLogs.value.filter((log) => {
        const name = (log.guestName || "").toLowerCase();
        const matchesSearch = name.includes(search);
        const logDate = log.rawTimestamp
          ? log.rawTimestamp.toDate().toDateString()
          : null;
        const matchesDate = !selectedDateValue || logDate === selectedDateValue;
        const matchesStatus =
          statusFilter === "all" ||
          log.status.toLowerCase().includes(statusFilter);

        return matchesSearch && matchesDate && matchesStatus;
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

    const getRowClass = (status) => {
      if (status.toLowerCase().includes("entry")) return "log-entry";
      if (status.toLowerCase().includes("exit")) return "log-exit";
      if (status.toLowerCase().includes("expired")) return "log-invalid";
      if (status.toLowerCase().includes("not_started"))
        return "log-not-started";
      return "";
    };

    // onMounted(fetchQrLogs);
    onMounted(() => {
      setupRealtimeListener();
    });

    return {
      searchQuery,
      sortOption,
      selectedDate,
      selectedStatus,
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
  background-color: #00bfa5;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  height: 100vh;
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

.capitalize {
  text-transform: capitalize;
}

.controls {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  gap: 15px;
  overflow-y: auto;
}

.search-input,
.date-input,
.sort-select,
.status-select {
  padding: 12px;
  border: 2px solid #00bfa5;
  border-radius: 10px;
  outline: none;
  transition: all 0.3s ease;
}

.search-input {
  width: 300px;
  margin-top: 5px;
}

.search-input:focus,
.date-input:focus,
.sort-select:focus,
.status-select:focus {
  border-color: #007f66;
  box-shadow: 0 0 10px rgba(0, 191, 165, 0.5);
}

.sort-label {
  font-weight: bold;
  color: #00bfa5;
}

/* Table styling */
.table-container {
  max-height: 83vh;
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid #ddd;
  border-radius: 10px;
  background-color: #fff;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  height: calc(83vh - 205px);
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0px;
}

.logs-table th,
.logs-table td {
  padding: 12px;
  text-align: left;
  border: 1px solid #ddd;
  cursor: pointer;
  font-size: 1rem;
}

.logs-table th {
  background-color: #e0e0e0;
  color: #00bfa5;
  font-weight: bold;
}

.logs-table tr:nth-child(even) {
  background-color: #f1f1f1;
}

/* Log Entry - Green */
.log-entry {
  background-color: #e8f5e9;
  color: #2e7d32;
  font-weight: bold;
}

/* Log Exit - Blue */
.log-exit {
  background-color: #e3f2fd;
  color: #1e88e5;
}

/* Log Invalid - Red */
.log-invalid {
  background-color: #ffebee;
  color: #c62828;
}

.log-not-started {
  background-color: #fff3e0;
  color: #ef6c00;
}

/* Mobile View Styles */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
  }

  .sidebar.active {
    transform: translateX(0);
  }
  .content-container {
    margin-left: 0px;
    padding: 5px;
  }
  .controls {
    flex-direction: column;
    gap: 5px;
  }
  .search-input,
  .date-input,
  .sort-select,
  .status-select {
    width: 100%;
  }
  .main-content {
    margin-left: 0;
    width: 100%;
  }
  .table-container {
    max-height: 85vh;
    overflow-y: auto; /* Enable vertical scrolling */
    overflow-x: auto;
  }

  h2 {
    font-size: 1.2rem;
  }
  .sidebar-toggle {
    display: block;
  }
}

@media (max-height: 600px) {
  .table-container {
    max-height: 65vh; /* Further reduce height on smaller screens */
  }
}

@media (max-height: 400px) {
  .table-container {
    max-height: 55vh; /* Minimum height for very small screens */
  }
}
</style>
