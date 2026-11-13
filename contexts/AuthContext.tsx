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
  EmailAuthProvider,
  getRedirectResult,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
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
import { AppError } from '../services/apiError';
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
  /** The signed-in *account*. Guests (anonymous sessions) get `null` here on purpose. */
  user: User | null;
  /**
   * The identity behind this device, guest or account. A visitor who never signs in still
   * gets an anonymous uid once Firebase has one, which is what makes it possible to count
   * real usage without putting a login screen in front of the game.
   */
  uid: string | null;
  /** True while the device is on a silent anonymous session (no account yet). */
  isGuest: boolean;
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

/** Trims, collapses runs of spaces and caps the length the rules accept. */
const normalizeDisplayName = (value: string | null | undefined): string =>
  (value ?? '').trim().replace(/\s+/g, ' ').slice(0, DISPLAY_NAME_MAX);

/** Formats a cooldown date the way the rest of the portal does, in the UI's language. */
const dateLabel = (ms: number): string =>
  new Date(ms).toLocaleDateString(
    document.documentElement.lang === 'vi' ? 'vi-VN' : 'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );

/**
 * Maps Firebase's terse error codes onto the keys in the `errors` dictionary. The code is
 * what leaves this module — the sentence is chosen by whichever screen shows it, in the
 * reader's language.
 */
const authErrorCode = (error: unknown): string => {
  const code = typeof error === 'object' && error !== null ? (error as { code?: string }).code : '';
  switch (code) {
    case 'auth/invalid-email':
      return 'invalidEmail';
    case 'auth/missing-password':
      return 'missingPassword';
    case 'auth/weak-password':
      return 'weakPassword';
    case 'auth/email-already-in-use':
      return 'emailInUse';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'wrongCredentials';
    case 'auth/too-many-requests':
      return 'tooManyAttempts';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'popupClosed';
    case 'auth/popup-blocked':
      return 'popupBlocked';
    case 'auth/network-request-failed':
      return 'networkError';
    default:
      return 'generic';
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

/**
 * Linking a guest to an account fails when that account already exists. That is not an
 * error the reader should see: the caller falls back to a normal sign-in and the guest
 * identity is simply abandoned.
 */
const isLinkConflict = (error: unknown): boolean => {
  const code = typeof error === 'object' && error !== null ? (error as { code?: string }).code : '';
  return (
    code === 'auth/credential-already-in-use' ||
    code === 'auth/email-already-in-use' ||
    code === 'auth/provider-already-linked'
  );
};

/**
 * A blocked popup is a browser setting, not a dead end: the same Google sign-in works as a
 * full-page redirect. Safari, in-app browsers and a freshly reset browser profile (clearing
 * a drive resets the profile too) all report the block here, and asking the reader to hunt
 * for a popup setting they never changed is a worse answer than finishing the sign-in.
 */
const isPopupBlocked = (error: unknown): boolean => {
  const code = typeof error === 'object' && error !== null ? (error as { code?: string }).code : '';
  return (
    code === 'auth/popup-blocked' ||
    code === 'auth/operation-not-supported-in-this-environment'
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Firebase's own user, which may be an anonymous (guest) session. Only a real account is
  // ever surfaced as `user`, so every "sign in to continue" gate keeps working untouched.
  const [identity, setIdentity] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(firebaseConfigured);

  const user = identity && !identity.isAnonymous ? identity : null;

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    // Consume the result of a redirect sign-in. The signed-in user arrives through
    // onAuthStateChanged either way, so this only clears Firebase's pending handler and
    // logs a failed comeback — the dialog that started the flow no longer exists.
    void getRedirectResult(auth).catch((error) => {
      console.warn('[WordCrew] Google redirect sign-in did not complete.', error);
    });
    return onAuthStateChanged(auth, (nextUser) => {
      setIdentity(nextUser);
      setLoading(false);
      if (nextUser && !nextUser.isAnonymous) void syncUserProfile(nextUser);
    });
  }, []);

  // A silent guest session per device: no login screen, no profile document, just a stable
  // uid we can count usage against. It is best-effort — if the Anonymous provider is not
  // enabled (or the network is down) the app simply stays signed out, which is exactly how
  // it behaved before, so nothing breaks.
  useEffect(() => {
    if (!auth || loading || identity) return;
    void signInAnonymously(auth).catch((error) => {
      // Guests then simply stay signed out. The warning is what tells a developer the
      // Anonymous provider is not enabled in the Firebase project.
      console.warn('[WordCrew] Could not open a guest session.', error);
    });
  }, [loading, identity]);

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
    if (!auth) throw new AppError('signInNotConfigured');
    return auth;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const instance = requireAuth();
    if (!googleProvider) throw new AppError('signInNotConfigured');
    try {
      // A guest who signs in keeps their identity: linking rewrites the anonymous session
      // into the Google account instead of throwing the uid away.
      if (instance.currentUser?.isAnonymous) {
        try {
          await linkWithPopup(instance.currentUser, googleProvider);
          return;
        } catch (error) {
          if (isPopupBlocked(error)) throw error;
          if (!isLinkConflict(error)) throw error;
        }
      }
      await signInWithPopup(instance, googleProvider);
    } catch (error) {
      if (isPopupBlocked(error)) {
        // Retry as a redirect — no linking on this path: a redirect cannot report a link
        // conflict back to the click that started it, and guessing would bounce the reader
        // through Google twice. The guest identity is dropped instead; the account is the
        // identity that matters once they sign in.
        await signInWithRedirect(instance, googleProvider);
        return;
      }
      throw new AppError(authErrorCode(error));
    }
  }, [requireAuth]);

  // Email sign-in deliberately does *not* link: linking an unused address would create the
  // account, so a typo on the sign-in form would silently register someone.
  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const instance = requireAuth();
      try {
        await signInWithEmailAndPassword(instance, email.trim(), password);
      } catch (error) {
        throw new AppError(authErrorCode(error));
      }
    },
    [requireAuth],
  );

  const registerWithEmail = useCallback(
    async (name: string, email: string, password: string) => {
      const instance = requireAuth();
      try {
        // Registering upgrades the guest session in place, so anything the device stored
        // against the uid survives the sign-up.
        const guest = instance.currentUser;
        const credential = guest?.isAnonymous
          ? await linkWithCredential(guest, EmailAuthProvider.credential(email.trim(), password))
          : await createUserWithEmailAndPassword(instance, email.trim(), password);
        if (name.trim()) await updateProfile(credential.user, { displayName: name.trim() });
        await syncUserProfile(credential.user, name);
      } catch (error) {
        if (isLinkConflict(error)) throw new AppError('emailInUse');
        throw new AppError(authErrorCode(error));
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
        throw new AppError(authErrorCode(error));
      }
    },
    [requireAuth],
  );

  const signOutUser = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  }, []);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    const current = auth?.currentUser;
    // A guest token buys nothing on the API (no orders, no entitlements, no classes), so
    // handing one out would only produce confusing "owns nothing" answers.
    if (!current || current.isAnonymous) return null;
    try {
      return await current.getIdToken();
    } catch {
      return null;
    }
  }, []);

  const updateDisplayName = useCallback(async (raw: string) => {
    const current = auth?.currentUser;
    // A guest has a uid but no profile document, so there is nothing to rename.
    if (!db || !current || current.isAnonymous) throw new AppError('nameSignIn');
    const name = normalizeDisplayName(raw);
    if (name.length < DISPLAY_NAME_MIN) {
      throw new AppError('nameTooShort', undefined, String(DISPLAY_NAME_MIN));
    }

    const uid = current.uid;
    const ref = doc(db, 'users', uid);
    // Read fresh rather than trusting the cached profile: another device (or the admin)
    // may have renamed the account since this tab loaded.
    const snapshot = await getDoc(ref);
    const data = (snapshot.data() ?? {}) as UserProfile;
    const lastChanged = displayNameCooldownEndsAt(data);
    if (lastChanged && Date.now() < lastChanged) {
      throw new AppError('nameCooldown', undefined, dateLabel(lastChanged));
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
      uid: identity?.uid ?? null,
      isGuest: Boolean(identity?.isAnonymous),
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
      identity?.uid,
      identity?.isAnonymous,
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
