// lib/firebase.ts - Completely rewritten with better error handling
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';

// Type definitions
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

interface FirebaseStatus {
  initialized: boolean;
  error: string | null;
  config: boolean;
  environment: string;
  timestamp: number;
}

// Global state
let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;
let initializationStatus: FirebaseStatus = {
  initialized: false,
  error: null,
  config: false,
  environment: typeof window !== 'undefined' ? 'client' : 'server',
  timestamp: Date.now()
};

// Debug logging
function log(message: string, data?: any) {
  console.log(`🔥 Firebase: ${message}`, data || '');
}

function logError(message: string, error?: any) {
  console.error(`❌ Firebase Error: ${message}`, error || '');
}

// Validate and get Firebase configuration
function getValidFirebaseConfig(): FirebaseConfig | null {
  // Only run on client side
  if (typeof window === 'undefined') {
    log('Skipping config validation on server side');
    return null;
  }

  log('Validating Firebase configuration...');
  
  // Get environment variables
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  // Debug all environment variables
  log('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    apiKey: config.apiKey ? '✅ SET' : '❌ MISSING',
    authDomain: config.authDomain ? '✅ SET' : '❌ MISSING',
    projectId: config.projectId ? '✅ SET' : '❌ MISSING',
    storageBucket: config.storageBucket ? '✅ SET' : '⚠️ OPTIONAL',
    messagingSenderId: config.messagingSenderId ? '✅ SET' : '⚠️ OPTIONAL',
    appId: config.appId ? '✅ SET' : '⚠️ OPTIONAL',
  });

  // Check required fields
  const requiredFields = ['apiKey', 'authDomain', 'projectId'];
  const missingFields = requiredFields.filter(field => !config[field as keyof typeof config]);

  if (missingFields.length > 0) {
    const error = `Missing required Firebase environment variables: ${missingFields.join(', ')}`;
    logError(error);
    initializationStatus.error = error;
    return null;
  }

  // Validate field formats
  if (!config.apiKey?.startsWith('AIza')) {
    const error = 'Invalid Firebase API key format';
    logError(error);
    initializationStatus.error = error;
    return null;
  }

  if (!config.authDomain?.includes('.firebaseapp.com')) {
    const error = 'Invalid Firebase auth domain format';
    logError(error);
    initializationStatus.error = error;
    return null;
  }

  log('✅ Configuration validation passed');
  return config as FirebaseConfig;
}

// Initialize Firebase
function initializeFirebaseApp(): boolean {
  try {
    // Skip server-side initialization
    if (typeof window === 'undefined') {
      log('Skipping initialization on server side');
      return false;
    }

    log('Starting Firebase initialization...');

    // Get and validate config
    const config = getValidFirebaseConfig();
    if (!config) {
      return false;
    }

    // Check if already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
      log('Using existing Firebase app');
      firebaseApp = existingApps[0];
    } else {
      log('Creating new Firebase app...');
      firebaseApp = initializeApp(config);
      log('✅ Firebase app created successfully');
    }

    // Initialize Auth
    if (firebaseApp) {
      firebaseAuth = getAuth(firebaseApp);
      log('✅ Firebase Auth initialized');

      // Initialize Firestore
      firebaseDb = getFirestore(firebaseApp);
      log('✅ Firestore initialized');

      // Connect to emulators in development
      if (process.env.NODE_ENV === 'development') {
        // Auth emulator
        if (process.env.NEXT_PUBLIC_USE_AUTH_EMULATOR === 'true') {
          try {
            connectAuthEmulator(firebaseAuth, 'http://localhost:9099', { disableWarnings: true });
            log('🔧 Connected to Auth emulator');
          } catch (emulatorError) {
            log('⚠️ Could not connect to Auth emulator (this is usually fine)', emulatorError);
          }
        }

        // Firestore emulator
        if (process.env.NEXT_PUBLIC_USE_FIRESTORE_EMULATOR === 'true') {
          try {
            connectFirestoreEmulator(firebaseDb, 'localhost', 8080);
            log('🔧 Connected to Firestore emulator');
          } catch (emulatorError) {
            log('⚠️ Could not connect to Firestore emulator (this is usually fine)', emulatorError);
          }
        }
      }

      // Update status
      initializationStatus = {
        initialized: true,
        error: null,
        config: true,
        environment: 'client',
        timestamp: Date.now()
      };

      log('🎉 Firebase initialization completed successfully');
      return true;
    }

    return false;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
    logError('Initialization failed', error);
    
    initializationStatus = {
      initialized: false,
      error: errorMessage,
      config: false,
      environment: 'client',
      timestamp: Date.now()
    };

    return false;
  }
}

// Auto-initialize on client side
if (typeof window !== 'undefined') {
  // Use a small delay to ensure environment variables are loaded
  setTimeout(() => {
    initializeFirebaseApp();
  }, 100);
}

// Export functions
export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseApp && typeof window !== 'undefined') {
    initializeFirebaseApp();
  }
  return firebaseApp;
}

export function getFirebaseAuth(): Auth | null {
  if (!firebaseAuth && typeof window !== 'undefined') {
    initializeFirebaseApp();
  }
  return firebaseAuth;
}

export function getFirebaseDb(): Firestore | null {
  if (!firebaseDb && typeof window !== 'undefined') {
    initializeFirebaseApp();
  }
  return firebaseDb;
}

export function isFirebaseReady(): boolean {
  return initializationStatus.initialized && firebaseApp !== null && firebaseAuth !== null && firebaseDb !== null;
}

export function getFirebaseStatus(): FirebaseStatus & {
  hasApp: boolean;
  hasAuth: boolean;
  hasDb: boolean;
  envVars: Record<string, boolean>;
} {
  return {
    ...initializationStatus,
    hasApp: firebaseApp !== null,
    hasAuth: firebaseAuth !== null,
    hasDb: firebaseDb !== null,
    envVars: {
      NEXT_PUBLIC_FIREBASE_API_KEY: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }
  };
}

export function reinitializeFirebase(): boolean {
  log('Forcing Firebase reinitialization...');
  
  // Reset state
  firebaseApp = null;
  firebaseAuth = null;
  firebaseDb = null;
  initializationStatus = {
    initialized: false,
    error: null,
    config: false,
    environment: typeof window !== 'undefined' ? 'client' : 'server',
    timestamp: Date.now()
  };

  // Reinitialize
  return initializeFirebaseApp();
}

// Legacy exports for backward compatibility
export const app = firebaseApp;
export const auth = firebaseAuth;
export const db = firebaseDb;

// Legacy function exports for backward compatibility
export const isFirebaseInitialized = isFirebaseReady;
export const getFirebaseError = () => getFirebaseStatus().error;

// Export default
export default {
  getApp: getFirebaseApp,
  getAuth: getFirebaseAuth,
  getDb: getFirebaseDb,
  isReady: isFirebaseReady,
  getStatus: getFirebaseStatus,
  reinitialize: reinitializeFirebase
};
