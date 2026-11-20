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
import { initializeFirestore, type Firestore } from 'firebase/firestore';

/**
 * The configured auth domain, or the origin serving the app when it says `self`.
 *
 * Google sign-in hands its result back through storage on `authDomain`. Safari 16.1+ and
 * Chrome M115+ partition third-party storage, so when `authDomain` is `wordcrew.firebaseapp.com`
 * while the app is on its own domain, that storage is a different site and the hand-back is
 * dropped — the page simply reloads, still signed out. `self` makes the Worker serve
 * `/__/auth/*` from the app's own origin (worker/index.ts), which keeps the hand-back
 * first-party and is the fix Firebase documents for browsers that block third-party storage.
 */
const authDomain = (() => {
  const configured = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  if (configured !== 'self') return configured;
  if (typeof window === 'undefined' || !/^https?:$/.test(window.location.protocol)) {
    return configured;
  }
  return window.location.host;
})();

const options: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain,
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
  // Live listeners (`onSnapshot`) default to a streaming WebChannel. School networks,
  // WebViews and proxies routinely answer that stream with a 400 and Firestore then
  // retries in silence — no snapshot, no error — so every screen fed by a listener
  // sits on its spinner forever. Long polling moves the same data over ordinary
  // requests, which those networks do let through.
  dbInstance = initializeFirestore(app, { experimentalForceLongPolling: true });
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
