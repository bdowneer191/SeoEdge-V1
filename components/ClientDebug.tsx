// components/ClientDebug.tsx - Enhanced debug component
'use client';

import { useEffect, useState } from 'react';
import { getFirebaseStatus, reinitializeFirebase, isFirebaseReady } from '@/lib/firebase';

interface DebugInfo {
  timestamp: string;
  environment: {
    NODE_ENV: string;
    isClient: boolean;
    userAgent: string;
    url: string;
  };
  envVars: {
    raw: Record<string, string | undefined>;
    nextPublic: string[];
    firebase: Record<string, boolean>;
  };
  firebase: {
    status: any;
    ready: boolean;
    app: boolean;
    auth: boolean;
    db: boolean;
  };
  browser: {
    cookiesEnabled: boolean;
    localStorage: boolean;
    sessionStorage: boolean;
  };
}

export default function ClientDebug() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const collectDebugInfo = (): DebugInfo => {
    const firebaseStatus = getFirebaseStatus();
    
    // Get all environment variables that start with NEXT_PUBLIC_
    const nextPublicVars = Object.keys(process.env)
      .filter(key => key.startsWith('NEXT_PUBLIC_'))
      .sort();

    // Get Firebase-specific environment variables
    const firebaseVars = {
      NEXT_PUBLIC_FIREBASE_API_KEY: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    // Get raw values (first 20 characters for security)
    const rawFirebaseVars: Record<string, string | undefined> = {};
    Object.keys(firebaseVars).forEach(key => {
      const value = process.env[key];
      rawFirebaseVars[key] = value ? value.substring(0, 20) + '...' : undefined;
    });

    return {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'unknown',
        isClient: typeof window !== 'undefined',
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
        url: typeof window !== 'undefined' ? window.location.href : 'server',
      },
      envVars: {
        raw: rawFirebaseVars,
        nextPublic: nextPublicVars,
        firebase: firebaseVars,
      },
      firebase: {
        status: firebaseStatus,
        ready: isFirebaseReady(),
        app: firebaseStatus.hasApp,
        auth: firebaseStatus.hasAuth,
        db: firebaseStatus.hasDb,
      },
      browser: {
        cookiesEnabled: typeof window !== 'undefined' ? navigator.cookieEnabled : false,
        localStorage: typeof window !== 'undefined' ? !!window.localStorage : false,
        sessionStorage: typeof window !== 'undefined' ? !!window.sessionStorage : false,
      }
    };
  };

  const refreshDebugInfo = () => {
    const info = collectDebugInfo();
    setDebugInfo(info);
    console.log('🔍 CLIENT DEBUG INFO:', info);
  };

  const handleReinitialize = () => {
    console.log('🔄 Forcing Firebase reinitialization...');
    const success = reinitializeFirebase();
    console.log('Reinitialization result:', success);
    setTimeout(refreshDebugInfo, 500); // Give it a moment to reinitialize
  };

  useEffect(() => {
    refreshDebugInfo();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(refreshDebugInfo, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (!debugInfo) {
    return (
      <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 p-4 rounded shadow-lg z-50">
        <div className="text-yellow-800">🔄 Loading debug info...</div>
      </div>
    );
  }

  const hasFirebaseError = debugInfo.firebase.status.error;
  const missingFirebaseVars = Object.entries(debugInfo.envVars.firebase)
    .filter(([key, value]) => key.includes('FIREBASE') && ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID'].some(required => key.includes(required)) && !value)
    .map(([key]) => key);

  return (
    <div className={`fixed top-4 right-4 bg-white border-2 p-4 rounded-lg shadow-lg max-w-lg z-50 ${
      hasFirebaseError ? 'border-red-500' : missingFirebaseVars.length > 0 ? 'border-yellow-500' : 'border-green-500'
    }`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className={`font-bold ${
          hasFirebaseError ? 'text-red-600' : missingFirebaseVars.length > 0 ? 'text-yellow-600' : 'text-green-600'
        }`}>
          🔍 Firebase Debug Panel
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Status Overview */}
      <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
        <div className="flex justify-between">
          <span>Firebase Ready:</span>
          <span className={debugInfo.firebase.ready ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
            {debugInfo.firebase.ready ? '✅ YES' : '❌ NO'}
          </span>
        </div>
        {hasFirebaseError && (
          <div className="mt-1 text-red-600 text-xs">
            <strong>Error:</strong> {debugInfo.firebase.status.error}
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-3 text-xs">
          {/* Environment Variables */}
          <div>
            <h4 className="font-semibold mb-1">📋 Environment Variables</h4>
            <div className="bg-gray-50 p-2 rounded">
              <div><strong>NODE_ENV:</strong> {debugInfo.environment.NODE_ENV}</div>
              <div><strong>Total NEXT_PUBLIC_ vars:</strong> {debugInfo.envVars.nextPublic.length}</div>
              
              <div className="mt-2">
                <strong>Firebase Variables:</strong>
                {Object.entries(debugInfo.envVars.firebase).map(([key, value]) => (
                  <div key={key} className={`ml-2 ${value ? 'text-green-600' : 'text-red-600'}`}>
                    • {key.replace('NEXT_PUBLIC_FIREBASE_', '')}: {value ? '✅' : '❌'}
                  </div>
                ))}
              </div>

              {missingFirebaseVars.length > 0 && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                  <strong className="text-red-600">❌ Missing Required Variables:</strong>
                  {missingFirebaseVars.map(varName => (
                    <div key={varName} className="ml-2 text-red-600">• {varName}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Firebase Status */}
          <div>
            <h4 className="font-semibold mb-1">🔥 Firebase Status</h4>
            <div className="bg-gray-50 p-2 rounded">
              <div>Initialized: {debugInfo.firebase.status.initialized ? '✅' : '❌'}</div>
              <div>App: {debugInfo.firebase.app ? '✅' : '❌'}</div>
              <div>Auth: {debugInfo.firebase.auth ? '✅' : '❌'}</div>
              <div>Firestore: {debugInfo.firebase.db ? '✅' : '❌'}</div>
              <div>Environment: {debugInfo.firebase.status.environment}</div>
            </div>
          </div>

          {/* Raw Environment Data */}
          <div>
            <h4 className="font-semibold mb-1">🔍 Raw Environment Data</h4>
            <div className="bg-gray-50 p-2 rounded max-h-24 overflow-y-auto">
              {Object.entries(debugInfo.envVars.raw).map(([key, value]) => (
                <div key={key} className="font-mono text-xs">
                  {key}: {value || 'undefined'}
                </div>
              ))}
            </div>
          </div>

          {/* Available NEXT_PUBLIC Variables */}
          {debugInfo.envVars.nextPublic.length > 0 && (
            <div>
              <h4 className="font-semibold mb-1">🔧 All NEXT_PUBLIC Variables</h4>
              <div className="bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
                {debugInfo.envVars.nextPublic.map(varName => (
                  <div key={varName} className="text-xs">• {varName}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-3 flex gap-2 text-xs">
        <button
          onClick={refreshDebugInfo}
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
        >
          🔄 Refresh
        </button>
        <button
          onClick={handleReinitialize}
          className="bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600"
        >
          🔧 Reinit
        </button>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`px-3 py-1 rounded ${
            autoRefresh 
              ? 'bg-green-500 text-white hover:bg-green-600' 
              : 'bg-gray-500 text-white hover:bg-gray-600'
          }`}
        >
          {autoRefresh ? '⏸️ Stop' : '▶️ Auto'}
        </button>
        <button
          onClick={() => window.location.reload()}
          className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
        >
          🔄 Reload
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Last updated: {new Date(debugInfo.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
