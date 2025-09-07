// contexts/auth-context.tsx - Fixed to work with new Firebase configuration
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, type Auth } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseReady, getFirebaseStatus } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  firebaseReady: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => void;
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

  // Check Firebase initialization status
  useEffect(() => {
    const checkFirebaseStatus = () => {
      const ready = isFirebaseReady();
      const auth = getFirebaseAuth();
      
      setFirebaseReady(ready);
      setAuthInstance(auth);

      if (!ready) {
        const status = getFirebaseStatus();
        if (status.error) {
          setError(`Firebase initialization error: ${status.error}`);
          console.error('Firebase not ready:', status);
        }
      } else {
        setError(null);
      }
    };

    // Check immediately
    checkFirebaseStatus();

    // Check periodically until Firebase is ready
    const interval = setInterval(() => {
      if (!firebaseReady) {
        checkFirebaseStatus();
      } else {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [firebaseReady]);

  // Set up auth state listener when Firebase is ready
  useEffect(() => {
    if (!authInstance || !firebaseReady) {
      console.log('Auth listener not set up - Firebase not ready or no auth instance');
      return;
    }

    console.log('Setting up auth state listener...');
    setLoading(true);

    const unsubscribe = onAuthStateChanged(
      authInstance,
      (user) => {
        console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
        setUser(user);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('Auth state change error:', error);
        setError(`Auth error: ${error.message}`);
        setUser(null);
        setLoading(false);
      }
    );

    return () => {
      console.log('Cleaning up auth state listener');
      unsubscribe();
    };
  }, [authInstance, firebaseReady]);

  const signOut = async (): Promise<void> => {
    if (!authInstance) {
      throw new Error('Firebase Auth not initialized');
    }

    try {
      const { signOut: firebaseSignOut } = await import('firebase/auth');
      await firebaseSignOut(authInstance);
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown sign out error';
      setError(errorMessage);
      throw error;
    }
  };

  const refreshUser = () => {
    if (authInstance?.currentUser) {
      setUser(authInstance.currentUser);
    }
  };

  // Show loading state while Firebase is initializing
  if (!firebaseReady && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Firebase...</p>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  const value: AuthContextType = {
    user,
    loading,
    error,
    firebaseReady,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for checking if user is authenticated
export function useRequireAuth(): AuthContextType {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && !auth.user && auth.firebaseReady) {
      router.push('/login');
    }
  }, [auth.loading, auth.user, auth.firebaseReady, router]);

  return auth;
}

// Hook for redirecting authenticated users
export function useRedirectIfAuthenticated(redirectTo: string = '/dashboard'): AuthContextType {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && auth.user && auth.firebaseReady) {
      router.push(redirectTo);
    }
  }, [auth.loading, auth.user, auth.firebaseReady, router, redirectTo]);

  return auth;
}
