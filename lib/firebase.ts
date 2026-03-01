import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDQm4EnhIdcrLfT7mJcHUazjptWya6RD2E",
  authDomain: "my-cashflow-app-aacca.firebaseapp.com",
  projectId: "my-cashflow-app-aacca",
  storageBucket: "my-cashflow-app-aacca.firebasestorage.app",
  messagingSenderId: "589313500704",
  appId: "1:589313500704:web:88f314dbbeaa1dd772fe45",
};


// Singleton pattern agar tidak inisialisasi berulang saat hot-reload
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
export { db, auth };