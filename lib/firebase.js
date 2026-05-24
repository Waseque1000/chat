import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBSxf2alSZDscF4kK1jaZWhLYfwSBLLGKA",
  authDomain: "chat-732ef.firebaseapp.com",
  projectId: "chat-732ef",
  storageBucket: "chat-732ef.firebasestorage.app",
  messagingSenderId: "59115587287",
  appId: "1:59115587287:web:d4b678648315a63ad51292"
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
