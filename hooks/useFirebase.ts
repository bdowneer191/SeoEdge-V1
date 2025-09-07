'use client';

import { useEffect, useState } from 'react';
import {
  getFirebaseApp,
  getFirebaseAuth,
  getFirebaseDb,
  isFirebaseReady,
  getFirebaseStatus
} from '@/lib/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

interface FirebaseHookResult {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  ready: boolean;
  error: string | null;
  loading: boolean;
}

/**
 * Hook to get Firebase services with loading and error states
 */
export function useFirebase(): FirebaseHookResult {
  const [state, setState] = useState<FirebaseHookResult>({
    app: null,
    auth: null,
    db: null,
    ready: false,
    error: null,
    loading: true,
  });

  useEffect(() => {
    const checkFirebase = () => {
      const app = getFirebaseApp();
      const auth = getFirebaseAuth();
      const db = getFirebaseDb();
      const ready = isFirebaseReady();
      const status = getFirebaseStatus();

      setState({
        app,
        auth,
        db,
        ready,
        error: status.error,
        loading: !ready && !status.error, // Still loading if not ready and no error
      });
    };

    // Check immediately
    checkFirebase();

    // Set up interval to check until ready
    const interval = setInterval(() => {
      if (!state.ready && !state.error) {
        checkFirebase();
      } else {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [state.ready, state.error]);

  return state;
}

/**
 * Hook to get Firebase Auth with ready state
 */
export function useFirebaseAuth() {
  const { auth, ready, error, loading } = useFirebase();
  return { auth, ready, error, loading };
}

/**
 * Hook to get Firestore with ready state
 */
export function useFirebaseDb() {
  const { db, ready, error, loading } = useFirebase();
  return { db, ready, error, loading };
}

/**
 * Hook to wait for Firebase to be ready
 */
export function useFirebaseReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const checkReady = () => {
      const isReady = isFirebaseReady();
      setReady(isReady);

      if (!isReady) {
        // Check again in a bit
        setTimeout(checkReady, 500);
      }
    };

    checkReady();
  }, []);

  return ready;
}

/**
 * Hook for Firebase status monitoring
 */
export function useFirebaseStatus() {
  const [status, setStatus] = useState(() => getFirebaseStatus());

  useEffect(() => {
    const updateStatus = () => {
      setStatus(getFirebaseStatus());
    };

    updateStatus();

    const interval = setInterval(updateStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  return status;
}
