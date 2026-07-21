import { NextResponse, type NextRequest } from "next/server";
import { authConfigured, verifySessionToken, SESSION_COOKIE_NAME } from "./app/lib/session";

/**
 * Gates every dashboard page behind a real login, fail-closed like the eve
 * channel's own httpBasic() auth. /eve/* is untouched — that's eve's own
 * route-auth boundary (agent/channels/eve.ts), a separate system by design.
 *
 * Named proxy.ts, not middleware.ts — Next.js 16 deprecated the
 * middleware.ts convention in favor of proxy.ts; same request-interception
 * contract, new file name.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/eve/") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/setup-required") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (!authConfigured()) {
    return NextResponse.redirect(new URL("/setup-required", request.url));
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!(await verifySessionToken(token))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
