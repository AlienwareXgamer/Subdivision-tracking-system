<template>
  <div>
    <UserSideNav />
    <!-- Main content area -->
    <div class="main-content">
      <div class="content-container">
        <h2>My RFID Logs</h2>

        <!-- Controls for search, date filter, and sorting -->
        <div class="controls">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by mode (entry/exit)..."
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
              <option value="mode">Mode</option>
            </select>
          </label>
        </div>

        <!-- Logs table -->
        <div class="table-container">
          <table class="logs-table">
            <thead>
              <tr>
                <th>Mode</th>
                <th @click="sortLogs('timestamp')">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="log in filteredLogs"
                :key="log.id"
                :class="getRowClass(log.mode)"
              >
                <td>{{ log.mode }}</td>
                <td>{{ log.timestamp }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { ref, onMounted, computed } from "vue";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import UserSideNav from "@/components/user/UserSideNav.vue";

export default {
  components: { UserSideNav },
  setup() {
    const auth = getAuth();
    const currentUser = ref(null);
    const rfidLogs = ref([]);
    const searchQuery = ref("");
    const sortOption = ref("latest");
    const selectedDate = ref("");
    const userRfidTag = ref("");

    const fetchUserRfidTag = async () => {
      if (currentUser.value) {
        console.log(
          "Fetching RFID tag for user with UID:",
          currentUser.value.uid
        );
        try {
          // Directly access the user document using the UID
          const userDocRef = doc(db, "users", currentUser.value.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("User document data:", userData);

            // Retrieve and log the rfidTag
            userRfidTag.value = userData?.rfidTag || "";
            console.log("Retrieved RFID tag:", userRfidTag.value);

            if (!userRfidTag.value) {
              console.warn("RFID tag not found for the current user.");
            }
          } else {
            console.error("User document does not exist.");
          }
        } catch (error) {
          console.error("Error fetching user RFID tag:", error);
        }
      } else {
        console.warn("Current user is null; skipping RFID fetch.");
      }
    };

    // Fetch RFID logs for the current user's RFID tag
    const fetchRfidLogs = async () => {
      if (!userRfidTag.value) {
        console.warn("User RFID tag not found.");
        return;
      }

      const logs = [];
      try {
        const rfidLogsSnapshot = await getDocs(
          query(
            collection(db, "all_rfid_logs"),
            where("rfidTag", "==", userRfidTag.value)
          )
        );
        rfidLogsSnapshot.forEach((logDoc) => {
          const logData = logDoc.data();
          logs.push({
            id: logDoc.id,
            mode: logData.mode || "Unknown",
            timestamp: logData.timestamp
              ? logData.timestamp.toDate().toLocaleString()
              : "Unknown",
            rawTimestamp: logData.timestamp,
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

      let result = rfidLogs.value.filter((log) => {
        const mode = (log.mode || "").toLowerCase();
        const matchesSearch = mode.includes(search);
        const logDate = log.rawTimestamp
          ? log.rawTimestamp.toDate().toDateString()
          : null;
        const matchesDate = !selectedDateValue || logDate === selectedDateValue;

        return matchesSearch && matchesDate;
      });

      // Sorting options
      if (sortOption.value === "latest") {
        result = result.sort(
          (a, b) => b.rawTimestamp.seconds - a.rawTimestamp.seconds
        );
      } else if (sortOption.value === "timestamp") {
        result = result.sort(
          (a, b) => a.rawTimestamp.seconds - b.rawTimestamp.seconds
        );
      } else if (sortOption.value === "mode") {
        result = result.sort((a, b) => a.mode.localeCompare(b.mode));
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

    onMounted(() => {
      onAuthStateChanged(auth, async (user) => {
        currentUser.value = user;
        if (user) {
          console.log("User authenticated with UID:", user.uid);
          await fetchUserRfidTag();
          await fetchRfidLogs();
        } else {
          console.error("User not authenticated.");
        }
      });
    });

    return {
      searchQuery,
      sortOption,
      selectedDate,
      filteredLogs,
      getRowClass,
    };
  },
};
</script>

<style scoped>
.main-content {
  margin-left: 250px; /* Make room for the fixed sidebar */
  padding: 20px;
  background-color: #00bfa5;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  transition: margin-left 0.3s ease-in-out;
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
  justify-content: space-between;
  margin-top: 10px;
  margin-bottom: 20px;
  display: flex;
  gap: 15px;
  overflow-y: auto;
}

h2 {
  text-align: left;
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

.table-container {
  max-height: 80vh;
  border-radius: 10px;
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid #ddd;
  background-color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  height: calc(100vh - 100px);
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

.log-entry {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.log-exit {
  background-color: #ffebee;
  color: #c62828;
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
    padding: 10px;
    margin-left: 0px;
  }

  .content-container {
    margin-left: 0px;
  }

  .table-container {
    max-height: 61vh;
  }

  .controls {
    flex-direction: column;
    gap: 5px;
  }

  .search-input,
  .date-input {
    width: 100%;
  }
}
</style>
