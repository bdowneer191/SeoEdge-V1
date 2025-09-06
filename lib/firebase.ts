// lib/firebase.ts

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

// Fallback configuration - useful for debugging
const getEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value || value === 'undefined' || value === '') {
    console.error(`Environment variable ${key} is missing or empty`);
    console.error(`Available env keys:`, Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')));
    return '';
  }
  return value;
};

const firebaseConfig = {
  apiKey: getEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: getEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
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
    const value = process.env[key];
    if (!value || value === 'undefined' || value === '') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('Firebase Config Validation Failed');
    console.error('Missing or invalid environment variables:', missing);
    console.error('Current environment variables:');
    for (const key of required) {
      const value = process.env[key];
      console.error(`${key}: ${value ? '[SET]' : '[MISSING]'} - Value: ${value ? `${value.substring(0, 10)}...` : 'undefined'}`);
    }
    console.error('NODE_ENV:', process.env.NODE_ENV);
    console.error('Build time env check - all NEXT_PUBLIC vars:');
    Object.keys(process.env)
      .filter(key => key.startsWith('NEXT_PUBLIC_'))
      .forEach(key => {
        console.error(`${key}: ${process.env[key] ? 'SET' : 'MISSING'}`);
      });
    return false;
  }

  console.log('✅ Firebase config validation passed');
  return true;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

// More robust initialization with better error handling
if (typeof window !== 'undefined') {
  try {
    console.log('🔥 Initializing Firebase on client...');
    console.log('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });

    if (validateConfig()) {
      // Check if app already exists
      if (!getApps().length) {
        console.log('Initializing Firebase app...');
        app = initializeApp(firebaseConfig);
        console.log('✅ Firebase app initialized successfully');
      } else {
        app = getApp();
        console.log('✅ Using existing Firebase app');
      }
      
      // Initialize auth only after app is ready
      if (app) {
        auth = getAuth(app);
        console.log('✅ Firebase Auth initialized successfully');
      }
    } else {
      console.error('❌ Firebase configuration validation failed. App will not function properly.');
      // Don't set app/auth to null here, leave them as null to indicate failure
    }
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
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
    config: validateConfig(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    }
  };
}
