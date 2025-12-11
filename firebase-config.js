// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBQziXa7iqh88TnpmvcP-YlD1nttoU_6Nw",
  authDomain: "osc-create-db.firebaseapp.com",
  projectId: "osc-create-db",
  storageBucket: "osc-create-db.firebasestorage.app",
  messagingSenderId: "144652442444",
  appId: "1:144652442444:web:9a69b0eaf35629cf1bcde9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };