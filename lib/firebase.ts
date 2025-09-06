// lib/firebase.ts

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate configuration
function validateConfig() {
  const required = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      console.error(`Missing Firebase config: ${key}`);
      return false;
    }
  }
  return true;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

// Only initialize on client side with valid config
if (typeof window !== 'undefined' && validateConfig()) {
  try {
    // Check if app already exists
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    
    // Initialize auth only after app is ready
    if (app) {
      auth = getAuth(app);
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
    app = null;
    auth = null;
  }
}

export { app, auth };
