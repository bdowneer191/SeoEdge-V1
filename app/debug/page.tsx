'use client';

import { getFirebaseStatus } from '@/lib/firebase';
import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [status, setStatus] = useState<any>(null);
  const [envVars, setEnvVars] = useState<any>({});

  useEffect(() => {
    // Check Firebase status
    setStatus(getFirebaseStatus());

    // Check environment variables (only show if they exist, not their values for security)
    const vars = {
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'MISSING',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'SET' : 'MISSING',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'SET' : 'MISSING',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? 'SET' : 'MISSING',
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? 'SET' : 'MISSING',
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? 'SET' : 'MISSING',
    };
    setEnvVars(vars);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Firebase Configuration Debug</h1>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Firebase Status</h2>
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="font-medium w-32">App:</span>
                <span className={`px-2 py-1 rounded text-sm ${
                  status?.app ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {status?.app ? 'Initialized' : 'Not Initialized'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-medium w-32">Auth:</span>
                <span className={`px-2 py-1 rounded text-sm ${
                  status?.auth ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {status?.auth ? 'Initialized' : 'Not Initialized'}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-medium w-32">Config:</span>
                <span className={`px-2 py-1 rounded text-sm ${
                  status?.config ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {status?.config ? 'Valid' : 'Invalid'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
            <div className="space-y-2">
              {Object.entries(envVars).map(([key, value]) => (
                <div key={key} className="flex items-center">
                  <span className="font-mono text-sm w-80">{key}:</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    value === 'SET' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {value as string}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Troubleshooting</h2>
            <div className="prose text-sm text-gray-600">
              <p>If you see any "MISSING" values above:</p>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Check your Vercel environment variables in your project settings</li>
                <li>Ensure variable names are exactly as shown above</li>
                <li>Redeploy your application after adding/updating variables</li>
                <li>Variables starting with NEXT_PUBLIC_ are exposed to the browser</li>
              </ol>

              <p className="mt-4">Common issues:</p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>Environment variables not set in Vercel project settings</li>
                <li>Typos in variable names</li>
                <li>Missing NEXT_PUBLIC_ prefix for client-side variables</li>
                <li>Need to redeploy after updating environment variables</li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Refresh Page
              </button>
              <button
                onClick={() => {
                  setStatus(null);
                  setEnvVars({});
                  setTimeout(() => {
                    setStatus(getFirebaseStatus());
                    const vars = {
                      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'MISSING',
                      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'SET' : 'MISSING',
                      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'SET' : 'MISSING',
                      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? 'SET' : 'MISSING',
                      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? 'SET' : 'MISSING',
                      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? 'SET' : 'MISSING',
                    };
                    setEnvVars(vars);
                  }, 100);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Re-check Status
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
