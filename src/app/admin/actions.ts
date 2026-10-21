"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminConfig, createSessionToken, passwordMatches, SESSION_COOKIE, SESSION_HOURS } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-session";
import { getStore, isStatus } from "@/lib/inquiries";
import { clientIp, rateLimited } from "@/lib/rate-limit";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const cfg = adminConfig();
  if (!cfg.ok) return { error: "The admin area is not configured yet. See HANDOVER.md (Admin setup)." };
  const ip = clientIp(await headers());
  if (rateLimited(`login:${ip}`, 5, 15 * 60_000)) return { error: "Too many attempts. Please wait 15 minutes and try again." };
  const password = String(form.get("password") ?? "").slice(0, 200);
  if (!(await passwordMatches(password, cfg.password, cfg.secret))) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return { error: "Incorrect password." };
  }
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(cfg.secret), {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_HOURS * 3600,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

export async function updateInquiry(form: FormData) {
  await requireAdmin();
  const store = getStore();
  const id = String(form.get("id") ?? "");
  const status = form.get("status");
  const notes = String(form.get("notes") ?? "").slice(0, 5000);
  if (!store || !id) return;
  await store.update(id, { status: isStatus(status) ? status : undefined, notes });
  revalidatePath("/admin");
  redirect(`/admin/inquiries/${id}?saved=1`);
}

export async function deleteInquiry(form: FormData) {
  await requireAdmin();
  const store = getStore();
  const id = String(form.get("id") ?? "");
  if (!store || !id) return;
  if (form.get("confirm") !== "yes") redirect(`/admin/inquiries/${id}?confirm=1`);
  await store.remove(id);
  revalidatePath("/admin");
  redirect("/admin?deleted=1");
}
