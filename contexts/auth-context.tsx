'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut, type Auth } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseReady, getFirebaseStatus, reinitializeFirebase } from '@/lib/firebase';
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
      console.log('Firebase not ready, skipping auth listener.');
      setLoading(true); // Keep loading until Firebase is ready
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      console.log('No auth instance available, skipping listener.');
      setError('Firebase auth instance not available.');
      setLoading(false);
      return;
    }

    console.log('Setting up auth state listener...');
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        console.log('Auth state changed:', currentUser ? 'User logged in' : 'No user');
        setUser(currentUser);
        setLoading(false);
        setError(null);
      },
      (e) => {
        console.error('Auth state error:', e);
        setError(e.message);
        setUser(null);
        setLoading(false);
      }
    );

    return () => {
      console.log('Cleaning up auth state listener.');
      unsubscribe();
    };
  }, [firebaseReady]);

  const handleSignOut = async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    try {
      await signOut(auth);
      router.push('/login');
    } catch (e) {
      console.error('Sign out error:', e);
    }
  };

  const value = {
    user,
    loading,
    error,
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

  // Added for easier debugging of auth state from components
  console.log('useAuth state:', {
    user: context.user ? { uid: context.user.uid, email: context.user.email } : null,
    loading: context.loading,
    firebaseReady: context.firebaseReady,
    error: context.error
  });

  return context;
}
