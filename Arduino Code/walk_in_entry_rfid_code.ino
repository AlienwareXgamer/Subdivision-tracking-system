#include <SPI.h>
#include <MFRC522.h>

#define RST_PIN 9
#define SS_PIN 10
#define RED_LED_PIN 4
#define YELLOW_LED_PIN 5
#define GREEN_LED_PIN 6
#define BUZZER_PIN 8  // Pin for the buzzer

MFRC522 mfrc522(SS_PIN, RST_PIN);  // Create instance of MFRC522

// Variables for card scanning and LED control
unsigned long lastActionTime = 0;        // Timestamp for the last LED action
const unsigned long ledDelay = 700;      // LED display duration in milliseconds (0.7 seconds)
unsigned long lastScanTime = 0;          // Timestamp for last card scan
const unsigned long scanCooldown = 300;  // Cooldown between scans in milliseconds (faster re-read)
bool cardPresent = false;                // Track if a card is currently in range
byte lastUID[10];                        // Store the last scanned UID
byte lastUIDSize = 0;                    // Store the size of the last scanned UID
bool waitingForResponse = false;         // Flag to track if we're waiting for server response
unsigned long responseTimeout = 0;       // Timeout for server response
const unsigned long responseDelay = 3000; // Max time to wait for server response (3 seconds)
bool timeoutExceeded = false;            // Flag to indicate timeout exceeded

// Cache for recent UID to avoid redundant server requests
byte cachedUID[10];
unsigned long cachedTime = 0;
const unsigned long cacheTimeout = 5000;  // Cache timeout in milliseconds (5 seconds)
bool isCacheRefreshing = false;           // Flag to indicate cache is being updated

// Enum for tracking the LED state
enum LedState { STANDBY, ENTRY_GRANTED, ENTRY_DENIED };
LedState currentLedState = STANDBY;

void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  while (!Serial);  // Wait for the serial port to connect

  // Initialize SPI bus with reduced clock speed for stability (supporting up to 8 meters LAN cable)
  SPI.begin();
  SPI.setClockDivider(SPI_CLOCK_DIV32);  // Set SPI speed to 500 kHz for longer LAN cable support (optimal for 8 meters)

  // Initialize MFRC522 RFID module
  mfrc522.PCD_Init();
  Serial.println(F("Walk-in RFID entry system initialized. Please scan your card."));

  // Initialize LED pins as outputs
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(YELLOW_LED_PIN, OUTPUT);
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT); // Initialize the buzzer pin as output

  // Set the system to standby mode (yellow LED)
  standbyState();
}

void loop() {
  unsigned long currentTime = millis();

  // Automatically return to standby if the LED has been in the current state for too long
  if (currentTime - lastActionTime > ledDelay && currentLedState != STANDBY) {
    standbyState();
  }

  // Timeout for server response
  if (waitingForResponse && (currentTime - responseTimeout > responseDelay)) {
    Serial.println(F("Response timeout exceeded!"));
    entryDenied();  // Treat as 'entry denied' if no response from the server
    waitingForResponse = false;
    timeoutExceeded = true;
  }

  // Check if a new card is present and read its UID
  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    if (!waitingForResponse && currentTime - lastScanTime > scanCooldown) {  // Cooldown to avoid duplicate scans
      // Cache check: If the UID is the same as the cached one, skip the server request
      if (isSameUID(mfrc522.uid.uidByte, mfrc522.uid.size) && (currentTime - cachedTime) < cacheTimeout) {
        Serial.println(F("Using cached UID."));
        return;  // Skip sending to server if within cache timeout
      }

      // Send UID to server if it's a new UID or cache has expired
      sendUIDToServer();
      waitingForResponse = true;  // Set flag for waiting for response
      responseTimeout = millis();  // Set response timeout counter
      saveLastUID(mfrc522.uid.uidByte, mfrc522.uid.size);  // Save UID
      cardPresent = true;  // Mark card as present
      lastScanTime = millis();  // Update last scan time

      // Update cache with the new UID
      saveCacheUID(mfrc522.uid.uidByte, mfrc522.uid.size);
    }
  } else if (cardPresent) {
    // Check if the card has been removed
    cardPresent = false;  // Reset card presence
    clearLastUID();  // Clear UID when card is removed
    Serial.println(F("Card removed."));
  }

  // Read the response from the Node.js server
  if (Serial.available() > 0) {
    String response = Serial.readStringUntil('\n');  // Read the response from the server
    response.trim();

    Serial.print(F("Response received: "));
    Serial.println(response);

    // Handle different server responses
    if (response.equals("Resident Found")) {
      entryGranted();  // Green LED if entry is granted
      updateLogs("accepted");  // Update logs for accepted entry
      waitingForResponse = false;
      timeoutExceeded = false;
    } else {
      entryDenied();  // Red LED if entry is denied
      updateLogs("denied");  // Update logs for denied entry
      waitingForResponse = false;
      timeoutExceeded = false;
    }
  }
}

// Function to send the scanned UID to the Node.js server over Serial
void sendUIDToServer() {
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) {
      Serial.print("0");
    }
    Serial.print(mfrc522.uid.uidByte[i], HEX);
  }
  Serial.println();
}

// Save the last scanned UID
void saveLastUID(byte *uid, byte uidSize) {
  lastUIDSize = uidSize;
  for (byte i = 0; i < uidSize; i++) {
    lastUID[i] = uid[i];
  }
}

// Clear the last scanned UID
void clearLastUID() {
  lastUIDSize = 0;
}

// Cache the UID and the timestamp when it was cached
void saveCacheUID(byte *uid, byte uidSize) {
  for (byte i = 0; i < uidSize; i++) {
    cachedUID[i] = uid[i];
  }
  cachedTime = millis();  // Update cache timestamp
}

// Check if the scanned UID is the same as the last one
bool isSameUID(byte *uid, byte uidSize) {
  if (uidSize != lastUIDSize) {
    return false;
  }
  for (byte i = 0; i < uidSize; i++) {
    if (uid[i] != lastUID[i]) {
      return false;
    }
  }
  return true;
}

// Function to update logs based on access granted/denied
void updateLogs(String status) {
  if (status == "accepted") {
    // Log to accepted entry and all logs
    logToFirebase("latest_accepted_entry_log", "accepted", "Entry", "Resident found");
  } else if (status == "denied") {
    // Log to denied entry log and all logs
    logToFirebase("denied_entry_log", "denied", "Entry", "Resident not found or UID not assigned");
  }
  
  // Log all RFID scans for auditing
  logToFirebase("all_rfid_logs", status, "Scan", "RFID scanned");
}

// Function to log to Firebase
void logToFirebase(String collection, String status, String mode, String message) {
  String logMessage = String("Logging to ") + collection + ": " + status + " - " + mode + ": " + message;
  Serial.println(logMessage);  // Log to serial for debugging
  
  // Normally, you'd send this log to your Firebase server here
  // Use Serial.print or HTTP requests to push data to Firebase
}

// Turn on the green LED for granted entry
void entryGranted() {
  turnOffAllLEDs();
  digitalWrite(GREEN_LED_PIN, HIGH);
  Serial.println(F("Green LED on: Entry Granted"));
  playAcceptedSound();
  currentLedState = ENTRY_GRANTED;
  lastActionTime = millis();
}

// Turn on the red LED for denied entry
void entryDenied() {
  turnOffAllLEDs();
  digitalWrite(RED_LED_PIN, HIGH);
  Serial.println(F("Red LED on: Entry Denied"));
  playDeniedSound();
  currentLedState = ENTRY_DENIED;
  lastActionTime = millis();
}

// Set system to standby mode
void standbyState() {
  turnOffAllLEDs();
  digitalWrite(YELLOW_LED_PIN, HIGH);
  currentLedState = STANDBY;
}

// Turn off all LEDs
void turnOffAllLEDs() {
  digitalWrite(RED_LED_PIN, LOW);
  digitalWrite(YELLOW_LED_PIN, LOW);
  digitalWrite(GREEN_LED_PIN, LOW);
}

// Accepted access sound
void playAcceptedSound() {
  tone(BUZZER_PIN, 4000, 300);
  delay(700);
}

// Denied access sound
void playDeniedSound() {
  for (int i = 0; i < 2; i++) {
    tone(BUZZER_PIN, 4000, 300);
    delay(300);
  }
}
