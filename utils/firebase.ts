up
import { initializeApp } from "firebase/app";
import { getAuth, TwitterAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDQ1IK6lMlA5ZoCubBS_aLjZy0MGz9QoZY",
  authDomain: "focused-beacon-431008-t7.firebaseapp.com",
  projectId: "focused-beacon-431008-t7",
  storageBucket: "focused-beacon-431008-t7.firebasestorage.app",
  messagingSenderId: "597425029317",
  appId: "1:597425029317:web:023f0a6729ca6d90b770ac",
  measurementId: "G-39V00HBCNL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const twitterProvider = new TwitterAuthProvider();

export { auth, db, twitterProvider };
