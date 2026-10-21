import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminConfig, SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function isAdmin(): Promise<boolean> {
  const cfg = adminConfig();
  if (!cfg.ok) return false;
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value, cfg.secret);
}

/** Call at the top of every admin page and action. Redirects to the login page if not signed in. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
