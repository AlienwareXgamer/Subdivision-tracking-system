// Part 1: Module Imports and Firebase Initialization
const admin = require('firebase-admin'); // Firebase Admin SDK for Firestore access
const { SerialPort } = require('serialport'); // SerialPort for interfacing with Arduino over serial
const { ReadlineParser } = require('@serialport/parser-readline'); // Parser to read serial data line-by-line
const express = require('express'); // Express framework for server
const cors = require('cors'); // CORS middleware to allow cross-origin requests
const commander = require('commander'); // Command-line interface package
const winston = require('winston'); // Logging package for log rotation
const serviceAccount = require('./itcapstonerfidandqr-firebase-adminsdk-t8j04-4aae5248fd.json'); // Firebase service account

// Firebase Admin initialization with error handling
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://itcapstonerfidandqr.firebaseio.com"
  });
} catch (error) {
  logWithTimestamp(`Firebase initialization failed: ${error.message}`, "ERROR");
}

const db = admin.firestore(); // Firestore database instance

// Part 2: Express Setup and CLI Commands
const program = new commander.Command(); // Initialize commander for CLI

// Define command for starting the server
program
  .command('start')
  .description('Start the server')
  .action(() => {
    logWithTimestamp("Starting the server...", "INFO");
    app.listen(port, () => {
      logWithTimestamp(`Server running on port ${port}`, "INFO");
    });
  });

// Define command for refreshing the system
program
  .command('refresh')
  .description('Refresh the RFID system status')
  .action(() => {
    logWithTimestamp("Refreshing system...", "INFO");
    checkPortsStatus();
    sendPingToAllDevices();
  });

// Define command for checking the RFID status
program
  .command('status')
  .description('Check the status of the RFID system')
  .action(() => {
    logWithTimestamp("Checking RFID system status...", "INFO");
    checkPortsStatus();
  });

// Define command for sending a manual ping to the RFID reader
program
  .command('ping')
  .description('Send a ping to all connected devices')
  .action(() => {
    logWithTimestamp("Sending ping to all devices...", "INFO");
    sendPingToAllDevices();
  });

// Define command for shutting down the server gracefully
program
  .command('shutdown')
  .description('Shutdown the server gracefully')
  .action(() => {
    logWithTimestamp("Shutting down server...", "INFO");
    process.exit();
  });

// Define command for restarting the server
program
  .command('restart')
  .description('Restart the server')
  .action(() => {
    logWithTimestamp("Restarting server...", "INFO");
    restartServer();
  });

// Parse the command-line arguments
program.parse(process.argv);

// Part 3: Express Setup
const app = express();
app.use(express.json()); // Support JSON-encoded bodies
app.use(cors({ origin: 'https://your-domain.com' })); // Restrict CORS to specific domains

const port = process.env.PORT || 3000; // Set server port

// Graceful shutdown handling
process.on('SIGINT', () => {
  logWithTimestamp("Shutting down gracefully...", "INFO");
  app.close(() => {
    logWithTimestamp("Server closed.", "INFO");
  });
});

// Part 4: Serial Port Configurations
SerialPort.list().then(ports => {
  ports.forEach(port => {
    logWithTimestamp(`Available port: ${port.path}`, "INFO");
    if (port.path === 'COM22') {
      openSerialPortWithRetry(port, 3);
    }
  });
});

function openSerialPortWithRetry(port, retries = 3) {
  let attempt = 0;
  function tryOpening() {
    const serialPort = new SerialPort({ path: port.path, baudRate: 9600 });
    serialPort.open((err) => {
      if (err) {
        if (attempt < retries) {
          attempt++;
          logWithTimestamp(`Failed to open port, retrying... (Attempt ${attempt})`, "ERROR");
          tryOpening();
        } else {
          logWithTimestamp(`Failed to open port after ${retries} attempts: ${err.message}`, "ERROR");
        }
      } else {
        logWithTimestamp(`Port opened successfully: ${port.path}`, "SUCCESS");
      }
    });
  }
  tryOpening();
}

// Part 5: Port Error Handling
function handlePortError(err) {
  if (err) {
    logWithTimestamp(`Port error: ${err.message}. Stack trace: ${err.stack}`, "ERROR");
  }
}

// Part 6: Queue and Cooldown Management
let queueVehicleEntry = [];
let queueWalkIn = [];
let queueVehicleExit = [];
let queueWalkOut = [];
let cooldownCacheVehicleEntry = {};
let cooldownCacheWalkIn = {};
let cooldownCacheVehicleExit = {};
let cooldownCacheWalkOut = {};
const cooldownTime = 180000; // Reduced cooldown to 3 minutes
const scanInterval = 2000; // Time interval between scans (2 seconds)

let residentCache = {}; // Cache for resident data to avoid redundant Firebase calls
const cacheLimit = 100; // Maximum cache size for resident data
const cacheExpiryTime = 300000; // Cache expiry time (5 minutes)

function logQueueLength(mode, queue) {
  logWithTimestamp(`Queue length for ${mode}: ${queue.length}`, "INFO");
}

// Part 7: Utility and Logging Functions
function handleError(error) {
  logWithTimestamp(`Error occurred: ${error.message}`, "ERROR");
}

// Log rotation using winston
const logger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: 'logfile.log', maxsize: 1000000, maxFiles: 5 })
  ]
});

// Part 8: UID Validation and Cache Management
function isValidUID(uid) {
  const uidRegex = /^[0-9A-F]{8}$/i;
  const isValid = uidRegex.test(uid);
  logWithTimestamp(`Checked UID validity: ${uid} - Valid: ${isValid}`, "INFO");
  return isValid;
}

function cleanExpiredCache() {
  const currentTime = Date.now();
  for (const uid in residentCache) {
    if (currentTime - residentCache[uid].timestamp > cacheExpiryTime) {
      delete residentCache[uid];
      logWithTimestamp(`Expired cache entry removed for UID: ${uid}`, "INFO");
    }
  }
}

// Part 9: Assign Reader Handling and Database Operations
parserAssign.on('data', (data) => {
  const uid = data.trim();
  logWithTimestamp(`Received data from Assign Reader: ${uid}`, "INFO");

  if (!isValidUID(uid)) {
    logWithTimestamp(`Invalid UID received on Assign: ${uid}`, "ERROR");
    return;
  }

  db.collection('residents').doc(uid).get()
    .then((existingResident) => {
      if (existingResident.exists) {
        const residentData = existingResident.data();
        if (residentData.assigned === false) {
          logWithTimestamp(`RFID UID ${uid} present in database but not assigned. Please assign it.`, "INFO");
          writeToSerialPort(portAssign, 'UID Not Assigned\n');
        } else {
          logWithTimestamp(`Resident already assigned for UID: ${uid}`, "SUCCESS");
          writeToSerialPort(portAssign, 'Resident Found\n');
        }
      } else {
        db.collection('residents').doc(uid).set({ assigned: false })
          .then(() => {
            logWithTimestamp(`New resident document created for UID: ${uid} with assigned: false`, "INFO");
            writeToSerialPort(portAssign, 'New Resident Created\n');
          })
          .catch((error) => {
            logWithTimestamp(`Error creating new resident: ${error.message}`, "ERROR");
            writeToSerialPort(portAssign, 'Error\n');
          });
      }
    })
    .catch((error) => {
      logWithTimestamp(`Error on Assign: ${error.message}`, "ERROR");
      writeToSerialPort(portAssign, 'Error\n');
    });
});

// Part 10: Firebase Logging and Server Setup
function logToFirebase(uid, status, mode, message = "No additional message") {
  const logCollection = mode.includes('Entry') ? 'latest_accepted_entry_log' : 'latest_exit_log';
  const timestamp = new Date();

  db.collection('all_rfid_logs').doc(`${uid}-${Date.now()}`).set({ rfidTag: uid, timestamp, status, mode })
    .then(() => {
      if (status === 'accepted') {
        db.collection(logCollection).doc(uid).set({ rfidTag: uid, timestamp, status, mode, message });
      } else if (status === 'denied') {
        db.collection('denied_uid').doc(`${uid}-${Date.now()}`).set({ rfidTag: uid, timestamp, status, message });
      }
    })
    .catch((error) => {
      logWithTimestamp(`Error logging to Firebase: ${error.message}`, "ERROR");
    });
}

// Periodic keep-alive ping to prevent disconnection
setInterval(() => {
  portVehicleEntry.write("ping\n");
  portWalkIn.write("ping\n");
  portVehicleExit.write("ping\n");
  portWalkOut.write("ping\n");
  portAssign.write("ping\n");
  logWithTimestamp("Keep-alive ping sent to all ports", "INFO");
}, 300000);

// Health check endpoint
setInterval(() => {
  app.get('/health', (req, res) => res.send('OK'));
}, 60000); // Health check every 60 seconds
