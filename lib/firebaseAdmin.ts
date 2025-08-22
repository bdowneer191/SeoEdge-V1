import * as admin from 'firebase-admin';
import { Buffer } from 'node:buffer';

export function initializeFirebaseAdmin(): admin.firestore.Firestore {
  if (admin.apps.length) {
    return admin.firestore();
  }

  const serviceAccountBase64 = process.env.FIREBASE_ADMIN_SDK_JSON_BASE64;
  if (!serviceAccountBase64) {
    throw new Error('FIREBASE_ADMIN_SDK_JSON_BASE64 env variable not set.');
  }
  const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('ascii');
  const serviceAccount = JSON.parse(serviceAccountJson);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return admin.firestore();
}
