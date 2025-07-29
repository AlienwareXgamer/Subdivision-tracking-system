
# RFID-Based Resident Management Backend System

## Project Overview
This project is a backend system designed to interface with Arduino and MFRC522 RFID readers for managing resident access in a gated subdivision. The system uses Node.js to communicate between Firebase and Arduino devices, enabling real-time RFID-based resident tracking and management. The system supports RFID assignment, scanning, and logging.

## Key Features
- **RFID Assignment**:
  - Assign RFID cards to residents using a dedicated `Assign` Arduino setup.
  - Provides visual feedback with LEDs for status updates during the assignment process.
- **RFID Scanning**:
  - Reads RFID UIDs and verifies data against Firebase in real time.
  - Logs each scan for auditing purposes.
- **LED Status Feedback**:
  - Walk-in/Walk-out and Vehicle Entry/Exit:
    - **Blue LED**: System in standby mode (updated due to soldering issues).
    - **Green LED**: Resident found and granted access.
    - **Red LED**: Resident not found or access denied.
    - **White LED**: UID exists but is not assigned.
  - Assign Setup:
    - **Yellow LED**: System in standby mode.
    - **Green LED**: New resident created successfully.
    - **Red LED**: Resident not found.
    - **Blue LED**: Resident already assigned.
    - **White LED**: UID exists but is not assigned.
- **Cooldown Mechanism**:
  - Implements a cooldown of 0.8 seconds between scans to prevent duplicate readings.
- **Timeout Handling**:
  - A 3-second timeout for server responses ensures robust communication between the backend and RFID hardware.

## Hardware Setup
### Assign Arduino Setup
- **Components**:
  - Arduino UNO
  - MFRC522 RFID reader
  - LEDs (Yellow, Green, Red, Blue, White)
- **Installation**:
  - Enclosed in a protective case and connected to the guardhouse computer via LAN cable.

### Walk-in/Walk-out and Vehicle Entry/Exit Setup
- **Components**:
  - Arduino UNO
  - MFRC522 RFID reader
  - LEDs (Blue, Green, Red, White)
- **Installation**:
  - Two RFID readers are installed at the walk-in/walk-out gate.
  - One RFID reader is installed at the vehicle entry gate on the guardhouse wall.
  - One RFID reader is installed at the vehicle exit gate on the opposite side of the guardhouse.
  - Enclosures are securely mounted to walls and connected to the guardhouse computer via LAN cables.

## Setup Instructions
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/AlienwareXgamer/CAPSTONE-2-RFID.git
   cd CAPSTONE-2-RFID
   ```

2. **Install Dependencies**:
   - For the Node.js backend (`rfid-server`):
     ```bash
     cd rfid-server
     npm install
     ```

3. **Upload Arduino Code**:
   - Use the Arduino IDE to upload the appropriate code to each Arduino device:
     - `assign_rfid.ino` for the Assign Setup.
     - `scanner_rfid.ino` for Walk-in/Walk-out and Vehicle Entry/Exit setups.

4. **Running the Backend Server**:
   ```bash
   cd rfid-server
   node server.js
   ```

5. **Database Configuration**:
   - Ensure Firebase is configured correctly with collections for residents, logs, and RFID statuses.

## Updated Features
- **Blue LED**: Replaced Yellow LED in Walk-in/Walk-out and Vehicle Entry/Exit setups for standby mode due to hardware constraints.
- **Separate Hardware Setup**: Dedicated setup for RFID Assignment and Scanning with different LED configurations.
- **Improved Feedback**: Enhanced logging for unrecognized responses and timeouts for debugging.

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Contribution
Contributions are welcome! Feel free to submit a Pull Request or open an issue.

## Authors
- **Francis Allen Prado** - Initial work and enhancements - 
- **Kharhyll Joy Laranio ** - Front End and firebase Developer - 
[AlienwareXgamer](https://github.com/AlienwareXgamer)

# CAPSTONE-2-RFID
