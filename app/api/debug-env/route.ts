import { NextResponse } from 'next/server';

export async function GET() {
  // Only allow in development or for debugging
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Debug endpoint disabled in production' }, { status: 403 });
  }

  const firebaseVars = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'MISSING',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'SET' : 'MISSING',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'SET' : 'MISSING',
    allNextPublic: Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')),
    nodeEnv: process.env.NODE_ENV,
  };

  return NextResponse.json(firebaseVars);
}
