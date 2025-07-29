// src/firebase.js

import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAvXUtVtYjR1duNVeQQB2PhIzy_E2f6kQM",
  authDomain: "itcapstonerfidandqr.firebaseapp.com",
  projectId: "itcapstonerfidandqr",
  storageBucket: "itcapstonerfidandqr.appspot.com",
  messagingSenderId: "519283940202",
  appId: "1:519283940202:web:b716bceb1c080d0af46313",
  measurementId: "G-3G53R9FKE5",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app);

// Set persistence
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error setting persistence:", error);
});

export { auth, db, storage };
