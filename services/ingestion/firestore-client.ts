import * as admin from 'firebase-admin';

let firestore: admin.firestore.Firestore;

if (!admin.apps.length) {
  const serviceAccountBase64 = process.env.FIREBASE_ADMIN_SDK_JSON_BASE64;
  if (!serviceAccountBase64) {
    throw new Error('FIREBASE_ADMIN_SDK_JSON_BASE64 env variable not set.');
  }

  try {
    const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
    const serviceAccount = JSON.parse(serviceAccountJson);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error("Failed to parse or use FIREBASE_ADMIN_SDK_JSON_BASE64:", error);
    throw new Error("Invalid FIREBASE_ADMIN_SDK_JSON_BASE64 credentials.");
  }
}

firestore = admin.firestore();

export { firestore };
