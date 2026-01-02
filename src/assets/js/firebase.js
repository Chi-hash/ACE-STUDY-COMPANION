// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBDkfhO_MEcyoMSWYhzUHwlf7GVCe0WVo4",
  authDomain: "ace-the-tutor.firebaseapp.com",
  projectId: "ace-the-tutor",
  storageBucket: "ace-the-tutor.firebasestorage.app",
  messagingSenderId: "684672667174",
  appId: "1:684672667174:web:c3909c3f99774e6364e0e7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);