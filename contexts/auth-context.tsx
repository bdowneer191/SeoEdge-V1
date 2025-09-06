// contexts/auth-context.tsx

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, getAuth, type Auth } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInstance, setAuthInstance] = useState<Auth | null>(null); // State for auth object
  const router = useRouter();

  useEffect(() => {
    if (!app) {
      console.error("Firebase app is not initialized.");
      setLoading(false);
      router.push('/login');
      return;
    }

    // Lazily get the auth instance to ensure it's client-side
    const currentAuth = getAuth(app);
    setAuthInstance(currentAuth);
  }, [router]);

  useEffect(() => {
    if (!authInstance) {
      // If auth is not yet initialized, don't set up listener
      return;
    }

    const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authInstance, router]); // Dependency on authInstance

  return (
    <AuthContext.Provider value={{ user, loading }}>
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
