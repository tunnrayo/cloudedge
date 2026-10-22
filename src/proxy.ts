/**
 * Runs before admin requests. First, cheap line of defence: anyone without a session cookie of the right shape
 * is sent to the login page. This does NOT prove the session is valid — every admin page, action and download
 * checks the session against the database itself (requireAdmin / isAdmin), so a forged cookie that passes this
 * shape check still gets nothing.
 */
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, looksLikeToken } from "@/lib/admin-sessions";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (!looksLikeToken(req.cookies.get(SESSION_COOKIE)?.value)) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = { matcher: ["/admin/:path*"] };
