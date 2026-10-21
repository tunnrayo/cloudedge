/**
 * ADMIN AUTHENTICATION
 *
 * One administrator password (ADMIN_PASSWORD) protects /admin. After login the browser gets a
 * signed, http-only cookie valid for 8 hours. The signature uses ADMIN_SESSION_SECRET, so the
 * cookie cannot be forged. Uses Web Crypto so it works in both the proxy and server code.
 * If either variable is missing or too short, the admin area stays locked.
 */
export const SESSION_COOKIE = "ce_admin";
export const SESSION_HOURS = 8;
const enc = new TextEncoder();

export function adminConfig(): { ok: true; password: string; secret: string } | { ok: false; reason: string } {
  const password = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  if (password.length < 12) return { ok: false, reason: "ADMIN_PASSWORD is not set or is shorter than 12 characters." };
  if (secret.length < 32) return { ok: false, reason: "ADMIN_SESSION_SECRET is not set or is shorter than 32 characters." };
  return { ok: true, password, secret };
}

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf : new Uint8Array(buf)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createSessionToken(secret: string): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ exp: Date.now() + SESSION_HOURS * 3600_000, n: b64url(crypto.getRandomValues(new Uint8Array(12))) })));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export async function verifySessionToken(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  try {
    const valid = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromB64url(sig), enc.encode(payload));
    if (!valid) return false;
    const { exp } = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as { exp: number };
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

/** Constant-time password comparison (compares HMACs so length differences don't leak). */
export async function passwordMatches(input: string, expected: string, secret: string): Promise<boolean> {
  const key = await hmacKey(secret);
  const [a, b] = await Promise.all([crypto.subtle.sign("HMAC", key, enc.encode(input)), crypto.subtle.sign("HMAC", key, enc.encode(expected))]);
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
