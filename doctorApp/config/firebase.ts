// Firebase Configuration for Mobile App
// Update these values with your Firebase project credentials

import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDBZM8HBPab446i5eyLrCNbh_JBPIjCff0",
    authDomain: "seifs-digital-portfolio.firebaseapp.com",
    projectId: "seifs-digital-portfolio",
    storageBucket: "seifs-digital-portfolio.firebasestorage.app",
    messagingSenderId: "275813397197",
    appId: "1:275813397197:web:86faa292474a51f9352f84"
};

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use long polling for consistent connection
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});

export default app;
