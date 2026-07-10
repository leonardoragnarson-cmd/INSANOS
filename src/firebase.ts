import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDyPEHCQNR4Q7qloUBl3kj8kM_ZfB3s8do",
  authDomain: "eventos-insanos.firebaseapp.com",
  projectId: "eventos-insanos",
  storageBucket: "eventos-insanos.firebasestorage.app",
  messagingSenderId: "23320521930",
  appId: "1:23320521930:web:edd403f19e0c43a9021833",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);