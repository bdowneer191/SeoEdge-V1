'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useAuthReady } from '@/contexts/auth-context';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  fallback,
  requireAuth = true,
  redirectTo = '/login'
}: AuthGuardProps) {
  const { user, loading, error } = useAuth();
  const isAuthReady = useAuthReady();
  const router = useRouter();

  useEffect(() => {
    if (isAuthReady && requireAuth && !user && !error) {
      console.log('AuthGuard: Redirecting to', redirectTo);
      router.push(redirectTo);
    }
  }, [isAuthReady, user, error, requireAuth, redirectTo, router]);

  // Show loading state while auth is initializing
  if (!isAuthReady || loading) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's an authentication error
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow-lg">
          <div className="text-red-600 mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Error</h3>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // If auth is required but user is not logged in, don't render children
  // (the redirect should happen via useEffect above)
  if (requireAuth && !user) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // If auth is not required, or user is authenticated, render children
  return <>{children}</>;
}

// Higher-order component version
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<AuthGuardProps, 'children'> = {}
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}
