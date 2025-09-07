// lib/firebaseAdmin.ts - Improved server-side Firebase admin configuration
import * as admin from 'firebase-admin';
import { Buffer } from 'node:buffer';

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

// Global admin instances
let adminApp: admin.app.App | null = null;
let adminDb: admin.firestore.Firestore | null = null;
let adminAuth: admin.auth.Auth | null = null;

function log(message: string, data?: any) {
  console.log(`🔥 Firebase Admin: ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

function logError(message: string, error?: any) {
  console.error(`❌ Firebase Admin Error: ${message}`, error);
}

function validateServiceAccount(serviceAccount: any): serviceAccount is ServiceAccount {
  const requiredFields = [
    'type',
    'project_id',
    'private_key_id',
    'private_key',
    'client_email',
    'client_id',
    'auth_uri',
    'token_uri',
    'auth_provider_x509_cert_url',
    'client_x509_cert_url'
  ];

  for (const field of requiredFields) {
    if (!serviceAccount[field]) {
      logError(`Missing required field in service account: ${field}`);
      return false;
    }
  }

  // Validate specific fields
  if (!serviceAccount.private_key.includes('BEGIN PRIVATE KEY')) {
    logError('Invalid private key format in service account');
    return false;
  }

  if (!serviceAccount.client_email.includes('@') || !serviceAccount.client_email.includes('.gserviceaccount.com')) {
    logError('Invalid client email format in service account');
    return false;
  }

  return true;
}

function initializeAdmin(): boolean {
  try {
    // Check if already initialized
    if (adminApp) {
      log('Admin already initialized, reusing existing instance');
      return true;
    }

    // Check for existing apps
    if (admin.apps.length > 0) {
      log('Using existing admin app');
      adminApp = admin.apps[0];
      adminDb = admin.firestore(adminApp);
      adminAuth = admin.auth(adminApp);
      return true;
    }

    log('Starting Firebase Admin initialization...');

    // Get and validate environment variables
    const serviceAccountBase64 = process.env.FIREBASE_ADMIN_SDK_JSON_BASE64;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

    if (!serviceAccountBase64) {
      throw new Error('FIREBASE_ADMIN_SDK_JSON_BASE64 environment variable is not set');
    }

    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is not set');
    }

    log('Environment variables found, decoding service account...');

    // Decode and parse service account
    let serviceAccountJson: string;
    try {
      serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
    } catch (error) {
      throw new Error('Failed to decode base64 service account. Please check the FIREBASE_ADMIN_SDK_JSON_BASE64 environment variable.');
    }

    let serviceAccount: ServiceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (error) {
      throw new Error('Failed to parse service account JSON. Please check the format of your service account.');
    }

    // Validate service account
    if (!validateServiceAccount(serviceAccount)) {
      throw new Error('Service account validation failed');
    }

    // Verify project ID matches
    if (serviceAccount.project_id !== projectId) {
      logError(`Project ID mismatch: service account has ${serviceAccount.project_id}, environment has ${projectId}`);
      // Don't throw error, but warn about potential issues
      log('⚠️ Project ID mismatch detected, proceeding anyway...');
    }

    log(`Initializing admin for project: ${serviceAccount.project_id}`);

    // Initialize admin app
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    // Initialize services
    adminDb = admin.firestore(adminApp);
    adminAuth = admin.auth(adminApp);

    // Configure Firestore settings
    adminDb.settings({
      ignoreUndefinedProperties: true,
    });

    log('✅ Firebase Admin initialized successfully');
    log(`Project ID: ${serviceAccount.project_id}`);
    log(`Client Email: ${serviceAccount.client_email}`);

    return true;
  } catch (error) {
    logError('Failed to initialize Firebase Admin', error);
    
    // Clean up partial initialization
    adminApp = null;
    adminDb = null;
    adminAuth = null;
    
    throw error;
  }
}

// Auto-initialize (server-side only)
if (typeof window === 'undefined') {
  try {
    initializeAdmin();
  } catch (error) {
    logError('Auto-initialization failed', error);
  }
}

// Export functions
export function getAdminApp(): admin.app.App {
  if (!adminApp) {
    if (!initializeAdmin()) {
      throw new Error('Failed to initialize Firebase Admin');
    }
  }
  return adminApp!;
}

export function getAdminDb(): admin.firestore.Firestore {
  if (!adminDb) {
    if (!initializeAdmin()) {
      throw new Error('Failed to initialize Firebase Admin');
    }
  }
  return adminDb!;
}

export function getAdminAuth(): admin.auth.Auth {
  if (!adminAuth) {
    if (!initializeAdmin()) {
      throw new Error('Failed to initialize Firebase Admin');
    }
  }
  return adminAuth!;
}

export function isAdminInitialized(): boolean {
  return adminApp !== null && adminDb !== null && adminAuth !== null;
}

export function getAdminStatus() {
  return {
    initialized: isAdminInitialized(),
    hasApp: adminApp !== null,
    hasDb: adminDb !== null,
    hasAuth: adminAuth !== null,
    projectId: adminApp?.options?.projectId || null,
    totalApps: admin.apps.length,
    environment: {
      hasServiceAccount: !!process.env.FIREBASE_ADMIN_SDK_JSON_BASE64,
      hasProjectId: !!(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID),
      isServer: typeof window === 'undefined',
    }
  };
}

// Legacy export for backward compatibility
export function initializeFirebaseAdmin(): admin.firestore.Firestore {
  return getAdminDb();
}

// Default export
export default {
  getApp: getAdminApp,
  getDb: getAdminDb,
  getAuth: getAdminAuth,
  isInitialized: isAdminInitialized,
  getStatus: getAdminStatus,
};
