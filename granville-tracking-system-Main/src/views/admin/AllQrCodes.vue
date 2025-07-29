<template>
  <div>
    <SidebarNav />

    <div class="main-content">
      <div class="content-container">
        <h2>All QR Codes</h2>
        <div class="controls">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by guest name or creator name..."
            class="search-input"
          />
          <label class="sort-label">
            Sort by:
            <select v-model="sortOption" class="sort-select">
              <option value="latest">Latest</option>
              <option value="oldest">Oldest</option>
              <option value="startDate">Start Date</option>
              <option value="expirationTime">Expiration Time</option>
            </select>
          </label>
        </div>

        <div class="table-container">
          <table class="qrcodes-table">
            <thead>
              <tr>
                <th @click="sortQrCodes('guestName')">Guest Name</th>
                <th @click="sortQrCodes('creatorName')">Creator Name</th>
                <th @click="sortQrCodes('createdAt')">Created At</th>
                <th @click="sortQrCodes('startDate')">Start Date</th>
                <th @click="sortQrCodes('expirationTime')">Expiration Time</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="qrCode in filteredQrCodes" :key="qrCode.id">
                <td>{{ qrCode.guestName || "N/A" }}</td>
                <td>{{ qrCode.creatorName || "Unknown Creator" }}</td>
                <td>
                  {{
                    qrCode.createdAt
                      ? qrCode.createdAt.toLocaleString()
                      : "Unknown"
                  }}
                </td>
                <td>
                  {{
                    qrCode.startDate
                      ? qrCode.startDate.toLocaleString()
                      : "Unknown"
                  }}
                </td>
                <td>
                  {{
                    qrCode.expirationTime
                      ? qrCode.expirationTime.toLocaleString()
                      : "Unknown"
                  }}
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
import SidebarNav from "@/components/SidebarNav.vue";
import { db } from "@/firebase";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { ref, onMounted, computed, onUnmounted } from "vue";

export default {
  components: {
    SidebarNav,
  },
  setup() {
    const qrCodes = ref([]);
    const searchQuery = ref("");
    const sortOption = ref("latest");
    let unsubscribe = null;

    // Fetch QR codes from Firestore
    // const fetchQrCodes = async () => {
    //   const codes = [];

    //   try {
    //     const qrCodesSnapshot = await getDocs(collection(db, "guest_qrcodes"));
    //     qrCodesSnapshot.forEach((doc) => {
    //       const data = doc.data();
    //       codes.push({
    //         id: doc.id,
    //         guestName: data.guestName || "N/A",
    //         creatorName: data.creatorName || "Unknown Creator",
    //         createdAt: data.createdAt ? data.createdAt.toDate() : "Unknown",
    //         startDate: data.startDate
    //           ? data.startDate.toDate()
    //           : data.createdAt.toDate()
    //           ? data.createdAt.toDate()
    //           : "Unknown",
    //         expirationTime: data.expirationTime
    //           ? data.expirationTime.toDate()
    //           : "Unknown",
    //       });
    //     });

    //     qrCodes.value = codes;
    //   } catch (error) {
    //     console.error("Error fetching QR codes:", error);
    //   }
    // };

    // Set up a real-time listener for QR codes
    const setupRealtimeListener = () => {
      const qrCodesCollection = collection(db, "guest_qrcodes");

      unsubscribe = onSnapshot(qrCodesCollection, (snapshot) => {
        const codes = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          codes.push({
            id: doc.id,
            guestName: data.guestName || "N/A",
            creatorName: data.creatorName || "Unknown Creator",
            createdAt: data.createdAt ? data.createdAt.toDate() : null,
            startDate: data.startDate
              ? data.startDate.toDate()
              : data.createdAt
              ? data.createdAt.toDate()
              : null,
            expirationTime: data.expirationTime
              ? data.expirationTime.toDate()
              : null,
          });
        });
        qrCodes.value = codes;
        console.log("QR Codes updated:", codes);
      });
    };

    // Cleanup the listener when the component unmounts
    onUnmounted(() => {
      if (unsubscribe) {
        unsubscribe();
      }
    });

    // Filtered and Sorted QR Codes
    const filteredQrCodes = computed(() => {
      const search = searchQuery.value.toLowerCase();

      // Filter by search query
      let result = qrCodes.value.filter((code) => {
        return (
          code.guestName.toLowerCase().includes(search) ||
          code.creatorName.toLowerCase().includes(search)
        );
      });

      // Sort by selected option
      if (sortOption.value === "latest") {
        result.sort((a, b) => b.createdAt - a.createdAt);
      } else if (sortOption.value === "startDate") {
        result.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      } else if (sortOption.value === "expirationTime") {
        result.sort(
          (a, b) => new Date(a.expirationTime) - new Date(b.expirationTime)
        );
      } else if (sortOption.value === "oldest") {
        result.sort((a, b) => a.createdAt - b.createdAt);
      }

      return result;
    });

    // onMounted(fetchQrCodes);
    onMounted(() => {
      setupRealtimeListener();
    });

    return {
      qrCodes,
      searchQuery,
      sortOption,
      filteredQrCodes,
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
  margin-left: 50px;
  padding: 20px;
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
  display: flex;
  justify-content: space-between;
  gap: 15px;
  align-items: center;
  margin-bottom: 20px;
}

.search-input {
  width: 300px;
  padding: 10px;
  border: 2px solid #00bfa5;
  border-radius: 8px;
  outline: none;
}

.search-input:focus {
  border-color: #007f66;
  box-shadow: 0 0 5px rgba(0, 191, 165, 0.5);
}

.sort-label {
  font-weight: bold;
  color: #00bfa5;
}

.sort-select {
  padding: 10px;
  border: 2px solid #00bfa5;
  border-radius: 8px;
}

/* Table Styling */
.table-container {
  max-height: 83vh;
  overflow-y: auto;
  overflow-x: auto;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  background-color: #f9f9f9;
  height: calc(100vh - 200px);
}

.qrcodes-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 1rem;
}

.qrcodes-table th {
  background-color: #e0e0e0;
  color: #00bfa5;
  padding: 12px;
  text-align: left;
  font-weight: bold;
  cursor: pointer;
  border-bottom: 2px solid #007f66;
}

.qrcodes-table td {
  padding: 12px;
  border-bottom: 1px solid #ddd;
  text-transform: capitalize;
  text-align: left;
}

.qrcodes-table tr:nth-child(even) {
  background-color: #e8f5e9;
}

/* Button Styling */
button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background-color: #00bfa5;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: 0.3s;
}

button:hover {
  background-color: #007f66;
}

/* Mobile View Styles */
@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
    width: 100%;
  }

  .main-content.full-width {
    margin-left: 0;
    width: 100%;
  }

  .content-container {
    margin-left: 0px;
  }

  .controls {
    align-items: flex-end;
  }
  .search-input {
    max-width: 20vh;
  }
  .sort-select {
    max-width: 12vh;
  }

  .table-container {
    max-height: 85vh;
    overflow-y: auto; /* Enable vertical scrolling */
    overflow-x: auto;
  }

  h2 {
    font-size: 1.2rem;
  }
}
</style>
