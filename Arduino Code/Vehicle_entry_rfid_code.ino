#include <SPI.h>
#include <MFRC522.h>
#include <EEPROM.h>

#define RST_PIN 9
#define SS_PIN 10
#define RED_LED_PIN 4
#define YELLOW_LED_PIN 5
#define GREEN_LED_PIN 6
#define BUZZER_PIN 8

#define DEVICE_MODE_ENTRY true  // true for entry, false for exit
#define USER_TYPE_VEHICLE true  // true for vehicle, false for walk-in

#define MAX_PAIRED_UIDS 20
#define UID_SIZE 4
#define STATE_RECORD_SIZE (UID_SIZE + 1) // UID + state byte

// State values
#define STATE_OUTSIDE 0
#define STATE_INSIDE 1

MFRC522 mfrc522(SS_PIN, RST_PIN);

unsigned long lastActionTime = 0;
const unsigned long ledDelay = 700;
unsigned long lastScanTime = 0;
const unsigned long scanCooldown = 300;
bool cardPresent = false;
byte lastUID[10];
byte lastUIDSize = 0;
bool waitingForResponse = false;
unsigned long responseTimeout = 0;
const unsigned long responseDelay = 2500;
bool timeoutExceeded = false;

byte cachedUID[10];
unsigned long cachedTime = 0;
const unsigned long cacheTimeout = 5000;
bool isCacheRefreshing = false;

enum LedState { STANDBY, FOUND, NOT_FOUND, UNASSIGNED };
LedState currentLedState = STANDBY;

// --- Non-blocking buzzer state ---
unsigned long buzzerStartTime = 0;
int buzzerState = 0; // 0: idle, 1: accepted, 2: denied
int deniedBeeps = 0;

void setup() {
  Serial.begin(115200); // Faster serial if supported

  SPI.begin();
  SPI.setClockDivider(SPI_CLOCK_DIV16);

  mfrc522.PCD_Init();
  Serial.println(F("Vehicle RFID system initialized. Scan a card..."));

  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(YELLOW_LED_PIN, OUTPUT);
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

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
    Serial.println(F("Response timeout exceeded! Switching to offline mode."));
    waitingForResponse = false;
    timeoutExceeded = true;
  }

  // Read incoming events from other Arduino
  if (Serial.available() > 0) {
    String msg = Serial.readStringUntil('\n');
    msg.trim();
    processIncomingEvent(msg);
  }

  // Check if a new card is present and read its UID
  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    if (!waitingForResponse && currentTime - lastScanTime > scanCooldown) {
      byte state;
      bool found = getUIDState(mfrc522.uid.uidByte, mfrc522.uid.size, state);

      // Determine allowed action based on device mode and state
      bool allow = false;
      if (DEVICE_MODE_ENTRY) {
        allow = (!found || state == STATE_OUTSIDE);
      } else {
        allow = (found && state == STATE_INSIDE);
      }

      if (allow) {
        // Update state locally
        setUIDState(mfrc522.uid.uidByte, mfrc522.uid.size, DEVICE_MODE_ENTRY ? STATE_INSIDE : STATE_OUTSIDE);

        // Send event to other Arduino
        if (USER_TYPE_VEHICLE) {
          sendEventToOtherArduino(mfrc522.uid.uidByte, mfrc522.uid.size, DEVICE_MODE_ENTRY ? "VEHICLE_ENTRY" : "VEHICLE_EXIT");
        } else {
          sendEventToOtherArduino(mfrc522.uid.uidByte, mfrc522.uid.size, DEVICE_MODE_ENTRY ? "WALKIN_ENTRY" : "WALKIN_EXIT");
        }

        userFound();
        updateLogs("accepted");
      } else {
        userNotFound();
        updateLogs("denied");
      }

      saveLastUID(mfrc522.uid.uidByte, mfrc522.uid.size);
      cardPresent = true;
      lastScanTime = millis();
      saveCacheUID(mfrc522.uid.uidByte, mfrc522.uid.size);
    }
  } else if (cardPresent) {
    cardPresent = false;
    clearLastUID();
    Serial.println(F("Card removed."));
  }

  handleBuzzer();
}

// --- State tracking in EEPROM ---
bool getUIDState(byte *uid, byte uidSize, byte &state) {
  for (int i = 0; i < MAX_PAIRED_UIDS; i++) {
    int addr = i * STATE_RECORD_SIZE;
    bool match = true;
    for (int j = 0; j < UID_SIZE; j++) {
      if (EEPROM.read(addr + j) != uid[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      state = EEPROM.read(addr + UID_SIZE);
      return true;
    }
  }
  return false;
}

void setUIDState(byte *uid, byte uidSize, byte state) {
  for (int i = 0; i < MAX_PAIRED_UIDS; i++) {
    int addr = i * STATE_RECORD_SIZE;
    bool match = true;
    for (int j = 0; j < UID_SIZE; j++) {
      if (EEPROM.read(addr + j) != uid[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      EEPROM.write(addr + UID_SIZE, state);
      return;
    }
    // If empty slot, add new
    if (EEPROM.read(addr) == 0xFF) {
      for (int j = 0; j < UID_SIZE; j++) {
        EEPROM.write(addr + j, uid[j]);
      }
      EEPROM.write(addr + UID_SIZE, state);
      return;
    }
  }
}

// --- Communication helpers ---
void sendEventToOtherArduino(byte *uid, byte uidSize, const char* eventType) {
  Serial.print("EVENT:");
  for (byte i = 0; i < uidSize; i++) {
    if (uid[i] < 0x10) Serial.print("0");
    Serial.print(uid[i], HEX);
  }
  Serial.print(",");
  Serial.println(eventType);
}

void processIncomingEvent(String msg) {
  // Format: EVENT:UID,EVENT_TYPE
  if (!msg.startsWith("EVENT:")) return;
  int commaIdx = msg.indexOf(',');
  if (commaIdx < 0) return;
  String uidStr = msg.substring(6, commaIdx);
  String eventType = msg.substring(commaIdx + 1);

  byte uid[UID_SIZE];
  for (int i = 0; i < UID_SIZE; i++) {
    uid[i] = strtoul(uidStr.substring(i*2, i*2+2).c_str(), NULL, 16);
  }

  if (eventType == "VEHICLE_ENTRY" || eventType == "WALKIN_ENTRY") {
    setUIDState(uid, UID_SIZE, STATE_INSIDE);
  } else if (eventType == "VEHICLE_EXIT" || eventType == "WALKIN_EXIT") {
    setUIDState(uid, UID_SIZE, STATE_OUTSIDE);
  }
}

void userFound() {
  turnOffAllLEDs();
  digitalWrite(GREEN_LED_PIN, HIGH);
  Serial.println(F("Green LED on: Resident Found"));
  startBuzzerAccepted();
  currentLedState = FOUND;
  lastActionTime = millis();
}

void userNotFound() {
  turnOffAllLEDs();
  digitalWrite(RED_LED_PIN, HIGH);
  Serial.println(F("Red LED on: Resident Not Found or Access Denied!"));
  startBuzzerDenied();
  currentLedState = NOT_FOUND;
  lastActionTime = millis();
}

void standbyState() {
  turnOffAllLEDs();
  digitalWrite(YELLOW_LED_PIN, HIGH);
  currentLedState = STANDBY;
}

void turnOffAllLEDs() {
  digitalWrite(RED_LED_PIN, LOW);
  digitalWrite(YELLOW_LED_PIN, LOW);
  digitalWrite(GREEN_LED_PIN, LOW);
}

void saveLastUID(byte *uid, byte uidSize) {
  lastUIDSize = uidSize;
  for (byte i = 0; i < uidSize; i++) {
    lastUID[i] = uid[i];
  }
}

void clearLastUID() {
  lastUIDSize = 0;
}

void saveCacheUID(byte *uid, byte uidSize) {
  for (byte i = 0; i < uidSize; i++) {
    cachedUID[i] = uid[i];
  }
  cachedTime = millis();
}

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

void updateLogs(String status) {
  if (status == "accepted") {
    logToFirebase("latest_accepted_entry_log", "accepted", "Entry", "Resident found");
  } else if (status == "denied") {
    logToFirebase("denied_entry_log", "denied", "Entry", "Resident not found or UID not assigned");
  }
  logToFirebase("all_rfid_logs", status, "Scan", "RFID scanned");
}

void logToFirebase(String collection, String status, String mode, String message) {
  String logMessage = String("Logging to ") + collection + ": " + status + " - " + mode + ": " + message;
  Serial.println(logMessage);
}
