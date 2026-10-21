"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate, endSession, registerCustomer, startSession, validateRegistration } from "@/lib/shop/customers";
import { clientIp, rateLimited } from "@/lib/rate-limit";

export type AuthState = { error?: string; fields?: Record<string, string>; values?: Record<string, string> };
const safeNext = (v: unknown) => { const s = String(v ?? ""); return /^\/[a-zA-Z0-9/_?=&-]*$/.test(s) && !s.startsWith("//") ? s : "/account"; };

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(form.get("password") ?? "").slice(0, 200);
  if (rateLimited(`custlogin:${clientIp(await headers())}`, 8, 15 * 60_000)) return { error: "Too many attempts. Please wait 15 minutes.", values: { email } };
  const c = await authenticate(email, password);
  if (!c) return { error: "Email or password is incorrect.", values: { email } };
  await startSession(c.id);
  redirect(safeNext(form.get("next")));
}

export async function register(_: AuthState, form: FormData): Promise<AuthState> {
  const values = { name: String(form.get("name") ?? "").slice(0, 100), email: String(form.get("email") ?? "").trim().toLowerCase().slice(0, 200), phone: String(form.get("phone") ?? "").slice(0, 30) };
  const password = String(form.get("password") ?? "");
  if (rateLimited(`custreg:${clientIp(await headers())}`, 5, 60 * 60_000)) return { error: "Too many sign-ups from this network. Please try later.", values };
  const fields = validateRegistration({ ...values, password });
  if (password !== String(form.get("confirm") ?? "")) fields.confirm = "Passwords do not match.";
  if (Object.keys(fields).length) return { error: "Please correct the highlighted fields.", fields, values };
  try {
    const c = await registerCustomer(values.name, values.email, password, values.phone);
    await startSession(c.id);
  } catch (e) {
    if ((e as Error).message === "EMAIL_TAKEN") return { error: "An account with this email already exists. Please sign in.", values };
    throw e;
  }
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await endSession();
  redirect("/");
}
