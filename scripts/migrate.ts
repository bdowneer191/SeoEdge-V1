import { initializeFirebaseAdmin } from '../lib/firebaseAdmin';
import { migratePagesWithInvalidIds } from '../utils/urlSanitizer';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

async function run() {
  if (!process.env.FIREBASE_ADMIN_SDK_JSON_BASE64) {
    console.error('FIREBASE_ADMIN_SDK_JSON_BASE64 env variable not set.');
    console.error('Please ensure it is set in your .env.local file or as an environment variable.');
    process.exit(1);
  }

  console.log('Running migration to fix invalid document IDs...');
  try {
    const firestore = initializeFirebaseAdmin();
    await migratePagesWithInvalidIds(firestore);
    console.log('Migration script finished successfully.');
  } catch (error) {
    console.error('Migration script failed:', error);
    process.exit(1);
  }
}

run();
