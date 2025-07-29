// Import necessary modules
const admin = require('firebase-admin'); // Firebase Admin SDK for Firestore access
const { SerialPort } = require('serialport'); // SerialPort for interfacing with Arduino over serial
const { ReadlineParser } = require('@serialport/parser-readline'); // Parser to read serial data line-by-line
const express = require('express'); // Express framework for server
const cors = require('cors'); // CORS middleware to allow cross-origin requests
const serviceAccount = require('./itcapstonerfidandqr-firebase-adminsdk-t8j04-4aae5248fd.json'); // Firebase service account

// Firebase Admin initialization
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount), // Set Firebase credentials
  databaseURL: "https://itcapstonerfidandqr.firebaseio.com" // Firebase database URL
});
const db = admin.firestore(); // Firestore database instance

// Initialize Express app
const app = express();
app.use(express.json()); // Support JSON-encoded bodies
app.use(cors()); // Enable CORS for all requests

// Server port
const port = process.env.PORT || 3000; // Set server port
logWithTimestamp(`Server is starting on port ${port}`, "INFO");

// SerialPort configurations for Vehicle Entry, Walk-in, Vehicle Exit, Walk-out, and Assign Readers
const portVehicleEntry = new SerialPort({ path: 'COM22', baudRate: 9600 }, handlePortError);
const portWalkIn = new SerialPort({ path: 'COM21', baudRate: 9600 }, handlePortError);
const portVehicleExit = new SerialPort({ path: 'COM30', baudRate: 9600 }, handlePortError);
const portWalkOut = new SerialPort({ path: 'COM30', baudRate: 9600 }, handlePortError);
const portAssign = new SerialPort({ path: 'COM4', baudRate: 9600 }, handlePortError);

// Set up serial data parsers for each reader
const parserVehicleEntry = portVehicleEntry.pipe(new ReadlineParser({ delimiter: '\n' }));
const parserWalkIn = portWalkIn.pipe(new ReadlineParser({ delimiter: '\n' }));
const parserVehicleExit = portVehicleExit.pipe(new ReadlineParser({ delimiter: '\n' }));
const parserWalkOut = portWalkOut.pipe(new ReadlineParser({ delimiter: '\n' }));
const parserAssign = portAssign.pipe(new ReadlineParser({ delimiter: '\n' }));

// Error handler for COM ports
function handlePortError(err) {
  if (err) {
    logWithTimestamp(`Failed to open port: ${err.message}`, "ERROR");
  }
}

// Cooldown and concurrency controls for Vehicle Entry, Walk-in, Vehicle Exit, Walk-out Readers
let queueVehicleEntry = [];
let queueWalkIn = [];
let queueVehicleExit = [];
let queueWalkOut = [];
let cooldownCacheVehicleEntry = {};
let cooldownCacheWalkIn = {};
let cooldownCacheVehicleExit = {};
let cooldownCacheWalkOut = {};
const cooldownTime = 180000; // Reduced cooldown to 10 seconds (10000 milliseconds)
const scanInterval = 2000; // Time interval between scans in milliseconds (2 seconds)

// Cache settings for resident UID lookups
let residentCache = {}; // Cache for resident data to avoid redundant Firebase calls
const cacheLimit = 100; // Maximum cache size
const cacheExpiryTime = 300000; // Cache expiry time in milliseconds (5 minutes)

// Utility function for logging
function logWithTimestamp(message, level = "INFO") {
  const now = new Date();
  const timestamp = `${now.toLocaleDateString()} ${now.toLocaleTimeString('en-GB', { hour12: true })}`;
  const levelTag = level === "SUCCESS" ? '\x1b[32m[SUCCESS]\x1b[0m' : level === "ERROR" ? '\x1b[31m[ERROR]\x1b[0m' : '\x1b[34m[INFO]\x1b[0m';
  console.log(`${levelTag} [${timestamp}] ${message}`);
}

// Function to send messages to the serial port with retry logic
function writeToSerialPort(port, message, retries = 3) {
  let attempt = 0;
  function tryWriting() {
    port.write(message, (err) => {
      if (err) {
        if (attempt < retries) {
          logWithTimestamp(`Error writing to serial port (attempt ${attempt + 1}): ${err.message}`, "ERROR");
          attempt++;
          tryWriting();
        } else {
          logWithTimestamp(`Failed to send message after ${retries} attempts: ${err.message}`, "ERROR");
        }
      } else {
        logWithTimestamp(`Message sent to Arduino: ${message.trim()}`, "SUCCESS");
      }
    });
  }
  tryWriting();
}

// Function to check if a UID is valid (hexadecimal format with 8 characters)
function isValidUID(uid) {
  const uidRegex = /^[0-9A-F]{8}$/i;
  const isValid = uidRegex.test(uid);
  logWithTimestamp(`Checked UID validity: ${uid} - Valid: ${isValid}`, "INFO");
  return isValid;
}

// Function to filter invalid responses like "ping"
function isPingResponse(data) {
  return data.trim().toLowerCase() === 'ping';
}

// Function to clean up expired cache entries
function cleanExpiredCache() {
  const currentTime = Date.now();
  for (const uid in residentCache) {
    if (currentTime - residentCache[uid].timestamp > cacheExpiryTime) {
      delete residentCache[uid];
      logWithTimestamp(`Expired cache entry removed for UID: ${uid}`, "INFO");
    }
  }
}

// Schedule cache cleanup every 5 minutes
setInterval(cleanExpiredCache, 300000); // Every 5 minutes

// Handle data received from Assign Reader (COM4)
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

// Function to handle data from Entry and Exit readers with updated mode names
function handleReaderData(data, mode, queue, cooldownCache, port) {
  if (isPingResponse(data)) {
    logWithTimestamp(`Ping response received on ${mode}. Ignoring...`, "INFO");
    return;
  }

  const uid = data.trim();
  logWithTimestamp(`Received data from ${mode}: ${uid}`, "INFO");

  if (!isValidUID(uid)) {
    logWithTimestamp(`Invalid UID received on ${mode}: ${uid}`, "ERROR");
    return;
  }

  const currentTime = Date.now();
  if (!queue.includes(uid) && (!cooldownCache[uid] || currentTime - cooldownCache[uid] >= cooldownTime)) {
    queue.push(uid);
    logWithTimestamp(`UID ${uid} added to ${mode} queue`, "INFO");
    processQueue(mode, queue, cooldownCache, port);
  } else {
    logWithTimestamp(`UID ${uid} ignored on ${mode} due to cooldown`, "WARNING");
  }
}

// Process each queue independently
function processQueue(mode, queue, cooldownCache, port) {
  if (queue.length === 0) return;

  const uid = queue.shift();
  const currentTime = Date.now();
  cooldownCache[uid] = currentTime;

  fetchResidentDataWithRetry(uid)
    .then((residentData) => {
      if (residentData) {
        const assignedStatus = residentData.assigned;
        logWithTimestamp(`Resident Data for UID ${uid} on ${mode}: ${JSON.stringify(residentData, null, 2)}`, "INFO");

        if (assignedStatus === true) {
          const accessMessage = mode.includes('Entry') ? "Resident found Entry Granted" : "Resident found Exit Granted";
          logWithTimestamp(`Resident with UID ${uid} is assigned. ${accessMessage} on ${mode}`, "SUCCESS");
          writeToSerialPort(port, 'Resident Found\n');
          logToFirebase(uid, 'accepted', mode, accessMessage);
        } else if (assignedStatus === false) {
          logWithTimestamp(`UID is found in database without a Resident Assigned. Please assign the UID.`, "INFO");
          writeToSerialPort(port, 'Resident Not Found - Assign Needed\n');
          logToFirebase(uid, 'denied', mode, "UID exists but is not assigned");
        } else {
          logWithTimestamp(`Resident with UID ${uid} does not have an 'assigned' field. Access denied on ${mode}`, "INFO");
          writeToSerialPort(port, 'Resident Not Found\n');
          logToFirebase(uid, 'denied', mode, "UID has no assigned field");
        }
      } else {
        logWithTimestamp(`ERROR: UID ${uid} NOT FOUND IN DATABASE`, "INFO");
        writeToSerialPort(port, 'Resident Not Found\n');
        logToFirebase(uid, 'denied', mode, "UID not found in database");
      }
    })
    .catch((error) => {
      logWithTimestamp(`Error processing UID ${uid} on ${mode}: ${error.message}`, "ERROR");
      writeToSerialPort(port, 'Error\n');
    });
}

// Fetch resident data from Firebase with retry logic
function fetchResidentDataWithRetry(uid, retries = 3) {
  let attempt = 0;
  function tryFetching() {
    return db.collection('residents').doc(uid).get()
      .then((docSnapshot) => docSnapshot.exists ? docSnapshot.data() : null)
      .catch((error) => {
        if (attempt < retries) {
          attempt++;
          return tryFetching();
        } else {
          throw new Error(`Failed to fetch data for UID ${uid}: ${error.message}`);
        }
      });
  }
  return tryFetching();
}

// Log entry or exit events to Firebase
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

// Listener for each COM port
parserVehicleEntry.on('data', data => handleReaderData(data, 'Vehicle Entry', queueVehicleEntry, cooldownCacheVehicleEntry, portVehicleEntry));
parserWalkIn.on('data', data => handleReaderData(data, 'Walk-in', queueWalkIn, cooldownCacheWalkIn, portWalkIn));
parserVehicleExit.on('data', data => handleReaderData(data, 'Vehicle Exit', queueVehicleExit, cooldownCacheVehicleExit, portVehicleExit));
parserWalkOut.on('data', data => handleReaderData(data, 'Walk-out', queueWalkOut, cooldownCacheWalkOut, portWalkOut));

// Start the Express server
app.listen(port, () => {
  logWithTimestamp(`Server running on port ${port}`, "INFO");
});
