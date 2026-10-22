/**
 * ADMIN CONFIGURATION AND PASSWORD CHECK
 *
 * One administrator password (ADMIN_PASSWORD) protects /admin. ADMIN_SESSION_SECRET is a separate secret used to
 * key the hashes of session tokens and visitor addresses. Sessions themselves are stored in the database
 * (see admin-sessions.ts), so they can be revoked. If either variable is missing or too short, the admin area stays locked.
 */

export function adminConfig(): { ok: true; password: string; secret: string } | { ok: false; reason: string } {
  const password = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  if (password.length < 12) return { ok: false, reason: "ADMIN_PASSWORD is not set or is shorter than 12 characters." };
  if (secret.length < 32) return { ok: false, reason: "ADMIN_SESSION_SECRET is not set or is shorter than 32 characters." };
  return { ok: true, password, secret };
}

const enc = new TextEncoder();

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
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
