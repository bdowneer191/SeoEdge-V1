'use client';

import { useEffect, useState } from 'react';
import { getApps } from 'firebase/app';

interface DebugInfo {
  envVars: Record<string, boolean>;
  firebaseApps: number;
  errors: string[];
  suggestions: string[];
}

const FirebaseDebug = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  useEffect(() => {
    const checkConfiguration = () => {
      const requiredEnvVars = [
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
        'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        'NEXT_PUBLIC_FIREBASE_APP_ID',
      ];

      const envVars: Record<string, boolean> = {};
      const errors: string[] = [];
      const suggestions: string[] = [];

      // Check environment variables
      requiredEnvVars.forEach(varName => {
        const value = process.env[varName];
        const isValid = value && value !== 'undefined' && value.trim() !== '';
        envVars[varName] = isValid;

        if (!isValid) {
          errors.push(`Missing or invalid environment variable: ${varName}`);
        }
      });

      // Check Firebase apps
      const firebaseApps = getApps().length;
      if (firebaseApps === 0) {
        errors.push('No Firebase apps initialized');
        suggestions.push('Check Firebase configuration and initialization');
      }

      // Generate suggestions based on errors
      if (Object.values(envVars).some(valid => !valid)) {
        suggestions.push('Create or update your .env.local file with proper Firebase credentials');
        suggestions.push('Restart your development server after updating environment variables');
      }

      if (errors.length === 0) {
        suggestions.push('Configuration appears correct. The issue might be elsewhere.');
      }

      setDebugInfo({
        envVars,
        firebaseApps,
        errors,
        suggestions,
      });
    };

    checkConfiguration();
  }, []);

  if (!debugInfo) {
    return <div>Loading debug information...</div>;
  }

  return (
    <div className="fixed top-4 right-4 bg-gray-800 border border-gray-600 rounded-lg p-4 max-w-md z-50 shadow-xl">
      <h3 className="text-white font-semibold mb-3">🔧 Firebase Debug</h3>

      {/* Environment Variables Status */}
      <div className="mb-4">
        <h4 className="text-gray-300 text-sm font-medium mb-2">Environment Variables:</h4>
        <div className="space-y-1">
          {Object.entries(debugInfo.envVars).map(([key, isValid]) => (
            <div key={key} className="flex items-center text-xs">
              <div className={`w-2 h-2 rounded-full mr-2 ${isValid ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className={isValid ? 'text-green-300' : 'text-red-300'}>{key}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Firebase Apps */}
      <div className="mb-4">
        <h4 className="text-gray-300 text-sm font-medium mb-1">Firebase Apps:</h4>
        <div className={`text-sm ${debugInfo.firebaseApps > 0 ? 'text-green-300' : 'text-red-300'}`}>
          {debugInfo.firebaseApps} initialized
        </div>
      </div>

      {/* Errors */}
      {debugInfo.errors.length > 0 && (
        <div className="mb-4">
          <h4 className="text-red-400 text-sm font-medium mb-2">❌ Issues Found:</h4>
          <ul className="space-y-1">
            {debugInfo.errors.map((error, index) => (
              <li key={index} className="text-xs text-red-300">• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {debugInfo.suggestions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-blue-400 text-sm font-medium mb-2">💡 Suggestions:</h4>
          <ul className="space-y-1">
            {debugInfo.suggestions.map((suggestion, index) => (
              <li key={index} className="text-xs text-blue-300">• {suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => window.location.reload()}
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
        >
          Refresh
        </button>
        <button
          onClick={() => setDebugInfo(null)}
          className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default FirebaseDebug;
