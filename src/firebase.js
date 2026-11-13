import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

// Firebase Web configuration is a public client configuration, not a server secret.
// Apply HTTP-referrer restrictions to the API key before deploying the public site.
const firebaseConfig = {
  apiKey: "AIzaSyDDG3GkMoTgMKxEwAu0osaDr-xg87IyQfU",
  authDomain: "vexora-labs-crm-798fe.firebaseapp.com",
  projectId: "vexora-labs-crm-798fe",
  storageBucket: "vexora-labs-crm-798fe.firebasestorage.app",
  messagingSenderId: "912708185959",
  appId: "1:912708185959:web:16875dd237ddda900d09c2",
  measurementId: "G-LDVQT33RP8"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: "select_account" });

export const authReady = setPersistence(auth, browserLocalPersistence);