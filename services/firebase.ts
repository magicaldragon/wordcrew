/**
 * Firebase bootstrap for the WordCrew portal.
 *
 * Only the *public* web config lives here (Vite env vars). Those keys identify the
 * project to Google, they are not secrets — the real gate is the Firestore security
 * rules plus the ID-token check the API worker performs before minting an order.
 *
 * Everything is optional: the game must stay playable (demo) when Firebase is not
 * configured, so callers should check `firebaseConfigured` before using `auth`/`db`.
 */

import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const options: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** True when `.env.local` carries a complete web config; auth UI is hidden otherwise. */
export const firebaseConfigured = Boolean(
  options.apiKey && options.authDomain && options.projectId && options.appId,
);

/** Sent to the worker so it can validate `aud`/`iss` on the ID token. */
export const firebaseProjectId = String(options.projectId || '');

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let googleProviderInstance: GoogleAuthProvider | null = null;

if (firebaseConfigured) {
  app = initializeApp(options);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  googleProviderInstance = new GoogleAuthProvider();
  // Always let the player pick which Google account to use — classroom machines are
  // often shared.
  googleProviderInstance.setCustomParameters({ prompt: 'select_account' });
} else if (import.meta.env.DEV) {
  console.warn(
    '[WordCrew] Firebase web config missing — set VITE_FIREBASE_* in .env.local to enable sign-in.',
  );
}

export const auth = authInstance;
export const db = dbInstance;
export const googleProvider = googleProviderInstance;
