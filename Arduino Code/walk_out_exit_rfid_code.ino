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
const unsigned long responseDelay = 2500; // Max time to wait for server response (2.5 seconds)
bool timeoutExceeded = false;            // Flag to indicate timeout exceeded

// Enum for tracking the LED state
enum LedState { STANDBY, FOUND, NOT_FOUND };
LedState currentLedState = STANDBY;

void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  while (!Serial);  // Wait for the serial port to connect

  // Initialize SPI bus with a faster clock speed for shorter cable length
  SPI.begin();
  SPI.setClockDivider(SPI_CLOCK_DIV16);  // Set SPI speed to 1 MHz for faster communication

  // Initialize MFRC522 RFID module
  mfrc522.PCD_Init();
  Serial.println(F("Walk-Out RFID Exit system initialized. Scan a card..."));

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
    userNotFound();  // Treat as 'not found' if no response from the server
    waitingForResponse = false;
    timeoutExceeded = true;
  }

  // Check if a new card is present and read its UID
  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    if (!waitingForResponse && currentTime - lastScanTime > scanCooldown) {  // Cooldown to avoid duplicate scans
      if (!isSameUID(mfrc522.uid.uidByte, mfrc522.uid.size)) {  // Check if the UID is different from the last one
        sendUIDToServer();  // Send UID to server
        waitingForResponse = true;  // Set flag for waiting for response
        responseTimeout = millis();  // Set response timeout counter
        saveLastUID(mfrc522.uid.uidByte, mfrc522.uid.size);  // Save UID
        cardPresent = true;  // Mark card as present
        lastScanTime = millis();  // Update last scan time
      }
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
      userFound();  // Green LED if resident is found
      updateLogs("accepted");  // Log accepted entry in latest_exit_log
      waitingForResponse = false;
      timeoutExceeded = false;
    } else if (response.equals("Resident Not Found") || response.equals("LED:RED")) {
      userNotFound();  // Red LED if resident is not found or denied access
      updateLogs("denied");  // Log denied entry
      waitingForResponse = false;
      timeoutExceeded = false;
    } else if (response.equals("UID Not Assigned")) {
      Serial.println(F("Access Denied: UID found but not assigned. Please assign it to the admin."));
      updateLogs("denied");  // Log denied entry for unassigned UID
      waitingForResponse = false;
      timeoutExceeded = false;
      playDeniedSound();
    } else {
      Serial.println(F("Unknown response received from server."));
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
    // Log to latest_exit_log for accepted entries
    logToFirebase("latest_exit_log", "accepted", "Walk-Out Exit", "Resident found");
  } else if (status == "denied") {
    // Log to denied_entry_log for denied entries
    logToFirebase("denied_entry_log", "denied", "Walk-Out Exit", "Resident not found or UID not assigned");
  }
  
  // Log all RFID scans for auditing
  logToFirebase("all_rfid_logs", status, "Scan", "RFID scanned");
}

// Function to log to Firebase
void logToFirebase(String collection, String status, String mode, String message) {
  String logMessage = String("Logging to ") + collection + ": " + status + " - " + mode + ": " + message;
  Serial.println(logMessage);  // Log to serial for debugging
}

// Turn on the green LED and indicate a resident is found
void userFound() {
  turnOffAllLEDs();
  digitalWrite(GREEN_LED_PIN, HIGH);
  Serial.println(F("Green LED on: Resident Found"));
  playAcceptedSound();
  currentLedState = FOUND;
  lastActionTime = millis();
}

// Turn on the red LED for access denied
void userNotFound() {
  turnOffAllLEDs();
  digitalWrite(RED_LED_PIN, HIGH);
  Serial.println(F("Red LED on: Resident Not Found or Access Denied!"));
  playDeniedSound();
  currentLedState = NOT_FOUND;
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

// Sound for accepted access - 1 fast beep
void playAcceptedSound() {
  tone(BUZZER_PIN, 4000, 300);
  delay(700);
}

// Sound for denied access - 3 fast beeps
void playDeniedSound() {
  for (int i = 0; i < 3; i++) {
    tone(BUZZER_PIN, 4000, 300);
    delay(300);
  }
}
