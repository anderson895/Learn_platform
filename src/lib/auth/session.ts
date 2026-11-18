import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { Role, User } from "@/domain/users/User";
import { getAdminAuth } from "@/lib/firebase/admin";
import { AccountRepository } from "@/repositories/AccountRepository";
import { StudentProfileRepository } from "@/repositories/StudentProfileRepository";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "./constants";

/** Ginagawang httpOnly session cookie ang bagong ID token (pagkatapos mag-login, mag-register o magpalit ng password). */
export async function createSession(idToken: string): Promise<void> {
  const sessionCookie = await getAdminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_SECONDS * 1000 });
  (await cookies()).set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Ang kasalukuyang naka-login na user, o `null`.
 * Bine-verify ang cookie (kasama kung na-revoke) at binabasa ang account, para hindi makapasok ang inactive account.
 * Naka-`cache` para isang beses lang ito tumakbo sa bawat request.
 */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;
  // Sa bawat request ito dapat tumakbo: gumagamit ng kasalukuyang oras ang pag-verify ng cookie (expiry).
  await connection();
  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    const user = await new AccountRepository().findById(decoded.uid);
    return user && user.isActive() ? user : null;
  } catch {
    return null;
  }
});

/** Para sa mga protektadong layout at page. Ire-redirect sa /login kung hindi naka-login, o sa sariling home kung bawal ang role. */
export async function requireUser(allowed?: Role[]): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (allowed && !allowed.includes(user.role)) redirect(user.homePath);
  return user;
}

export type Viewer = { uid: string; role: Role; username: string; email: string; displayName: string };

/** Impormasyong ipinapakita sa header (pangalan at role). Ligtas itong ipasa sa Client Components. */
export const getViewer = cache(async (user: User): Promise<Viewer> => {
  let displayName = user.username;
  if (user.role === "student") {
    const profile = await new StudentProfileRepository().findById(user.id);
    if (profile) displayName = profile.fullName;
  }
  return { uid: user.id, role: user.role, username: user.username, email: user.email, displayName };
});
