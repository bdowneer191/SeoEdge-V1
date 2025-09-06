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

// More detailed validation with better error messages
function validateConfig() {
  const required = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  ];

  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key] || process.env[key] === 'undefined' || process.env[key] === '') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('Firebase Config Validation Failed');
    console.error('Missing or invalid environment variables:', missing);
    console.error('Current environment variables:');
    for (const key of required) {
      console.error(`${key}: ${process.env[key] ? '[SET]' : '[MISSING]'}`);
    }
    return false;
  }

  return true;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

// More robust initialization with better error handling
if (typeof window !== 'undefined') {
  try {
    if (validateConfig()) {
      // Check if app already exists
      if (!getApps().length) {
        console.log('Initializing Firebase app...');
        app = initializeApp(firebaseConfig);
        console.log('Firebase app initialized successfully');
      } else {
        app = getApp();
        console.log('Using existing Firebase app');
      }
      
      // Initialize auth only after app is ready
      if (app) {
        auth = getAuth(app);
        console.log('Firebase Auth initialized successfully');
      }
    } else {
      console.error('Firebase configuration validation failed. App will not function properly.');
      // Don't set app/auth to null here, leave them as null to indicate failure
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
    app = null;
    auth = null;
  }
}

// Export with safety checks
export { app, auth };

// Helper function to check if Firebase is properly initialized
export function isFirebaseInitialized(): boolean {
  return app !== null && auth !== null;
}

// Helper function to get initialization status
export function getFirebaseStatus() {
  return {
    app: app !== null,
    auth: auth !== null,
    config: validateConfig()
  };
}
