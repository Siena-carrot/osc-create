// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD4FU7ut01PC4lYdJz__MbsWwyZskMo7cQ",
  authDomain: "osc-create-db-db584.firebaseapp.com",
  projectId: "osc-create-db-db584",
  storageBucket: "osc-create-db-db584.firebasestorage.app",
  messagingSenderId: "156584096190",
  appId: "1:156584096190:web:489b231e9cc3d0f7a209ef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };