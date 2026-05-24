import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB63aYv7tTWvJoRXUD3A9R_m4OGNXPcUwg",
  authDomain: "rest-control-a1a56.firebaseapp.com",
  projectId: "rest-control-a1a56",
  storageBucket: "rest-control-a1a56.firebasestorage.app",
  messagingSenderId: "322368325909",
  appId: "1:322368325909:web:d43c14ff5ef9b744e5c11c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
