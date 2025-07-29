<template>
  <div>
    <UserSideNav />

    <div class="main-content">
      <div class="content-container">
        <h2>Non-resident Logs</h2>

        <div class="controls">
          <!-- Insert search query filtering options-->

          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by guest name..."
            class="search-input"
          />

          <input type="date" v-model="selectedDate" class="date-input" />

          <select v-model="selectedCategory" class="category-select">
            <option value="">All Categories</option>
            <option value="guest">Guest</option>
            <option value="worker">Worker</option>
            <option value="renter">Renter</option>
          </select>

          <select v-model="selectedStatus" class="status-select">
            <option value="all">All Statuses</option>
            <option value="entry">Entry</option>
            <option value="exit">Exit</option>
            <option value="expired">Expired</option>
            <option value="not_started">Not Started</option>
          </select>

          <select v-model="sortOption" class="sort-select">
            <option value="latest">Sort by Latest</option>
            <option value="first">Sort by First Created</option>
          </select>
        </div>

        <div v-if="filteredLogs && filteredLogs.length === 0">
          <p>No scans found for your account</p>
        </div>

        <div v-else class="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Scanned At</th>
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
                <td>{{ log.category || "N/A" }}</td>
                <td>
                  {{
                    log.rawTimestamp?.seconds
                      ? new Date(
                          log.rawTimestamp.seconds * 1000
                        ).toLocaleString()
                      : "Unknown"
                  }}
                </td>
                <td>
                  <span :class="getRowClass(log.status)">
                    {{
                      log.status === "entry"
                        ? "Entry"
                        : log.status === "exit"
                        ? "Exit"
                        : log.status === "expired"
                        ? "Expired"
                        : "Not Started"
                    }}
                  </span>
                </td>
                <td>
                  <span v-if="log.additionalDetails">{{
                    log.additionalDetails
                  }}</span>
                  <span v-else>N/A</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import UserSideNav from "@/components/user/UserSideNav.vue";
import { db, auth } from "@/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { ref, onMounted, computed, onUnmounted } from "vue";

export default {
  components: {
    UserSideNav,
  },
  setup() {
    const qrLogs = ref([]);
    const searchQuery = ref("");
    const sortOption = ref("latest");
    const selectedDate = ref("");
    const selectedCategory = ref("");
    const selectedStatus = ref("all");
    const currentUserEmail = ref(auth.currentUser?.email || "");
    let unsubscribe = null;

    // Fetch logs created by the current user only
    // const fetchQrLogs = async () => {
    //   console.log("Starting fetchQrLogs...");

    //   if (!auth.currentUser) {
    //     console.error("No user logged in");
    //     return;
    //   }

    //   currentUserEmail.value = auth.currentUser.email;
    //   const logs = [];
    //   try {
    //     const qrLogsQuery = query(
    //       collection(db, "qr_scan_logs"),
    //       where("qrCodeCreator", "==", currentUserEmail.value),
    //       orderBy("scanTime", "desc")
    //     );

    //     const querySnapshot = await getDocs(qrLogsQuery);
    //     console.log("Fetched logs count:", querySnapshot.size);

    //     querySnapshot.forEach((logDoc) => {
    //       const logData = logDoc.data();
    //       console.log("Log data:", logData);

    //       const rawTimestamp = logData.scanTime || null;
    //       console.log("Assigned rawTimestamp:", rawTimestamp);

    //       logs.push({
    //         id: logDoc.id,
    //         guestName: logData.guestName,
    //         category: logData.category || "N/A",
    //         rawTimestamp,
    //         message: logData.message || "N/A",
    //         additionalDetails: logData.additionalDetails || "N/A",
    //         status: logData.status || "Unknown",
    //       });
    //     });

    //     qrLogs.value = logs;
    //     console.log("qrLogs value after fetching:", qrLogs.value);
    //   } catch (error) {
    //     console.error("Error fetching QR logs:", error);
    //   }
    // };

    // Real-time Listener for QR Logs
    const setupRealtimeListener = () => {
      if (!auth.currentUser) {
        console.error("No user logged in");
        return;
      }

      currentUserEmail.value = auth.currentUser.email;
      const qrLogsQuery = query(
        collection(db, "qr_scan_logs"),
        where("qrCodeCreator", "==", currentUserEmail.value),
        orderBy("scanTime", "desc")
      );

      unsubscribe = onSnapshot(qrLogsQuery, (snapshot) => {
        const logs = [];
        snapshot.forEach((logDoc) => {
          const logData = logDoc.data();
          const rawTimestamp = logData.scanTime || null;

          logs.push({
            id: logDoc.id,
            guestName: logData.guestName,
            category: logData.category || "N/A",
            rawTimestamp,
            message: logData.message || "N/A",
            additionalDetails: logData.additionalDetails || "N/A",
            status: logData.status || "Unknown",
          });
        });

        qrLogs.value = logs;
        console.log("Real-time QR logs updated:", logs);
      });
    };

    // Cleanup the listener when the component is unmounted
    onUnmounted(() => {
      if (unsubscribe) {
        unsubscribe();
      }
    });

    // Computed property for filtered logs
    const filteredLogs = computed(() => {
      if (!qrLogs.value || !qrLogs.value.length) return [];

      const search = searchQuery.value.toLowerCase();
      const selectedDateValue = selectedDate.value
        ? new Date(selectedDate.value).toDateString()
        : null;
      const categoryFilter = selectedCategory.value.toLowerCase();
      const statusFilter = selectedStatus.value.toLowerCase();

      let filtered = qrLogs.value.filter((log) => {
        const matchesSearch = (log.guestName || "")
          .toLowerCase()
          .includes(search);
        const logDate = log.rawTimestamp
          ? new Date(log.rawTimestamp.seconds * 1000).toDateString()
          : null;
        const matchesDate = !selectedDateValue || logDate === selectedDateValue;
        const matchesCategory =
          !categoryFilter || log.category.toLowerCase() === categoryFilter;
        const matchesStatus =
          statusFilter === "all" ||
          log.status.toLowerCase().includes(statusFilter);

        return matchesSearch && matchesDate && matchesCategory && matchesStatus;
      });

      // Sort the filtered logs based on the sort option
      if (sortOption.value === "latest") {
        // Sort by latest (descending order)
        filtered = filtered.sort(
          (a, b) => b.rawTimestamp?.seconds - a.rawTimestamp?.seconds
        );
      } else if (sortOption.value === "first") {
        // Sort by first created (ascending order)
        filtered = filtered.sort(
          (a, b) => a.rawTimestamp?.seconds - b.rawTimestamp?.seconds
        );
      }

      console.log("Filtered logs count:", filtered.length);
      return filtered;
    });

    // Get row class based on status
    const getRowClass = (status) => {
      if (status.toLowerCase().includes("entry")) return "log-entry";
      if (status.toLowerCase().includes("exit")) return "log-exit";
      if (status.toLowerCase().includes("expired")) return "log-invalid";
      if (status.toLowerCase().includes("not_started"))
        return "log-not-started";
      return "log-other";
    };

    // onMounted(() => {
    //   console.log("Component mounted, fetching logs...");
    //   fetchQrLogs();
    // });

    onMounted(() => {
      setupRealtimeListener();
    });

    return {
      searchQuery,
      sortOption,
      selectedDate,
      selectedCategory,
      selectedStatus,
      filteredLogs,
      getRowClass,
    };
  },
};
</script>

<style scoped>
.access-granted {
  color: green;
  font-weight: bold;
}

.access-failed {
  color: red;
  font-weight: bold;
}

.exit-recorded {
  color: blue; /* Example color */
  font-weight: bold;
}

.main-content {
  margin-left: 250px;
  padding: 20px;
  background-color: #00bfa5;
  height: 100vh;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

.content-container {
  background-color: #fff;
  width: -webkit-fill-available;
  padding: 20px;
  margin-left: 50px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  height: calc(100vh - 50px);
  overflow: hidden;
}

.controls {
  margin-bottom: 20px;
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  gap: 15px;
  overflow-y: auto;
}

.search-input,
.date-input,
.sort-select,
.status-select,
.category-select {
  padding: 12px;
  border: 2px solid #00bfa5;
  border-radius: 10px;
  outline: none;
  transition: all 0.3s ease;
}

.search-input {
  width: 300px;
}

.search-input:focus,
.date-input:focus,
.sort-select:focus,
.status-select:focus,
.category-select:focus {
  border-color: #007f66;
  box-shadow: 0 0 10px rgba(0, 191, 165, 0.5);
}

.sort-label {
  font-weight: bold;
  color: #00bfa5;
}

h2 {
  text-align: left;
}

.table-container {
  max-height: 79vh;
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid #ddd;
  border-radius: 10px;
  background-color: #fff;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  height: calc(100vh - 100px);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border: 1px solid #ccc;
  padding: 10px;
  text-align: left;
  text-transform: capitalize;
}

th {
  background-color: #e0e0e0;
  color: #00bfa5;
}

tr:nth-child(even) {
  background-color: #f1f1f1;
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

@media (max-width: 768px) {
  .sidebar {
    width: 200px;
  }
  .main-content {
    margin-left: 0px;
  }

  .content-container {
    margin-left: 0px;
  }

  .table-container {
    max-height: 75vh;
  }
}
</style>
