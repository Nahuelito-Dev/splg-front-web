import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBMiee50UnqaLK2jG7Gej6vLjQYlEJv2Zo",
  authDomain: "gearth-back.firebaseapp.com",
  projectId: "gearth-back",
  storageBucket: "gearth-back.firebasestorage.app",
  messagingSenderId: "223685557402",
  appId: "1:223685557402:web:719275bdb7fd4fff5db323",
  measurementId: "G-RL8LCQK2JB"
};

const FirebaseApp = initializeApp(firebaseConfig);
const FirebaseAuth = getAuth(FirebaseApp)

export {
  FirebaseApp,
  FirebaseAuth,
};
