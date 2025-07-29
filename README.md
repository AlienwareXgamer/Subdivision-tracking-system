# CAPSTONE RFID Tracking System

---

## Overview
The **CAPSTONE RFID Tracking System** is a cutting-edge solution tailored for residential subdivision security. By leveraging **RFID** and **QR code technologies**, the system ensures efficient management and monitoring of vehicle and pedestrian access.

---

## Features

- **RFID Integration**: Seamlessly tracks vehicle and pedestrian entry and exit using RFID technology.
- **QR Code Support**: Offers an alternative access method for guests and residents.
- **Real-time Monitoring**: Provides up-to-date tracking of all activities for enhanced security.
- **Firebase Integration**: Utilizes Firebase for robust database management and secure authentication.

---

## Folder Structure

```
CAPSTONE RFID/
├── granville-tracking-system-Backend/
│   ├── Arduino Code/
│   │   ├── Assign_RFID_ardruino_nano.ino
│   │   ├── Vehicle_entry_rfid_code.ino
│   │   ├── Vehicle_exit_rfid_code.ino
│   │   ├── walk_in_entry_rfid_code.ino
│   │   └── walk_out_exit_rfid_code.ino
│   ├── rfid-server/
│   │   ├── itcapstonerfidandqr-firebase-adminsdk-t8j04-4aae5248fd.json
│   │   ├── package.json
│   │   ├── server.js
│   │   ├── serverdebugging.js
│   │   └── serverfixing.js
├── granville-tracking-system-Main/
│   ├── public/
│   │   ├── favicon.ico
│   │   └── index.html
│   ├── src/
│   │   ├── App.vue
│   │   ├── firebase.js
│   │   └── ...
│   ├── package.json
│   ├── README.md
│   └── vue.config.js
└── RFID-Tracking-System.code-workspace
```

---

## Technologies Used

### Backend
- **Node.js**: For server-side scripting.
- **Firebase**: For database and authentication.
- **Arduino**: For hardware integration with RFID systems.

### Frontend
- **Vue.js**: For building the user interface.
- **JavaScript**: For client-side scripting.
- **HTML/CSS**: For structuring and styling the web pages.

---

## How to Use

### Backend
1. Navigate to the `granville-tracking-system-Backend/rfid-server` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   node server.js
   ```

### Frontend
1. Navigate to the `granville-tracking-system-Main` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run serve
   ```

---

## License
This project is licensed under the **MIT License**. See the `LICENSE` file for details.

---

## Contributors
- **Francis Allen Prado** - Backend Developer
- **Kharhyll Joy Laranio** - Frontend Developer

---

## Acknowledgments
Special thanks to the mentors and organizations that supported this project. Your guidance and resources were invaluable in bringing this project to life.
