import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Determine if we are running in an automated test environment
export function isTestEnv(): boolean {
  return (
    (process.env.NODE_ENV === 'test' || process.env.ROC_TEST_MODE === '1') &&
    process.env.NODE_ENV !== 'production'
  );
}

export const IS_TEST_ENV = isTestEnv();

let firebaseAdminApp: any = null;

export function getFirebaseAdmin(): any {
  if (firebaseAdminApp) {
    return firebaseAdminApp;
  }

  // Prevent multiple initializations
  const apps = (admin as any).apps;
  if (apps && apps.length > 0) {
    firebaseAdminApp = apps[0];
    return firebaseAdminApp;
  }

  // Require credentials unless we are heavily mocked in test mode
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    if (isTestEnv()) {
      console.warn('[AUTH] Missing GOOGLE_APPLICATION_CREDENTIALS. Mocking Firebase Admin for test mode.');
      // Create a dummy app for test mode if necessary
      firebaseAdminApp = (admin as any).initializeApp({
        projectId: 'test-project-realm',
      });
      return firebaseAdminApp;
    } else {
      console.error('[AUTH ERROR] Missing GOOGLE_APPLICATION_CREDENTIALS environment variable. Firebase Admin requires secure credentials for production.');
      throw new Error('Missing GOOGLE_APPLICATION_CREDENTIALS');
    }
  }

  try {
    firebaseAdminApp = (admin as any).initializeApp({
      credential: (admin as any).credential.applicationDefault(),
    });
    console.log('[AUTH] Firebase Admin initialized successfully.');
  } catch (error) {
    console.error('[AUTH ERROR] Failed to initialize Firebase Admin:', error);
    throw error;
  }

  return firebaseAdminApp;
}
