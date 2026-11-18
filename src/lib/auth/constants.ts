/** Pangalan at tagal ng session cookie. Ginagamit din ng `src/proxy.ts`, kaya walang server-only import dito. */
export const SESSION_COOKIE = "__session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5; // 5 araw (maximum ng Firebase ay 14 araw)

/** Mga route na kailangang naka-login. */
export const PROTECTED_PREFIXES = ["/admin", "/learn", "/profile", "/achievements", "/announcements", "/oversight"];
