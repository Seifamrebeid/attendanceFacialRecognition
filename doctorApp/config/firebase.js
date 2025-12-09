// Firebase Configuration and Initialization
// This file sets up the Firebase connection for the mobile app

import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Firebase configuration
// TODO: Replace with your Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyDBZM8HBPab446i5eyLrCNbh_JBPIjCff0",
  authDomain: "seifs-digital-portfolio.firebaseapp.com",
  projectId: "seifs-digital-portfolio",
  storageBucket: "seifs-digital-portfolio.firebasestorage.app",
  messagingSenderId: "275813397197",
  appId: "1:275813397197:web:2c681f271157fe00352f84",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage for persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize Firestore
export const db = getFirestore(app);

export default app;
