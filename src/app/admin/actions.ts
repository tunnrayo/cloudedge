"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminConfig, passwordMatches } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-session";
import { getDb } from "@/lib/db";
import { getStore, isStatus } from "@/lib/inquiries";
import { clientIp } from "@/lib/rate-limit";
import { SESSION_COOKIE, SESSION_HOURS, createSession, ipHash, loginBlocked, looksLikeToken, purgeOld, recordLoginAttempt, revokeAllSessions, revokeSession } from "@/lib/admin-sessions";
import { audit } from "@/lib/audit-server";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const cfg = adminConfig();
  if (!cfg.ok) return { error: "The admin area is not configured yet. See HANDOVER.md (Admin setup)." };
  const h = await headers();
  const ipH = ipHash(clientIp(h), cfg.secret);
  let db;
  try { db = await getDb(); } catch { return { error: "The database is not available, so sign-in is temporarily disabled. Please try again shortly." }; }
  try {
    if (await loginBlocked(db, ipH)) {
      await audit({ type: "admin.login", outcome: "denied", summary: "Sign-in blocked: too many failed attempts", actor: "anonymous" });
      return { error: "Too many failed attempts. Please wait 15 minutes and try again." };
    }
    const password = String(form.get("password") ?? "").slice(0, 200);
    if (!(await passwordMatches(password, cfg.password, cfg.secret))) {
      await recordLoginAttempt(db, ipH, false);
      await audit({ type: "admin.login", outcome: "failure", summary: "Wrong password", actor: "anonymous" });
      await new Promise((r) => setTimeout(r, 600)); // slow down guessing
      return { error: "Incorrect password." };
    }
    const jar = await cookies();
    // Rotation: a cookie from an earlier sign-in is revoked, and the new session gets a brand-new token.
    const old = jar.get(SESSION_COOKIE)?.value;
    if (looksLikeToken(old)) await revokeSession(db, old, { secret: cfg.secret, reason: "replaced by new sign-in" });
    const s = await createSession(db, { secret: cfg.secret, ip: clientIp(h), userAgent: h.get("user-agent") ?? "" });
    await recordLoginAttempt(db, ipH, true);
    await purgeOld(db).catch(() => {});
    jar.set(SESSION_COOKIE, s.token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_HOURS * 3600 });
    await audit({ type: "admin.login", outcome: "success", summary: "Signed in", actor: `admin#${s.id.slice(0, 8)}` });
  } catch (e) {
    console.error("[admin] sign-in failed:", (e as Error).name);
    return { error: "Sign-in is temporarily unavailable. Please try again shortly." };
  }
  redirect("/admin");
}

export async function logout() {
  const jar = await cookies();
  const cfg = adminConfig();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (cfg.ok && looksLikeToken(token)) {
    try {
      await audit({ type: "admin.logout", summary: "Signed out" });
      await revokeSession(await getDb(), token, { secret: cfg.secret, reason: "logout" });
    } catch (e) { console.error("[admin] logout could not revoke the session:", (e as Error).name); }
  }
  jar.delete(SESSION_COOKIE);
  redirect("/admin/login");
}

/** Signs out every other device/browser (the current session stays). */
export async function signOutOthers() {
  const me = await requireAdmin();
  const n = await revokeAllSessions(await getDb(), { exceptId: me.id, reason: "sign out everywhere" });
  await audit({ type: "admin.sessions_revoked", summary: `Signed out ${n} other session(s)`, details: { count: n } });
  redirect(`/admin/audit?ok=${encodeURIComponent(`${n} other session(s) signed out.`)}`);
}

export async function updateInquiry(form: FormData) {
  await requireAdmin();
  const store = getStore();
  const id = String(form.get("id") ?? "");
  const status = form.get("status");
  const notes = String(form.get("notes") ?? "").slice(0, 5000);
  if (!store || !id) return;
  await store.update(id, { status: isStatus(status) ? status : undefined, notes });
  await audit({ type: "inquiry.update", target: "inquiry", targetId: id, summary: `Inquiry updated${isStatus(status) ? ` (status: ${status})` : ""}` });
  revalidatePath("/admin/inquiries");
  redirect(`/admin/inquiries/${id}?saved=1`);
}

export async function deleteInquiry(form: FormData) {
  await requireAdmin();
  const store = getStore();
  const id = String(form.get("id") ?? "");
  if (!store || !id) return;
  if (form.get("confirm") !== "yes") redirect(`/admin/inquiries/${id}?confirm=1`);
  await store.remove(id);
  await audit({ type: "inquiry.delete", target: "inquiry", targetId: id, summary: "Inquiry deleted" });
  revalidatePath("/admin");
  redirect("/admin/inquiries?deleted=1");
}
