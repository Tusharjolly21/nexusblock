import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

/** Whether Firebase is configured (env vars present). */
export const isFirebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)

const app: FirebaseApp | null = isFirebaseConfigured ? initializeApp(config) : null

/**
 * Shared Firebase Auth + Firestore instances. Null until the env vars are set —
 * the app still runs, auth/sync just stay disabled with a console hint. These
 * values are safe to expose in the frontend (they identify the project).
 */
export const auth: Auth | null = app ? getAuth(app) : null
export const db: Firestore | null = app ? getFirestore(app) : null
