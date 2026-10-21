/**
 * Runs before admin requests. Redirects anyone without a valid admin session to the login page.
 * (Each admin page and action ALSO checks the session itself — this is the first line of defence.)
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminConfig, SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  const cfg = adminConfig();
  const ok = cfg.ok && (await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value, cfg.secret));
  if (!ok) {
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
