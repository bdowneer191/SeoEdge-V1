// lib/validateEnv.ts - Environment variable validation utility
export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  client: {
    required: Record<string, boolean>;
    optional: Record<string, boolean>;
    values: Record<string, string | undefined>;
  };
  server: {
    required: Record<string, boolean>;
    optional: Record<string, boolean>;
    values: Record<string, string | undefined>;
  };
  deployment: {
    platform: string;
    environment: string;
    buildTime: string;
  };
}

// Required client-side environment variables
const REQUIRED_CLIENT_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
] as const;

// Optional client-side environment variables
const OPTIONAL_CLIENT_VARS = [
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_USE_AUTH_EMULATOR',
  'NEXT_PUBLIC_USE_FIRESTORE_EMULATOR',
] as const;

// Required server-side environment variables
const REQUIRED_SERVER_VARS = [
  'FIREBASE_ADMIN_SDK_JSON_BASE64',
] as const;

// Optional server-side environment variables
const OPTIONAL_SERVER_VARS = [
  'FIREBASE_PROJECT_ID',
] as const;

function validateFirebaseApiKey(apiKey: string): boolean {
  return apiKey.startsWith('AIza') && apiKey.length > 20;
}

function validateFirebaseAuthDomain(authDomain: string): boolean {
  return authDomain.includes('.firebaseapp.com') || authDomain.includes('.web.app');
}

function validateFirebaseProjectId(projectId: string): boolean {
  return /^[a-z0-9-]+$/.test(projectId) && projectId.length >= 6;
}

function validateBase64ServiceAccount(base64String: string): boolean {
  try {
    const decoded = Buffer.from(base64String, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    return !!(parsed.type && parsed.project_id && parsed.private_key && parsed.client_email);
  } catch {
    return false;
  }
}

export function validateEnvironmentVariables(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Client-side validation
  const clientRequired: Record<string, boolean> = {};
  const clientOptional: Record<string, boolean> = {};
  const clientValues: Record<string, string | undefined> = {};

  // Check required client variables
  for (const varName of REQUIRED_CLIENT_VARS) {
    const value = process.env[varName];
    const hasValue = !!(value && value !== 'undefined' && value.trim() !== '');
    clientRequired[varName] = hasValue;
    clientValues[varName] = value;

    if (!hasValue) {
      errors.push(`Missing required client environment variable: ${varName}`);
    } else {
      // Validate specific formats
      switch (varName) {
        case 'NEXT_PUBLIC_FIREBASE_API_KEY':
          if (!validateFirebaseApiKey(value)) {
            errors.push(`Invalid Firebase API Key format: ${varName}`);
          }
          break;
        case 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN':
          if (!validateFirebaseAuthDomain(value)) {
            errors.push(`Invalid Firebase Auth Domain format: ${varName}`);
          }
          break;
        case 'NEXT_PUBLIC_FIREBASE_PROJECT_ID':
          if (!validateFirebaseProjectId(value)) {
            errors.push(`Invalid Firebase Project ID format: ${varName}`);
          }
          break;
      }
    }
  }

  // Check optional client variables
  for (const varName of OPTIONAL_CLIENT_VARS) {
    const value = process.env[varName];
    const hasValue = !!(value && value !== 'undefined' && value.trim() !== '');
    clientOptional[varName] = hasValue;
    clientValues[varName] = value;

    if (!hasValue) {
      warnings.push(`Optional client environment variable not set: ${varName}`);
    }
  }

  // Server-side validation
  const serverRequired: Record<string, boolean> = {};
  const serverOptional: Record<string, boolean> = {};
  const serverValues: Record<string, string | undefined> = {};

  // Check required server variables
  for (const varName of REQUIRED_SERVER_VARS) {
    const value = process.env[varName];
    const hasValue = !!(value && value !== 'undefined' && value.trim() !== '');
    serverRequired[varName] = hasValue;
    serverValues[varName] = value ? '[HIDDEN]' : undefined;

    if (!hasValue) {
      errors.push(`Missing required server environment variable: ${varName}`);
    } else {
      // Validate specific formats
      switch (varName) {
        case 'FIREBASE_ADMIN_SDK_JSON_BASE64':
          if (!validateBase64ServiceAccount(value)) {
            errors.push(`Invalid Firebase Admin SDK JSON format: ${varName}`);
          }
          break;
      }
    }
  }

  // Check optional server variables
  for (const varName of OPTIONAL_SERVER_VARS) {
    const value = process.env[varName];
    const hasValue = !!(value && value !== 'undefined' && value.trim() !== '');
    serverOptional[varName] = hasValue;
    serverValues[varName] = value;

    if (!hasValue) {
      warnings.push(`Optional server environment variable not set: ${varName}`);
    }
  }

  // Cross-validation
  const clientProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const serverProjectId = process.env.FIREBASE_PROJECT_ID;
  
  if (clientProjectId && serverProjectId && clientProjectId !== serverProjectId) {
    warnings.push(`Project ID mismatch between client (${clientProjectId}) and server (${serverProjectId})`);
  }

  // Deployment info
  const deployment = {
    platform: process.env.VERCEL ? 'Vercel' : process.env.NETLIFY ? 'Netlify' : 'Unknown',
    environment: process.env.NODE_ENV || 'unknown',
    buildTime: new Date().toISOString(),
  };

  const result: EnvValidationResult = {
    valid: errors.length === 0,
    errors,
    warnings,
    client: {
      required: clientRequired,
      optional: clientOptional,
      values: clientValues,
    },
    server: {
      required: serverRequired,
      optional: serverOptional,
      values: serverValues,
    },
    deployment,
  };

  return result;
}

export function logValidationResults(result: EnvValidationResult): void {
  console.log('🔍 Environment Variable Validation Results:');
  console.log(`Environment: ${result.deployment.environment}`);
  console.log(`Platform: ${result.deployment.platform}`);
  console.log(`Build Time: ${result.deployment.buildTime}`);
  
  if (result.valid) {
    console.log('✅ All required environment variables are valid');
  } else {
    console.log('❌ Environment validation failed');
    result.errors.forEach(error => console.error(`  • ${error}`));
  }

  if (result.warnings.length > 0) {
    console.log('⚠️ Warnings:');
    result.warnings.forEach(warning => console.warn(`  • ${warning}`));
  }

  // Log client variables status
  console.log('\n📱 Client Variables:');
  Object.entries(result.client.required).forEach(([key, value]) => {
    console.log(`  ${value ? '✅' : '❌'} ${key}`);
  });

  // Log server variables status
  console.log('\n🖥️ Server Variables:');
  Object.entries(result.server.required).forEach(([key, value]) => {
    console.log(`  ${value ? '✅' : '❌'} ${key}`);
  });
}

// Auto-validate on import
if (typeof window === 'undefined') {
  // Server-side validation
  const result = validateEnvironmentVariables();
  logValidationResults(result);
  
  if (!result.valid) {
    console.error('❌ Critical environment variables are missing. The application may not work properly.');
  }
} else {
  // Client-side validation (delayed to ensure env vars are loaded)
  setTimeout(() => {
    const result = validateEnvironmentVariables();
    logValidationResults(result);
  }, 100);
}

export default validateEnvironmentVariables;
