/**
 * Authentication context for the WordCrew portal.
 *
 * Signing in is only required for the paid path — the game stays fully playable as a
 * demo while signed out. This provider therefore exposes a *fire-and-forget* surface:
 * once a user exists it also keeps a minimal `users/{uid}` profile document in
 * Firestore (the store for identity + progress; money stays in D1).
 *
 * The profile document is also the source of truth for the player's display name:
 * a user may rename themselves once every 30 days (the cooldown is enforced by the
 * Firestore rules, not just here) and an admin can rename anyone at any time. Presence
 * (`online` + `lastSeenAt`) is heartbeat-driven so the admin dashboard can show who is
 * in the app right now and when each account last signed in.
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
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { auth, db, firebaseConfigured, googleProvider } from '../services/firebase';
import { refreshSoloDisplayName } from '../services/soloLeaderboard';

/** How long a player must wait between two self-service renames. */
export const DISPLAY_NAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 24;

/** Self-service roles. Admins count as teachers without needing the field. */
export type UserRole = 'student' | 'teacher';

/** The `users/{uid}` fields this provider reads. Extra fields are progress counters. */
export interface UserProfile {
  displayName?: string | null;
  displayNameUpdatedAt?: Timestamp | null;
  /**
   * Set by an admin from the account directory. The owner can read it but the rules
   * refuse to let them write it, so a student cannot promote themselves.
   */
  role?: UserRole | null;
  online?: boolean;
  lastSeenAt?: Timestamp | null;
  lastLoginAt?: Timestamp | null;
  createdAt?: Timestamp | null;
  /** Today's Challenge habit — written by services/dailyHabit.ts. */
  dailyStreak?: number;
  dailyBestStreak?: number;
  lastDailyDate?: string;
  dailyFreezeMonth?: string;
  dailyFreezesUsed?: number;
}

/** When the signed-in player's rename cooldown ends, or null when they can rename now. */
export const displayNameCooldownEndsAt = (profile: UserProfile | null): number | null => {
  const value = profile?.displayNameUpdatedAt;
  if (!value || typeof value.toMillis !== 'function') return null;
  return value.toMillis() + DISPLAY_NAME_COOLDOWN_MS;
};

interface AuthContextValue {
  user: User | null;
  /** The signed-in account's Firestore profile (name, presence), live. */
  profile: UserProfile | null;
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
  /** Renames the signed-in player, enforcing the 30-day cooldown client-side too. */
  updateDisplayName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const NOT_CONFIGURED = 'Sign-in is not available right now. Please try again later.';

/** Trims, collapses runs of spaces and caps the length the rules accept. */
const normalizeDisplayName = (value: string | null | undefined): string =>
  (value ?? '').trim().replace(/\s+/g, ' ').slice(0, DISPLAY_NAME_MAX);

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

/**
 * Creates the profile document on first sign-in and refreshes presence afterwards.
 * An existing profile's `displayName` is deliberately never overwritten: the player or
 * an admin may have renamed the account, and that stored name is the one the Solo
 * leaderboard uses.
 */
const syncUserProfile = async (user: User, displayNameOverride?: string): Promise<void> => {
  if (!db) return;
  try {
    const ref = doc(db, 'users', user.uid);
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      const initialName = normalizeDisplayName(displayNameOverride ?? user.displayName);
      await setDoc(ref, {
        uid: user.uid,
        email: user.email,
        photoURL: user.photoURL,
        ...(initialName ? { displayName: initialName } : {}),
        online: true,
        lastLoginAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      return;
    }
    await setDoc(
      ref,
      {
        uid: user.uid,
        email: user.email,
        photoURL: user.photoURL,
        online: true,
        lastLoginAt: serverTimestamp(),
        lastSeenAt: serverTimestamp(),
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
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

  // The profile document is live so a rename made here (or by an admin) shows up at
  // once, and so the Account tab can show the cooldown without another read.
  useEffect(() => {
    if (!db || !user) {
      setProfile(null);
      return;
    }
    return onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => setProfile(snapshot.exists() ? (snapshot.data() as UserProfile) : null),
      () => setProfile(null),
    );
  }, [user]);

  // Presence heartbeat: one write a minute while the tab is visible, plus an immediate
  // "away" when it is hidden or closed. The admin dashboard treats a `lastSeenAt` newer
  // than a few minutes as online, so a crashed tab ages out on its own.
  useEffect(() => {
    if (!db || !user) return;
    const ref = doc(db, 'users', user.uid);
    const beat = (online: boolean) => {
      void setDoc(ref, { online, lastSeenAt: serverTimestamp() }, { merge: true }).catch(() => {});
    };
    const onVisibility = () => beat(document.visibilityState === 'visible');
    const onUnload = () => beat(false);
    beat(true);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') beat(true);
    }, 60_000);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
      window.removeEventListener('beforeunload', onUnload);
      beat(false);
    };
  }, [user]);

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
        await syncUserProfile(credential.user, name);
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

  const updateDisplayName = useCallback(async (raw: string) => {
    if (!db || !auth?.currentUser) throw new Error('Sign in before changing your name.');
    const name = normalizeDisplayName(raw);
    if (name.length < DISPLAY_NAME_MIN) {
      throw new Error(`Names need at least ${DISPLAY_NAME_MIN} characters.`);
    }

    const uid = auth.currentUser.uid;
    const ref = doc(db, 'users', uid);
    // Read fresh rather than trusting the cached profile: another device (or the admin)
    // may have renamed the account since this tab loaded.
    const snapshot = await getDoc(ref);
    const data = (snapshot.data() ?? {}) as UserProfile;
    const lastChanged = displayNameCooldownEndsAt(data);
    if (lastChanged && Date.now() < lastChanged) {
      throw new Error(
        `You can change your name again on ${new Date(lastChanged).toLocaleDateString()}. Contact the admin if you need it sooner.`,
      );
    }

    // The rules repeat the cooldown check, so a modified client cannot bypass it.
    await setDoc(
      ref,
      { displayName: name, displayNameUpdatedAt: serverTimestamp() },
      { merge: true },
    );
    try {
      await updateProfile(auth.currentUser, { displayName: name });
    } catch {
      // The Firestore profile is the one that matters; the Auth mirror is best-effort.
    }
    void refreshSoloDisplayName(uid, name);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      configured: firebaseConfigured,
      signInWithGoogle,
      signInWithEmail,
      registerWithEmail,
      resetPassword,
      signOutUser,
      getIdToken,
      updateDisplayName,
    }),
    [
      user,
      profile,
      loading,
      signInWithGoogle,
      signInWithEmail,
      registerWithEmail,
      resetPassword,
      signOutUser,
      getIdToken,
      updateDisplayName,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
};
