import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, getUserBySessionToken } from "./session";

const PUBLIC_PATHS = ["/login"];

/*
 * Route guard. Next.js 16 runs Proxy in the Node.js runtime by default, so the
 * SQLite-backed session lookup can happen here directly — no network hop and
 * no separate auth service.
 *
 * Pages and actions still re-check permissions themselves; this is the
 * navigational layer, not the security boundary.
 */
export async function updateSession(request: NextRequest) {
  const user = getUserBySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    return NextResponse.redirect(url);
  };

  if (!user) {
    if (isPublicPath) return NextResponse.next();
    const response = redirectTo("/login");
    // Drop a stale or expired session cookie so the browser stops sending it.
    if (request.cookies.has(SESSION_COOKIE)) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (isPublicPath) return redirectTo("/");

  if (user.mustChangePassword && pathname !== "/change-password") {
    return redirectTo("/change-password");
  }

  if (!user.mustChangePassword && pathname === "/change-password") {
    return redirectTo("/");
  }

  if (pathname.startsWith("/admin") && user.role !== "admin") {
    return redirectTo("/");
  }

  return NextResponse.next();
}
