'use client';

import React from 'react';

const EnvDebug: React.FC = () => {
  const envVars = {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  };

  return (
    <div style={{ backgroundColor: 'black', color: 'white', padding: '1rem', margin: '1rem' }}>
      <h2>Environment Variables (Client-side)</h2>
      <pre>{JSON.stringify(envVars, null, 2)}</pre>
    </div>
  );
};

export default EnvDebug;
