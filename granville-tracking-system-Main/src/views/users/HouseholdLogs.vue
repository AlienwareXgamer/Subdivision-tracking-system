<template>
  <div>
    <UserSideNav />
    <!-- Main content area -->
    <div class="main-content">
      <div class="content-container">
        <button class="back-button" @click="goBack">← Back</button>
        <h2>Household RFID Logs</h2>

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
                <th>Resident</th>
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
                <td>{{ log.residentName }}</td>
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
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { ref, onMounted, computed } from "vue";
import { getAuth } from "firebase/auth";
import UserSideNav from "@/components/user/UserSideNav.vue";

export default {
  components: { UserSideNav },
  setup() {
    const auth = getAuth();
    const currentUser = ref(null);
    const logs = ref([]);
    const searchQuery = ref("");
    const sortOption = ref("latest");
    const selectedDate = ref("");
    const isHead = ref(false);

    const fetchLogsForHousehold = async () => {
      if (!currentUser.value) return;

      try {
        // Step 1: Fetch current user details
        const userDoc = await getDoc(doc(db, "users", currentUser.value.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Check if user is head of the household
          if (userData.isHead) {
            isHead.value = true;

            // Step 2: Retrieve all users in the household
            const householdUsersSnapshot = await getDocs(
              query(
                collection(db, "users"),
                where("householdId", "==", userData.householdId)
              )
            );

            const householdUsers = householdUsersSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            // Step 3: Collect RFID tags
            const rfidTags = householdUsers.map((user) => ({
              rfidTag: user.rfidTag,
              name: `${user.firstName} ${user.lastName}`,
            }));

            // Step 4: Fetch logs for RFID tags
            const logsPromises = rfidTags.map(async ({ rfidTag, name }) => {
              const logsSnapshot = await getDocs(
                query(
                  collection(db, "all_rfid_logs"),
                  where("rfidTag", "==", rfidTag)
                )
              );

              return logsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp
                  ? new Date(
                      doc.data().timestamp.seconds * 1000
                    ).toLocaleString()
                  : "Unknown",
                rawTimestamp: doc.data().timestamp,
                residentName: name,
              }));
            });

            const allLogs = await Promise.all(logsPromises);
            logs.value = allLogs.flat();
          } else {
            isHead.value = false;
          }
        }
      } catch (error) {
        console.error("Error fetching household logs:", error);
      }
    };

    const filteredLogs = computed(() => {
      const search = searchQuery.value.toLowerCase();
      const selectedDateValue = selectedDate.value
        ? new Date(selectedDate.value).toDateString()
        : null;

      let result = logs.value.filter((log) => {
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

    const goBack = () => {
      window.history.back();
    };

    onMounted(() => {
      auth.onAuthStateChanged(async (user) => {
        currentUser.value = user;
        if (user) {
          await fetchLogsForHousehold();
        }
      });
    });

    return {
      searchQuery,
      sortOption,
      selectedDate,
      filteredLogs,
      getRowClass,
      goBack,
      isHead,
    };
  },
};
</script>

<style scoped>
.main-content {
  margin-left: 250px;
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

.back-button {
  margin-bottom: 20px;
  padding: 10px 20px;
  background-color: #007f66;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.search-input,
.date-input,
.sort-select {
  padding: 12px;
  border: 2px solid #00bfa5;
  border-radius: 10px;
  outline: none;
}

.table-container {
  max-height: 73vh;
  border-radius: 10px;
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid #ddd;
  background-color: white;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
}

.logs-table th,
.logs-table td {
  padding: 12px;
  text-align: left;
  border: 1px solid #ddd;
}

.logs-table th {
  background-color: #e0e0e0;
  color: #00bfa5;
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
</style>
