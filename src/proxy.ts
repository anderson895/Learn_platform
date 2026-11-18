import { NextResponse, type NextRequest } from "next/server";
import { PROTECTED_PREFIXES, SESSION_COOKIE } from "@/lib/auth/constants";

/**
 * Mabilis na pag-check bago mag-render: kapag walang session cookie ang protektadong route, ire-redirect agad sa /login.
 * Ang totoong pag-verify ng cookie at role ay ginagawa sa server (`requireUser` sa mga layout).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (isProtected && !request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
