'use client';

import { useEffect, useState } from 'react';

export default function ClientDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const info = {
      nodeEnv: process.env.NODE_ENV,
      firebaseApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'MISSING',
      firebaseAuthDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'MISSING',
      firebaseProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'MISSING',
      allNextPublicVars: Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')),
      totalEnvVars: Object.keys(process.env).length,
      timestamp: new Date().toISOString()
    };

    setDebugInfo(info);
    console.log('CLIENT DEBUG INFO:', info);
  }, []);

  if (!debugInfo) return <div>Loading debug info...</div>;

  return (
    <div className="fixed top-4 right-4 bg-white border border-red-500 p-4 rounded shadow-lg max-w-md z-50">
      <h3 className="font-bold text-red-600 mb-2">🔍 Environment Debug</h3>
      <div className="text-xs space-y-1">
        <div><strong>NODE_ENV:</strong> {debugInfo.nodeEnv}</div>
        <div><strong>API Key:</strong> {debugInfo.firebaseApiKey === 'MISSING' ? '❌ MISSING' : '✅ SET'}</div>
        <div><strong>Auth Domain:</strong> {debugInfo.firebaseAuthDomain === 'MISSING' ? '❌ MISSING' : '✅ SET'}</div>
        <div><strong>Project ID:</strong> {debugInfo.firebaseProjectId === 'MISSING' ? '❌ MISSING' : '✅ SET'}</div>
        <div><strong>NEXT_PUBLIC_ vars:</strong> {debugInfo.allNextPublicVars.length}</div>
        <div><strong>Total env vars:</strong> {debugInfo.totalEnvVars}</div>
        <div className="mt-2 text-xs text-gray-500">
          Time: {debugInfo.timestamp}
        </div>
        {debugInfo.allNextPublicVars.length > 0 && (
          <div className="mt-2">
            <strong>Available vars:</strong>
            <ul className="text-xs">
              {debugInfo.allNextPublicVars.map((varName: string) => (
                <li key={varName}>• {varName}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded"
      >
        Refresh
      </button>
    </div>
  );
}
