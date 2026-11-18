// Shared na Firebase Admin setup para sa mga script sa `scripts/`.
// Binabasa ang `.env.local` sa parehong paraan ng Next.js.

import nextEnv from "@next/env";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

export const ROLES = ["admin", "chairman", "student"];

export function initFirebase() {
  nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    console.error("Kulang ang Firebase Admin credentials sa .env.local.");
    process.exit(1);
  }

  const app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return { projectId, auth: getAuth(app), db: getFirestore(app) };
}

/** Hinahanap ang user gamit ang email. `null` kapag wala. */
export async function findUserByEmail(auth, email) {
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    if (error?.code === "auth/user-not-found") return null;
    throw error;
  }
}

/**
 * Sine-set ang role ng user:
 * - custom claim na { role }, na binabasa ng server
 * - `accounts/{uid}` sa Firestore (username, email, role, status, createdAt)
 */
export async function assignRole({ auth, db }, user, role, username) {
  await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), role });

  const ref = db.collection("accounts").doc(user.uid);
  const existing = await ref.get();
  await ref.set(
    {
      username: existing.get("username") ?? username ?? user.displayName ?? user.email.split("@")[0],
      email: user.email,
      role,
      status: "active",
      ...(existing.exists ? {} : { createdAt: Timestamp.now() }),
    },
    { merge: true },
  );
}
