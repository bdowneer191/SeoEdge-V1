// lib/firebase.ts (improved version)

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

// Debug function to check environment variables
function debugEnvironmentVariables() {
  const required = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  ];

  console.log('=== FIREBASE CONFIG DEBUG ===');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Window defined:', typeof window !== 'undefined');
  
  required.forEach(key => {
    const value = process.env[key];
    console.log(`${key}:`, value ? `SET (${value.substring(0, 8)}...)` : 'MISSING');
  });

  const allNextPublic = Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_'));
  console.log('All NEXT_PUBLIC_ vars:', allNextPublic);
  
  return required.every(key => {
    const value = process.env[key];
    return value && value !== 'undefined' && value.trim() !== '';
  });
}

// Firebase configuration with runtime checks
function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  };
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let initializationError: string | null = null;

// Initialize Firebase only on client side
if (typeof window !== 'undefined') {
  try {
    console.log('🔥 Starting Firebase initialization...');
    
    if (!debugEnvironmentVariables()) {
      throw new Error('Required Firebase environment variables are missing');
    }

    const config = getFirebaseConfig();
    
    // Validate configuration
    if (!config.apiKey || !config.authDomain || !config.projectId) {
      throw new Error('Firebase configuration is incomplete');
    }

    if (getApps().length === 0) {
      console.log('Creating new Firebase app...');
      app = initializeApp(config);
      console.log('✅ Firebase app created successfully');
    } else {
      app = getApp();
      console.log('✅ Using existing Firebase app');
    }

    if (app) {
      auth = getAuth(app);
      console.log('✅ Firebase Auth initialized');
    }

  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    initializationError = error instanceof Error ? error.message : 'Unknown initialization error';
    app = null;
    auth = null;
  }
}

// Helper functions
export function isFirebaseInitialized(): boolean {
  return app !== null && auth !== null && initializationError === null;
}

export function getFirebaseError(): string | null {
  return initializationError;
}

export function getFirebaseStatus() {
  return {
    app: app !== null,
    auth: auth !== null,
    error: initializationError,
    config: typeof window !== 'undefined' ? debugEnvironmentVariables() : false,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    }
  };
}

export { app, auth };
