import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/**
 * Firebase client SDK. Sa browser lang ito gagamitin, para sa Firebase Authentication (sign-in at sign-out).
 * Lahat ng pagbasa at pagsulat sa Firestore ay dumadaan sa server (Admin SDK).
 * Tingnan ang `src/lib/firebase/admin.ts`.
 *
 * Literal na `process.env.NEXT_PUBLIC_*` ang ginamit para ma-inline ng Next.js ang mga value sa browser bundle.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error("Kulang ang NEXT_PUBLIC_FIREBASE_* sa .env.local.");
  }
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}
