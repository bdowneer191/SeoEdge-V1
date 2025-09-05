'use client';

import { ReactNode } from 'react';
import { app } from '@/lib/firebase'; // Import to ensure Firebase is initialized
import FirebaseDebug from './FirebaseDebug';

// This component ensures that Firebase is initialized on the client-side
// and provides a debug component in development mode.

interface SafeFirebaseWrapperProps {
  children: ReactNode;
}

const SafeFirebaseWrapper = ({ children }: SafeFirebaseWrapperProps) => {
  return (
    <>
      {children}
      {process.env.NODE_ENV === 'development' && <FirebaseDebug />}
    </>
  );
};

export default SafeFirebaseWrapper;
