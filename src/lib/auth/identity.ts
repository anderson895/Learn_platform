import "server-only";

export type SignInResult =
  | { ok: true; uid: string; idToken: string }
  | { ok: false; reason: "invalid_credentials" | "disabled" | "too_many_attempts" | "unknown" };

/**
 * Sine-sign in ang user sa SERVER gamit ang Firebase Auth REST API (email + password → ID token).
 * Ang ID token ay ginagawang httpOnly session cookie sa `session.ts`, kaya walang Firebase token na hinahawakan ang browser.
 */
export async function signInWithPassword(email: string, password: string): Promise<SignInResult> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("Kulang ang NEXT_PUBLIC_FIREBASE_API_KEY sa .env.local.");

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
    cache: "no-store",
  });
  const body = (await response.json()) as { localId?: string; idToken?: string; error?: { message?: string } };

  if (response.ok && body.localId && body.idToken) {
    return { ok: true, uid: body.localId, idToken: body.idToken };
  }

  const message = body.error?.message ?? "";
  if (/INVALID_LOGIN_CREDENTIALS|EMAIL_NOT_FOUND|INVALID_PASSWORD|INVALID_EMAIL/.test(message)) {
    return { ok: false, reason: "invalid_credentials" };
  }
  if (message.startsWith("USER_DISABLED")) return { ok: false, reason: "disabled" };
  if (message.startsWith("TOO_MANY_ATTEMPTS_TRY_LATER")) return { ok: false, reason: "too_many_attempts" };
  console.error("[auth] signInWithPassword failed:", message || response.status);
  return { ok: false, reason: "unknown" };
}
