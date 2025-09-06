// contexts/auth-context.tsx

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, getAuth, type Auth } from 'firebase/auth';
import { app, isFirebaseInitialized, getFirebaseStatus } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  auth: Auth | null;
  error: string | null;
  isInitialized: boolean; // Add this to track initialization state
}

// Create context with a default value to prevent undefined errors
const defaultContextValue: AuthContextType = {
  user: null,
  loading: true,
  auth: null,
  error: null,
  isInitialized: false,
};

const AuthContext = createContext<AuthContextType>(defaultContextValue);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInstance, setAuthInstance] = useState<Auth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') {
      setLoading(false);
      setIsInitialized(true);
      return;
    }

    // Add a small delay to ensure Firebase is fully loaded
    const initializeAuth = async () => {
      try {
        // Wait a bit for Firebase to initialize
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check Firebase initialization status
        const status = getFirebaseStatus();
        console.log('Firebase status:', status);

        if (!isFirebaseInitialized() || !app) {
          console.error("Firebase is not properly initialized");
          setError("Firebase configuration error. Please check your environment variables.");
          setLoading(false);
          setIsInitialized(true);
          return;
        }

        // Initialize auth instance
        const currentAuth = getAuth(app);
        setAuthInstance(currentAuth);
        setIsInitialized(true);
        
        // Set up auth state listener
        const unsubscribe = onAuthStateChanged(
          currentAuth, 
          (currentUser) => {
            console.log('Auth state changed:', currentUser?.uid || 'no user');
            setUser(currentUser);
            setLoading(false);
            setError(null);
            
            // Only redirect to login if no user and not already on login/public pages
            if (!currentUser && typeof window !== 'undefined') {
              const currentPath = window.location.pathname;
              const publicPaths = ['/login', '/signup', '/forgot-password', '/'];
              const isPublicPath = publicPaths.some(path => currentPath.startsWith(path));
              
              if (!isPublicPath) {
                console.log('No user found, redirecting to login...');
                router.push('/login');
              }
            }
          }, 
          (authError) => {
            console.error('Auth state change error:', authError);
            setError(`Authentication error: ${authError.message}`);
            setLoading(false);
            setIsInitialized(true);
          }
        );

        return () => {
          unsubscribe();
        };
      } catch (error: any) {
        console.error('Error initializing auth:', error);
        setError(`Auth initialization error: ${error.message}`);
        setLoading(false);
        setAuthInstance(null);
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [router]);

  // Show error state if Firebase isn't configured properly
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow-lg">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.73 0L3.084 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Configuration Error</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <p className="text-xs text-gray-500">
            Please check your Firebase environment variables and try refreshing the page.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loading state only if not initialized or still loading
  if (loading && !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  const contextValue: AuthContextType = {
    user,
    loading,
    auth: authInstance,
    error,
    isInitialized,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  // This should never happen with our default value, but keep as safety check
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// Optional: Hook for components that need to wait for auth to be ready
export function useAuthReady() {
  const { isInitialized, loading } = useAuth();
  return isInitialized && !loading;
}
