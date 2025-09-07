/**
 * Environment configuration validation and loading
 * This should be imported early in your app to ensure proper env var loading
 */

export interface EnvConfig {
  // Firebase Client Config (NEXT_PUBLIC_* variables)
  firebase: {
    apiKey: string | undefined;
    authDomain: string | undefined;
    projectId: string | undefined;
    storageBucket: string | undefined;
    messagingSenderId: string | undefined;
    appId: string | undefined;
  };

  // Firebase Admin Config (server-only variables)
  firebaseAdmin: {
    serviceAccountBase64: string | undefined;
    projectId: string | undefined;
  };

  // Environment info
  nodeEnv: string;
  isDev: boolean;
  isProd: boolean;
  isClient: boolean;
  isServer: boolean;
}

function getEnvConfig(): EnvConfig {
  return {
    firebase: {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },

    firebaseAdmin: {
      serviceAccountBase64: process.env.FIREBASE_ADMIN_SDK_JSON_BASE64,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    },

    nodeEnv: process.env.NODE_ENV || 'development',
    isDev: process.env.NODE_ENV === 'development',
    isProd: process.env.NODE_ENV === 'production',
    isClient: typeof window !== 'undefined',
    isServer: typeof window === 'undefined',
  };
}

export const envConfig = getEnvConfig();

/**
 * Validate required environment variables
 */
export function validateEnvConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required Firebase client variables
  const requiredFirebaseVars = [
    { key: 'NEXT_PUBLIC_FIREBASE_API_KEY', value: envConfig.firebase.apiKey },
    { key: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', value: envConfig.firebase.authDomain },
    { key: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', value: envConfig.firebase.projectId },
  ];

  for (const { key, value } of requiredFirebaseVars) {
    if (!value || value.trim() === '') {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // Validate Firebase API key format
  if (envConfig.firebase.apiKey && !envConfig.firebase.apiKey.startsWith('AIza')) {
    errors.push('NEXT_PUBLIC_FIREBASE_API_KEY appears to have invalid format (should start with "AIza")');
  }

  // Validate Auth Domain format
  if (envConfig.firebase.authDomain && !envConfig.firebase.authDomain.includes('.firebaseapp.com')) {
    errors.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN appears to have invalid format (should include ".firebaseapp.com")');
  }

  // Check optional variables
  if (!envConfig.firebase.storageBucket) {
    warnings.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set (optional but recommended)');
  }

  if (!envConfig.firebase.appId) {
    warnings.push('NEXT_PUBLIC_FIREBASE_APP_ID is not set (optional but recommended)');
  }

  // Server-side validation (only on server)
  if (envConfig.isServer) {
    if (!envConfig.firebaseAdmin.serviceAccountBase64) {
      warnings.push('FIREBASE_ADMIN_SDK_JSON_BASE64 is not set (required for server-side operations)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Log environment configuration status
 */
export function logEnvStatus(): void {
  const validation = validateEnvConfig();

  console.log('🔧 Environment Configuration:');
  console.log('  Node Environment:', envConfig.nodeEnv);
  console.log('  Context:', envConfig.isClient ? 'Client' : 'Server');

  console.log('  Firebase Config:');
  console.log('    API Key:', envConfig.firebase.apiKey ? '✅ Set' : '❌ Missing');
  console.log('    Auth Domain:', envConfig.firebase.authDomain ? '✅ Set' : '❌ Missing');
  console.log('    Project ID:', envConfig.firebase.projectId ? '✅ Set' : '❌ Missing');
  console.log('    Storage Bucket:', envConfig.firebase.storageBucket ? '✅ Set' : '⚠️ Not set');
  console.log('    App ID:', envConfig.firebase.appId ? '✅ Set' : '⚠️ Not set');

  if (envConfig.isServer) {
    console.log('  Firebase Admin:');
    console.log('    Service Account:', envConfig.firebaseAdmin.serviceAccountBase64 ? '✅ Set' : '❌ Missing');
  }

  if (validation.errors.length > 0) {
    console.error('❌ Environment Errors:');
    validation.errors.forEach(error => console.error(`   ${error}`));
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️ Environment Warnings:');
    validation.warnings.forEach(warning => console.warn(`   ${warning}`));
  }

  if (validation.valid) {
    console.log('✅ Environment configuration is valid');
  } else {
    console.error('❌ Environment configuration has errors');
  }
}

// Auto-log on import in development
if (envConfig.isDev) {
  logEnvStatus();
}

export default envConfig;
