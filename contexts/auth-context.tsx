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
  const [authInstance, setAuthInstance] = useState<Auth | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check Firebase initialization status
    const checkFirebaseStatus = () => {
      const isReady = isFirebaseReady();
      setFirebaseReady(isReady);
      if (isReady) {
        const auth = getFirebaseAuth();
        setAuthInstance(auth);
      } else {
        const status = getFirebaseStatus();
        if (status.error) {
          setError(`Firebase initialization error: ${status.error}`);
        } else {
          setError(null);
        }
      }
    };

    checkFirebaseStatus();
    const interval = setInterval(() => {
      if (!firebaseReady) {
        checkFirebaseStatus();
      } else {
        clearInterval(interval);
      }
    }, 100); // Check more frequently to resolve quickly

    return () => clearInterval(interval);
  }, [firebaseReady]);

  useEffect(() => {
    if (!authInstance) {
      // Don't set up the listener until the auth instance is ready
      setLoading(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      authInstance,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      },
      (e) => {
        setError(e.message);
        setUser(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authInstance]);

  const handleSignOut = async () => {
    if (!authInstance) return;
    try {
      await signOut(authInstance);
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
  return context;
}
