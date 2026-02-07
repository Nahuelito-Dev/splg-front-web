import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: 'AIzaSyDm6G6Fx3qXaIbxrjrsTrOmfcd0pULWX_E',
  authDomain: 'jennigas-55f69.firebaseapp.com',
  projectId: 'jennigas-55f69',
  storageBucket: 'jennigas-55f69.firebasestorage.app',
  messagingSenderId: '175861123393',
  appId: '1:175861123393:web:2cfa9183151df4f60ef9c0',
  measurementId: 'G-49Z1M57P9B',
};

const FirebaseApp = initializeApp(firebaseConfig);
const FirebaseAuth = getAuth(FirebaseApp)

export {
  FirebaseApp,
  FirebaseAuth,
};
