'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, signOut, type Auth } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  firebaseReady: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // This effect now simply polls until the auth instance is ready.
    const interval = setInterval(() => {
      const authInstance = getFirebaseAuth();
      if (authInstance) {
        setAuth(authInstance);
        setFirebaseReady(true);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const [user, loading, error] = useAuthState(auth);

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/login');
    }
  };

  const value = {
    user: user || null,
    loading,
    error: error ? error.message : null,
    firebaseReady,
    signOut: handleSignOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  // Debugging log as requested
  console.log('useAuth context:', context);

  return context;
}
