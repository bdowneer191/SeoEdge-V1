import * as admin from 'firebase-admin';

export function initializeFirebaseAdmin() {
  if (admin.apps.length) {
    return admin.firestore();
  }

  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_ADMIN_SDK_JSON_BASE64!, 'base64').toString()
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return admin.firestore();
}
