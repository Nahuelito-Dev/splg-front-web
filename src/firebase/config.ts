import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCqXzUXdYtI4R1ZDw88P_gR9QFHqleQ6l8',
  authDomain: 'splg-gas.firebaseapp.com',
  projectId: 'splg-gas',
  storageBucket: 'splg-gas.firebasestorage.app',
  messagingSenderId: '757204810726',
  appId: '1:757204810726:web:11b5a7d5be38c9048f7427',
  measurementId: 'G-F6Y4CKT0LW',
};

const FirebaseApp = initializeApp(firebaseConfig);
const FirebaseAuth = getAuth(FirebaseApp);

export { FirebaseAuth };
