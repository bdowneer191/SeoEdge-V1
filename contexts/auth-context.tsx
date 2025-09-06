// contexts/auth-context.tsx

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, getAuth, type Auth } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  auth: Auth | null; // Add auth to the context type
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInstance, setAuthInstance] = useState<Auth | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if we're on the client side and firebase app is available
    if (typeof window === 'undefined' || !app) {
      console.error("Firebase app is not initialized or not in browser.");
      setLoading(false);
      return;
    }

    try {
      // Initialize auth instance
      const currentAuth = getAuth(app);
      setAuthInstance(currentAuth);
      
      // Set up auth state listener immediately
      const unsubscribe = onAuthStateChanged(currentAuth, (currentUser) => {
        console.log('Auth state changed:', currentUser?.uid || 'no user');
        setUser(currentUser);
        setLoading(false);
        
        // Only redirect to login if no user and not already on login page
        if (!currentUser && typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          router.push('/login');
        }
      });

      return () => {
        unsubscribe();
      };
    } catch (error) {
      console.error('Error initializing auth:', error);
      setLoading(false);
      setAuthInstance(null);
    }
  }, [router]);

  // Don't render children until auth is initialized
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, auth: authInstance }}>
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
