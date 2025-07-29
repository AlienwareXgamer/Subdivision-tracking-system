#include <SPI.h>
#include <MFRC522.h>

#define RST_PIN 9
#define SS_PIN 10
#define RED_LED_PIN 4
#define YELLOW_LED_PIN 5
#define GREEN_LED_PIN 6
#define BLUE_LED_PIN 7  // Blue LED for "Resident Already Assigned"
#define WHITE_LED_PIN 8 // White LED for "UID Exists but Not Assigned"

MFRC522 mfrc522(SS_PIN, RST_PIN);  // Create MFRC522 instance

// Variables for card scanning and LED control
unsigned long lastActionTime = 0;
const unsigned long ledDelay = 500;  // LED display duration set to 0.5 seconds
unsigned long lastScanTime = 0;
const unsigned long scanCooldown = 800;
bool cardPresent = false;
byte lastUID[10];
byte lastUIDSize = 0;
bool waitingForResponse = false;
unsigned long responseTimeout = 0;
const unsigned long responseDelay = 3000;
bool timeoutExceeded = false;

enum LedState { STANDBY, FOUND, NOT_FOUND, ALREADY_PRESENT, UNASSIGNED, NEW_RESIDENT };
LedState currentLedState = STANDBY;

void setup() {
  Serial.begin(9600);
  while (!Serial);

  SPI.begin();
  mfrc522.PCD_Init();
  Serial.println(F("RFID system initialized. Ready to scan."));

  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(YELLOW_LED_PIN, OUTPUT);
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(BLUE_LED_PIN, OUTPUT);
  pinMode(WHITE_LED_PIN, OUTPUT);

  standbyState();
}

void loop() {
  unsigned long currentTime = millis();

  if (currentTime - lastActionTime > ledDelay && currentLedState != STANDBY) {
    standbyState();
  }

  if (waitingForResponse && (currentTime - responseTimeout > responseDelay)) {
    Serial.println(F("Response timeout exceeded!"));
    userNotFound();
    waitingForResponse = false;
    timeoutExceeded = true;
  }

  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    if (!waitingForResponse && currentTime - lastScanTime > scanCooldown) {
      if (!isSameUID(mfrc522.uid.uidByte, mfrc522.uid.size)) {
        sendUIDToServer();
        waitingForResponse = true;
        responseTimeout = millis();
        saveLastUID(mfrc522.uid.uidByte, mfrc522.uid.size);
        cardPresent = true;
        lastScanTime = millis();
      }
    }
  } else if (cardPresent) {
    cardPresent = false;
    clearLastUID();
    Serial.println(F("Card removed."));
  }

  if (Serial.available() > 0) {
    String response = Serial.readStringUntil('\n');
    response.trim();

    if (response.equals("Resident Found")) {
      userFound();
      waitingForResponse = false;
      timeoutExceeded = false;
    } else if (response.equals("Resident Not Found")) {
      userNotFound();
      waitingForResponse = false;
      timeoutExceeded = false;
    } else if (response.equals("New Resident Created")) {
      newUserCreated();
      waitingForResponse = false;
      timeoutExceeded = false;
    } else if (response.equals("UID Not Assigned")) {
      uidNotAssigned();
      waitingForResponse = false;
      timeoutExceeded = false;
    } else {
      Serial.println(F("Unrecognized response from server."));
    }
  }
}

void sendUIDToServer() {
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) {
      Serial.print("0");
    }
    Serial.print(mfrc522.uid.uidByte[i], HEX);
  }
  Serial.println();
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

// New Resident Created - Green LED
void newUserCreated() {
  turnOffAllLEDs();
  digitalWrite(GREEN_LED_PIN, HIGH);
  Serial.println(F("New Resident Created!"));
  currentLedState = NEW_RESIDENT;
  lastActionTime = millis();
}

// Resident Not Found - Red LED
void userNotFound() {
  turnOffAllLEDs();
  digitalWrite(RED_LED_PIN, HIGH);
  Serial.println(F("Resident Not Found!"));
  currentLedState = NOT_FOUND;
  lastActionTime = millis();
}

// Resident Already Exists - Blue LED
void userFound() {
  turnOffAllLEDs();
  digitalWrite(BLUE_LED_PIN, HIGH);
  Serial.println(F("Resident Already Exists!"));
  currentLedState = ALREADY_PRESENT;
  lastActionTime = millis();
}

// UID Not Assigned - White LED
void uidNotAssigned() {
  turnOffAllLEDs();
  digitalWrite(WHITE_LED_PIN, HIGH);
  Serial.println(F("UID exists but is not assigned. Please assign it."));
  currentLedState = UNASSIGNED;
  lastActionTime = millis();
}

// Standby Mode - Yellow LED
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
  digitalWrite(BLUE_LED_PIN, LOW);
  digitalWrite(WHITE_LED_PIN, LOW);
}
