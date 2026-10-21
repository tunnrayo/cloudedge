/**
 * CUSTOMER ACCOUNTS (server-only)
 * Passwords are hashed with scrypt (random salt). Sessions are random tokens; only their SHA-256
 * hash is stored, so a database leak does not reveal usable session cookies. Cookie: http-only,
 * SameSite=Lax, Secure in production, 30 days.
 */
import "server-only";
import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
export const CUSTOMER_COOKIE = "ce_customer";
const DAYS = 30;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}
export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, s, h] = stored.split("$");
  if (alg !== "scrypt" || !s || !h) return false;
  const expected = Buffer.from(h, "base64");
  const got = await scrypt(pw, Buffer.from(s, "base64"), expected.length);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export type Customer = { id: string; email: string; name: string; phone: string };

export function validateRegistration(i: { name: string; email: string; password: string }) {
  const e: Record<string, string> = {};
  if (i.name.trim().length < 2) e.name = "Please enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(i.email)) e.email = "Please enter a valid email address.";
  if (i.password.length < 10) e.password = "Use at least 10 characters.";
  else if (i.password.length > 200) e.password = "Password is too long.";
  return e;
}

export async function registerCustomer(name: string, email: string, password: string, phone = ""): Promise<Customer> {
  const db = await getDb();
  const id = randomUUID();
  const r = await db.query("INSERT INTO customers (id, email, name, phone, password_hash) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING RETURNING id",
    [id, email.toLowerCase().trim(), name.trim().slice(0, 100), phone.trim().slice(0, 30), await hashPassword(password)]);
  if (!r.rowCount) throw new Error("EMAIL_TAKEN");
  return { id, email: email.toLowerCase().trim(), name: name.trim(), phone };
}

export async function authenticate(email: string, password: string): Promise<Customer | null> {
  const db = await getDb();
  const r = await db.query<{ id: string; email: string; name: string; phone: string; password_hash: string }>("SELECT * FROM customers WHERE email = $1", [email.toLowerCase().trim()]);
  const c = r.rows[0];
  // Always run scrypt so response time does not reveal whether the email exists.
  const ok = await verifyPassword(password, c?.password_hash ?? "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + "A".repeat(86) + "==");
  return c && ok ? { id: c.id, email: c.email, name: c.name, phone: c.phone } : null;
}

export async function startSession(customerId: string) {
  const token = randomBytes(32).toString("base64url");
  const db = await getDb();
  await db.query("INSERT INTO customer_sessions (token_hash, customer_id, expires_at) VALUES ($1,$2,NOW() + ($3 || ' days')::interval)", [sha256(token), customerId, String(DAYS)]);
  await db.query("DELETE FROM customer_sessions WHERE expires_at < NOW()");
  (await cookies()).set(CUSTOMER_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DAYS * 86400 });
}

export async function currentCustomer(): Promise<Customer | null> {
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  try {
    const r = await (await getDb()).query<Customer>(
      "SELECT c.id, c.email, c.name, c.phone FROM customer_sessions s JOIN customers c ON c.id = s.customer_id WHERE s.token_hash = $1 AND s.expires_at > NOW()", [sha256(token)]);
    return r.rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(CUSTOMER_COOKIE)?.value;
  if (token) await (await getDb()).query("DELETE FROM customer_sessions WHERE token_hash = $1", [sha256(token)]).catch(() => {});
  jar.delete(CUSTOMER_COOKIE);
}
