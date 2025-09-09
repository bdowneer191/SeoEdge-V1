// contexts/auth-context.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseReady } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = async (): Promise<void> => {
    const auth = getFirebaseAuth();
    if (auth) {
      await firebaseSignOut(auth);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeAuth = () => {
      // Wait for Firebase to be ready
      if (!isFirebaseReady()) {
        console.log('🔄 Firebase not ready, waiting...');
        // Retry after a short delay
        setTimeout(initializeAuth, 100);
        return;
      }

      const auth = getFirebaseAuth();
      if (!auth) {
        console.error('❌ Firebase Auth not available');
        setLoading(false);
        return;
      }

      console.log('✅ Setting up auth state listener');
      
      unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          console.log('🔄 Auth state changed:', user ? 'User logged in' : 'User logged out');
          setUser(user);
          setLoading(false);
        },
        (error) => {
          console.error('❌ Auth state change error:', error);
          setUser(null);
          setLoading(false);
        }
      );
    };

    initializeAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    signOut,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
