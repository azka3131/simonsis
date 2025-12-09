// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAuDkAs-uklpqCAtyeYuaPQdq59-Q_bB9I",
  authDomain: "simonsis-project.firebaseapp.com",
  projectId: "simonsis-project",
  storageBucket: "simonsis-project.firebasestorage.app",
  messagingSenderId: "833873461728",
  appId: "1:833873461728:web:0c9006a130bab5735c6b85"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);