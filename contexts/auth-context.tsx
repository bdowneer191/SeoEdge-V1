'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut, type Auth } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseReady, getFirebaseStatus, auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  firebaseReady: boolean;
  signOut: () => Promise<void>;
  auth: Auth | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Periodically check for Firebase readiness
    const interval = setInterval(() => {
      const isReady = isFirebaseReady();
      if (isReady) {
        setFirebaseReady(true);
        clearInterval(interval);
      } else {
        const status = getFirebaseStatus();
        if (status.error) {
          setError(`Firebase initialization error: ${status.error}`);
          clearInterval(interval); // Stop checking if there's a persistent error
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!firebaseReady) {
      // Don't set up the listener until Firebase is ready
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setError('Firebase auth instance not available.');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
        setError(null);
      },
      (e) => {
        setError(e.message);
        setUser(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firebaseReady]);

  const handleSignOut = async () => {
    const auth = getFirebaseAuth();
    if (auth) {
      await signOut(auth);
      router.push('/login');
    }
  };

  const value = {
    user,
    loading,
    error,
    firebaseReady,
    signOut: handleSignOut,
    auth,
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

  console.log('useAuth context:', context);
  return context;
}
