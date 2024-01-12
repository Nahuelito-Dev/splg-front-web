import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBDhrqllXhRBakhsBQ_idpAxkvTe46UAVk",
  authDomain: "main-mind.firebaseapp.com",
  projectId: "main-mind",
  storageBucket: "main-mind.appspot.com",
  messagingSenderId: "819779160644",
  appId: "1:819779160644:web:add3d4c7f4378281748a11"
};

const FirebaseApp = initializeApp(firebaseConfig);
const FirebaseAuth = getAuth(FirebaseApp)

export {
  FirebaseApp,
  FirebaseAuth,
};
