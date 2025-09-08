'use client';

import { useAuth } from '@/contexts/auth-context';
import { getFirebaseStatus } from '@/lib/firebase';

export function FirebaseDebug() {
  const authContext = useAuth();
  const firebaseStatus = getFirebaseStatus();

  const configCheck = {
    apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const configValues = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'NOT_SET',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'NOT_SET',
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?
      `${process.env.NEXT_PUBLIC_FIREBASE_API_KEY.slice(0, 8)}...` : 'NOT_SET',
  };

  return (
    <div className="p-6 bg-gray-100 border rounded-lg max-w-4xl mx-auto my-4">
      <h2 className="text-2xl font-bold mb-4">Firebase Debug Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Configuration Check */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Environment Variables</h3>
          <div className="space-y-1">
            {Object.entries(configCheck).map(([key, value]) => (
              <div key={key} className="flex items-center">
                <span className={`mr-2 ${value ? 'text-green-500' : 'text-red-500'}`}>
                  {value ? '✅' : '❌'}
                </span>
                <span className="font-mono text-sm">{key}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration Values */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Configuration Values</h3>
          <div className="space-y-1">
            {Object.entries(configValues).map(([key, value]) => (
              <div key={key} className="text-sm">
                <span className="font-mono text-gray-600">{key}:</span>
                <span className="ml-2 font-mono bg-gray-200 px-2 py-1 rounded">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Firebase Status */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Firebase Status</h3>
          <div className="space-y-1">
            {Object.entries(firebaseStatus).map(([key, value]) => (
              <div key={key} className="flex items-center">
                <span className={`mr-2 ${value ? 'text-green-500' : 'text-red-500'}`}>
                  {value ? '✅' : '❌'}
                </span>
                <span className="font-mono text-sm">{key}: {String(value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Auth Context Status */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Auth Context Status</h3>
          <div className="space-y-1">
            <div className="flex items-center">
              <span className={`mr-2 ${authContext.firebaseReady ? 'text-green-500' : 'text-red-500'}`}>
                {authContext.firebaseReady ? '✅' : '❌'}
              </span>
              <span className="font-mono text-sm">firebaseReady: {String(authContext.firebaseReady)}</span>
            </div>
            <div className="flex items-center">
              <span className={`mr-2 ${!authContext.loading ? 'text-green-500' : 'text-yellow-500'}`}>
                {!authContext.loading ? '✅' : '⏳'}
              </span>
              <span className="font-mono text-sm">loading: {String(authContext.loading)}</span>
            </div>
            <div className="flex items-center">
              <span className={`mr-2 ${authContext.user ? 'text-green-500' : 'text-gray-500'}`}>
                {authContext.user ? '✅' : 'ℹ️'}
              </span>
              <span className="font-mono text-sm">user: {authContext.user ? 'Logged in' : 'Not logged in'}</span>
            </div>
            {authContext.error && (
              <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded">
                <span className="text-red-700 text-sm font-mono">Error: {authContext.error}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Debug Info */}
      <div className="mt-6 p-4 bg-white border rounded">
        <h3 className="text-lg font-semibold mb-2">Browser Information</h3>
        <div className="text-sm font-mono space-y-1">
          <div>User Agent: {navigator.userAgent}</div>
          <div>Current URL: {window.location.href}</div>
          <div>Local Storage Available: {typeof(Storage) !== "undefined" ? 'Yes' : 'No'}</div>
          <div>Cookies Enabled: {navigator.cookieEnabled ? 'Yes' : 'No'}</div>
        </div>
      </div>
    </div>
  );
}
