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

// SerialPort configurations for Entry, Exit, and Assign Readers
const portVehicleEntry = new SerialPort({ path: 'COM3', baudRate: 9600 }, handlePortError);
const portWalkIn = new SerialPort({ path: 'COM4', baudRate: 9600 }, handlePortError);
const portVehicleExit = new SerialPort({ path: 'COM6', baudRate: 9600 }, handlePortError);
const portWalkOut = new SerialPort({ path: 'COM30', baudRate: 9600 }, handlePortError);
const portAssign = new SerialPort({ path: 'COM', baudRate: 9600 }, handlePortError);

// Set up serial data parsers for each reader
const parserVehicleEntry = portVehicleEntry.pipe(new ReadlineParser({ delimiter: '\n' }));
const parserWalkIn = portWalkIn.pipe(new ReadlineParser({ delimiter: '\n' }));
const parserVehicleExit = portVehicleExit.pipe(new ReadlineParser({ delimiter: '\n' }));
const parserWalkOut = portWalkOut.pipe(new ReadlineParser({ delimiter: '\n' }));
const parserAssign = portAssign.pipe(new ReadlineParser({ delimiter: '\n' }));

// Error handler for COM ports
function handlePortError(err) {
  if (err) {
    console.error(`Failed to open port: ${err.message}`);
  }
}

// Cooldown and concurrency controls for Entry and Exit Readers
let queueVehicleEntry = [];
let queueWalkIn = [];
let queueVehicleExit = [];
let queueWalkOut = [];
let cooldownCacheVehicleEntry = {};
let cooldownCacheWalkIn = {};
let cooldownCacheVehicleExit = {};
let cooldownCacheWalkOut = {};
const cooldownTime = 10000; // Cooldown time in milliseconds (10 seconds)

// Cache settings for resident UID lookups
let residentCache = {}; // Cache for resident data to avoid redundant Firebase calls
const cacheLimit = 100; // Maximum cache size
const cacheExpiryTime = 300000; // Cache expiry time in milliseconds (5 minutes)

// Function to send messages to the serial port with retry logic
async function writeToSerialPort(port, message, retries = 3) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      await new Promise((resolve, reject) => {
        port.write(message, (err) => {
          if (err) reject(err);
          resolve();
        });
      });
      break;
    } catch (err) {
      attempt++;
    }
  }
}

// Function to check if a UID is valid (hexadecimal format with 8 characters)
function isValidUID(uid) {
  const uidRegex = /^[0-9A-F]{8}$/i;
  return uidRegex.test(uid);
}

// Handle data received from Assign Reader
parserAssign.on('data', async (data) => {
  const uid = data.trim();
  if (!isValidUID(uid)) {
    console.error(`Invalid UID received on Assign: ${uid}`);
    return;
  }

  try {
    const existingResident = await db.collection('residents').doc(uid).get(); // Check if UID exists in Firestore
    if (existingResident.exists) { // If document exists
      const residentData = existingResident.data();
      if (residentData.assigned === false) { // If assigned field is false
        await writeToSerialPort(portAssign, 'UID Not Assigned\n'); // Send "UID Not Assigned" to Arduino
      } else { // If assigned field is true
        await writeToSerialPort(portAssign, 'Resident Found\n'); // Indicate assignment found
      }
    } else { // If document does not exist
      await db.collection('residents').doc(uid).set({ assigned: false }); // Create new document with assigned: false
      await writeToSerialPort(portAssign, 'New Resident Created\n'); // Indicate new document created
    }
  } catch (error) {
    console.error(`Error processing Assign UID: ${error.message}`);
    await writeToSerialPort(portAssign, 'Error\n'); // Indicate error to Arduino
  }
});

// Handle data received from Entry and Exit readers
function handleReaderData(data, mode, queue, cooldownCache, port) {
  const uid = data.trim();
  if (!isValidUID(uid)) {
    console.error(`Invalid UID received on ${mode}: ${uid}`);
    return;
  }

  const currentTime = Date.now();
  if (!queue.includes(uid) && (!cooldownCache[uid] || currentTime - cooldownCache[uid] >= cooldownTime)) {
    queue.push(uid); // Add UID to queue if not in cooldown
    processQueue(mode, queue, cooldownCache, port); // Process queue
  }
}

// Process each queue independently
async function processQueue(mode, queue, cooldownCache, port) {
  if (queue.length === 0) return;

  const uid = queue.shift(); // Get next UID in queue
  const currentTime = Date.now();
  cooldownCache[uid] = currentTime; // Set cooldown for UID

  try {
    const residentData = await fetchResidentDataWithRetry(uid); // Fetch data from Firebase

    if (residentData) { // If UID exists in database
      const assignedStatus = residentData.assigned;
      if (assignedStatus === true) { // Access granted if assigned is true
        const accessMessage = mode.includes('Entry') ? "Resident Found Entry Granted" : "Resident Found Exit Granted";
        await writeToSerialPort(port, 'Resident Found\n');
        await logToFirebase(uid, 'accepted', mode, accessMessage); // Log with appropriate message
      } else { // Access denied if assigned is false
        await writeToSerialPort(port, 'Resident Not Found - Assign Needed\n');
        await logToFirebase(uid, 'denied', mode, "UID exists but is not assigned");
        await logDeniedUID(uid, mode); // Log denied UID
      }
    } else { // Handle case if UID not found in database
      await writeToSerialPort(port, 'Resident Not Found\n');
      await logToFirebase(uid, 'denied', mode, "UID not found in database");
      await logDeniedUID(uid, mode); // Log denied UID
    }
  } catch (error) {
    console.error(`Error processing UID ${uid} on ${mode}: ${error.message}`);
    await writeToSerialPort(port, 'Error\n');
  }
}

// Log denied UIDs to Firebase
async function logDeniedUID(uid, mode) {
  const timestamp = new Date();
  await db.collection("Denied Uid's").doc(`${uid}-${Date.now()}`).set({
    rfidTag: uid,
    timestamp: timestamp,
    location: mode,
  });
  console.log(`Denied UID logged: ${uid} at ${mode}`);
}

// Fetch resident data from Firebase with retry logic
async function fetchResidentDataWithRetry(uid, retries = 3) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      const docSnapshot = await db.collection('residents').doc(uid).get(); // Attempt to fetch document
      return docSnapshot.exists ? docSnapshot.data() : null; // Return data if exists
    } catch (error) {
      attempt++;
      if (attempt === retries) throw error; // Throw error after max retries
    }
  }
}

// Log entry or exit events to Firebase
async function logToFirebase(uid, status, mode, message = "No additional message") {
  const logCollection = mode.includes('Entry') ? 'latest_accepted_entry_log' : 'latest_exit_log';
  const timestamp = new Date();

  // Log to "all_rfid_logs" collection
  await db.collection('all_rfid_logs').doc(`${uid}-${Date.now()}`).set({ rfidTag: uid, timestamp, status, mode });

  // Log only to the appropriate collection if `accepted`, otherwise only to `denied_uid`
  if (status === 'accepted') {
    await db.collection(logCollection).doc(uid).set({ rfidTag: uid, timestamp, status, mode, message });
  }
}

// Periodic keep-alive ping to prevent disconnection
setInterval(() => {
  portVehicleEntry.write("ping\n");
  portWalkIn.write("ping\n");
  portVehicleExit.write("ping\n");
  portWalkOut.write("ping\n");
  portAssign.write("ping\n");
}, 300000); // Every 5 minutes

// Listener for each COM port
parserVehicleEntry.on('data', data => handleReaderData(data, 'Vehicle Entry', queueVehicleEntry, cooldownCacheVehicleEntry, portVehicleEntry));
parserWalkIn.on('data', data => handleReaderData(data, 'Walk In', queueWalkIn, cooldownCacheWalkIn, portWalkIn));
parserVehicleExit.on('data', data => handleReaderData(data, 'Vehicle Exit', queueVehicleExit, cooldownCacheVehicleExit, portVehicleExit));
parserWalkOut.on('data', data => handleReaderData(data, 'Walk Out', queueWalkOut, cooldownCacheWalkOut, portWalkOut));

// Start the Express server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
