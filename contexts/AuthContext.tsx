/**
 * Authentication context for the WordCrew portal.
 *
 * Signing in is only required for the paid path — the game stays fully playable as a
 * demo while signed out. This provider therefore exposes a *fire-and-forget* surface:
 * once a user exists it also keeps a minimal `users/{uid}` profile document in
 * Firestore (the store for identity + progress; money stays in D1).
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, firebaseConfigured, googleProvider } from '../services/firebase';

interface AuthContextValue {
  user: User | null;
  /** True until Firebase has reported the initial auth state (avoids UI flicker). */
  loading: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  /** Fresh ID token for the API worker; `null` when signed out. */
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const NOT_CONFIGURED = 'Sign-in is not available right now. Please try again later.';

/** Turns Firebase's terse error codes into something a teacher can act on. */
const describeError = (error: unknown): string => {
  const code = typeof error === 'object' && error !== null ? (error as { code?: string }).code : '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address does not look right.';
    case 'auth/missing-password':
      return 'Please enter your password.';
    case 'auth/weak-password':
      return 'Passwords need at least 6 characters.';
    case 'auth/email-already-in-use':
      return 'An account already uses that email. Try signing in instead.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in window was closed before finishing.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Allow popups and try again.';
    case 'auth/network-request-failed':
      return 'Network problem — check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
};

/** Creates the profile document on first sign-in and refreshes `lastSeenAt` afterwards. */
const syncUserProfile = async (user: User): Promise<void> => {
  if (!db) return;
  try {
    const ref = doc(db, 'users', user.uid);
    const existing = await getDoc(ref);
    await setDoc(
      ref,
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastSeenAt: serverTimestamp(),
        ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
      },
      { merge: true },
    );
  } catch (error) {
    // The profile mirror is best-effort: a rules or network hiccup must never block sign-in.
    console.warn('[WordCrew] Could not sync the user profile document.', error);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(firebaseConfigured);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      if (nextUser) void syncUserProfile(nextUser);
    });
  }, []);

  const requireAuth = useCallback((): NonNullable<typeof auth> => {
    if (!auth) throw new Error(NOT_CONFIGURED);
    return auth;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const instance = requireAuth();
    if (!googleProvider) throw new Error(NOT_CONFIGURED);
    try {
      await signInWithPopup(instance, googleProvider);
    } catch (error) {
      throw new Error(describeError(error));
    }
  }, [requireAuth]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const instance = requireAuth();
      try {
        await signInWithEmailAndPassword(instance, email.trim(), password);
      } catch (error) {
        throw new Error(describeError(error));
      }
    },
    [requireAuth],
  );

  const registerWithEmail = useCallback(
    async (name: string, email: string, password: string) => {
      const instance = requireAuth();
      try {
        const credential = await createUserWithEmailAndPassword(instance, email.trim(), password);
        if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() });
        await syncUserProfile(credential.user);
      } catch (error) {
        throw new Error(describeError(error));
      }
    },
    [requireAuth],
  );

  const resetPassword = useCallback(
    async (email: string) => {
      const instance = requireAuth();
      try {
        await sendPasswordResetEmail(instance, email.trim());
      } catch (error) {
        throw new Error(describeError(error));
      }
    },
    [requireAuth],
  );

  const signOutUser = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  }, []);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!auth?.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      return null;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      configured: firebaseConfigured,
      signInWithGoogle,
      signInWithEmail,
      registerWithEmail,
      resetPassword,
      signOutUser,
      getIdToken,
    }),
    [
      user,
      loading,
      signInWithGoogle,
      signInWithEmail,
      registerWithEmail,
      resetPassword,
      signOutUser,
      getIdToken,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
};
