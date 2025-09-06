// lib/firebase.ts (improved version with better error handling)

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, connectAuthEmulator } from 'firebase/auth';

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
  
  const missingVars: string[] = [];
  required.forEach(key => {
    const value = process.env[key];
    if (!value || value === 'undefined' || value.trim() === '') {
      missingVars.push(key);
    }
    console.log(`${key}:`, value ? `SET (${value.substring(0, 8)}...)` : 'MISSING');
  });

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    return false;
  }

  console.log('✅ All required environment variables are set');
  return true;
}

// Firebase configuration with validation
function getFirebaseConfig() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  };

  // Validate required fields
  if (!config.apiKey || !config.authDomain || !config.projectId) {
    throw new Error('Firebase configuration is incomplete. Missing required fields.');
  }

  return config;
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let initializationError: string | null = null;
let initializationAttempted = false;

// Initialize Firebase with better error handling
function initializeFirebase() {
  if (initializationAttempted) {
    return { app, auth, error: initializationError };
  }

  initializationAttempted = true;

  // Only initialize on client side
  if (typeof window === 'undefined') {
    console.log('⚠️ Skipping Firebase initialization on server side');
    return { app: null, auth: null, error: null };
  }

  try {
    console.log('🔥 Starting Firebase initialization...');
    
    if (!debugEnvironmentVariables()) {
      throw new Error('Required Firebase environment variables are missing or invalid');
    }

    const config = getFirebaseConfig();
    console.log('📝 Firebase config validated');

    // Check if app already exists
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

      // Connect to auth emulator in development (optional)
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_AUTH_EMULATOR === 'true') {
        try {
          connectAuthEmulator(auth, 'http://localhost:9099');
          console.log('🔧 Connected to Auth emulator');
        } catch (emulatorError) {
          console.warn('⚠️ Could not connect to Auth emulator:', emulatorError);
        }
      }
    }

    initializationError = null;
    return { app, auth, error: null };

  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    initializationError = error instanceof Error ? error.message : 'Unknown initialization error';
    app = null;
    auth = null;
    return { app: null, auth: null, error: initializationError };
  }
}

// Initialize immediately when module loads (client-side only)
if (typeof window !== 'undefined') {
  initializeFirebase();
}

// Helper functions
export function isFirebaseInitialized(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Try to initialize if not attempted yet
  if (!initializationAttempted) {
    initializeFirebase();
  }
  
  return app !== null && auth !== null && initializationError === null;
}

export function getFirebaseError(): string | null {
  return initializationError;
}

export function getFirebaseStatus() {
  const status = {
    app: app !== null,
    auth: auth !== null,
    error: initializationError,
    attempted: initializationAttempted,
    isClient: typeof window !== 'undefined',
    config: typeof window !== 'undefined' ? debugEnvironmentVariables() : false,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    }
  };

  console.log('Firebase Status Check:', status);
  return status;
}

// Force re-initialization (useful for debugging)
export function reinitializeFirebase() {
  initializationAttempted = false;
  app = null;
  auth = null;
  initializationError = null;
  return initializeFirebase();
}

export { app, auth };
