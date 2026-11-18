import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK. SERVER LANG ito gagamitin.
 * Ito ang ginagamit ng mga repository (Firestore), at ng session cookie at role claims (Auth).
 */
function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Sa .env, naka-escape ang newline ng private key bilang "\n".
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Kulang ang Firebase Admin credentials. Punan ang FIREBASE_ADMIN_CLIENT_EMAIL at " +
        "FIREBASE_ADMIN_PRIVATE_KEY sa .env.local (Firebase Console > Project settings > Service accounts).",
    );
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
