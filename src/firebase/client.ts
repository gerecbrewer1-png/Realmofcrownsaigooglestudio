/**
 * Realm of Crowns - Firebase Client Initialization
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp;
let firestore: Firestore | null = null;

if (!getApps().length) {
  app = initializeApp({
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
  });
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);

// Use custom database ID if provisioned
try {
  if (firebaseConfig.firestoreDatabaseId) {
    firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } else {
    firestore = getFirestore(app);
  }
} catch (e) {
  console.warn('Firestore initialization notice:', e);
  firestore = getFirestore(app);
}

export const db = firestore;

// Test server connectivity per skill instructions
export async function testFirestoreConnection(): Promise<boolean> {
  if (!db) return false;
  try {
    await getDocFromServer(doc(db, 'system', 'ping'));
    return true;
  } catch (error) {
    // Offline or initial collection notice is acceptable during startup
    return false;
  }
}

export function initAuthSession(onUserReady: (user: User) => void): void {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      onUserReady(user);
    } else {
      try {
        const cred = await signInAnonymously(auth);
        onUserReady(cred.user);
      } catch (err) {
        console.warn('Anonymous sign-in fallback:', err);
      }
    }
  });
}
