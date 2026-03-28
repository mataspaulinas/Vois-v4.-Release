import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  onIdTokenChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";

let persistenceConfigured = false;

function getFirebaseConfig() {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_WEB_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };
  return Object.fromEntries(Object.entries(config).filter(([, value]) => Boolean(value)));
}

export function firebaseConfigured() {
  const config = getFirebaseConfig();
  return Boolean(
    config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.storageBucket &&
      config.messagingSenderId &&
      config.appId
  );
}

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseConfigured()) {
    throw new Error("Firebase web auth is not configured for this build.");
  }
  return getApps().length ? getApp() : initializeApp(getFirebaseConfig());
}

export async function ensureFirebaseAuth() {
  const auth = getAuth(getFirebaseApp());
  if (!persistenceConfigured) {
    await setPersistence(auth, browserLocalPersistence);
    persistenceConfigured = true;
  }
  return auth;
}

export async function signInWithFirebaseEmailPassword(email: string, password: string): Promise<User> {
  const auth = await ensureFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signOutFirebaseUser(): Promise<void> {
  const auth = await ensureFirebaseAuth();
  await signOut(auth);
}

export function observeFirebaseUser(callback: (user: User | null) => void) {
  if (!firebaseConfigured()) {
    callback(null);
    return () => undefined;
  }
  const auth = getAuth(getFirebaseApp());
  return onIdTokenChanged(auth, callback);
}
