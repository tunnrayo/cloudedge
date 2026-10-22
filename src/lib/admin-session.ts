import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminConfig } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { SESSION_COOKIE, actorLabel, looksLikeToken, validateSession } from "@/lib/admin-sessions";

export type AdminSession = { id: string; actor: string };

/** The signed-in administrator for this request, or null. Checked against the database on every request (fails closed). */
export const currentAdmin = cache(async (): Promise<AdminSession | null> => {
  const cfg = adminConfig();
  if (!cfg.ok) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!looksLikeToken(token)) return null;
  try {
    const s = await validateSession(await getDb(), token, { secret: cfg.secret });
    return s ? { id: s.id, actor: actorLabel(s.id) } : null;
  } catch (e) {
    console.error("[admin] session check failed:", (e as Error).name);
    return null;
  }
});

export async function isAdmin(): Promise<boolean> {
  return (await currentAdmin()) !== null;
}

/** Call at the top of every admin page, action and route. Redirects to the login page if not signed in. */
export async function requireAdmin(): Promise<AdminSession> {
  const a = await currentAdmin();
  if (!a) redirect("/admin/login");
  return a;
}
