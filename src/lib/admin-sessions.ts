/**
 * ADMIN SESSIONS (database-backed, no framework imports so they can be unit-tested)
 *
 * - The browser cookie holds a random 256-bit token. The database stores only an HMAC of it (keyed with
 *   ADMIN_SESSION_SECRET), so a database leak cannot be turned into a working cookie, and changing the
 *   secret signs everybody out.
 * - A session ends when: it is revoked (logout / "sign out everywhere"), it passes its absolute lifetime
 *   (8 hours) or it has been idle too long (2 hours).
 * - Sessions live in PostgreSQL, so logout works on every app instance and survives restarts.
 * - Sign-in attempts are counted in the database too, so the brute-force limit also works across instances.
 */
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import type { Db } from "./db-types.ts";

export const SESSION_COOKIE = "ce_admin";
export const SESSION_HOURS = 8;
export const IDLE_MINUTES = 120;
export const LOGIN_WINDOW_MINUTES = 15;
export const LOGIN_MAX_FAILURES_PER_IP = 5;
export const LOGIN_MAX_FAILURES_GLOBAL = 60;
const TOKEN_RE = /^[0-9a-f]{64}$/;

export const looksLikeToken = (t: string | undefined | null): t is string => typeof t === "string" && TOKEN_RE.test(t);
const mac = (secret: string, label: string, value: string) => createHmac("sha256", secret).update(`${label}:${value}`).digest("hex");
export const tokenHash = (token: string, secret: string) => mac(secret, "session", token);
export const ipHash = (ip: string, secret: string) => mac(secret, "ip", ip).slice(0, 32);
/** Short, non-secret label for an administrator session, shown in the audit log. */
export const actorLabel = (sessionId: string) => `admin#${sessionId.slice(0, 8)}`;

export type Opts = { secret: string; now?: Date };

export async function createSession(db: Db, o: Opts & { ip: string; userAgent?: string }): Promise<{ token: string; id: string; expiresAt: Date }> {
  const now = o.now ?? new Date();
  const token = randomBytes(32).toString("hex");
  const id = randomUUID();
  const expiresAt = new Date(now.getTime() + SESSION_HOURS * 3600_000);
  await db.query(
    `INSERT INTO admin_sessions (id, token_hash, created_at, last_seen_at, expires_at, ip_hash, user_agent) VALUES ($1,$2,$3,$3,$4,$5,$6)`,
    [id, tokenHash(token, o.secret), now, expiresAt, ipHash(o.ip, o.secret), (o.userAgent ?? "").slice(0, 200)],
  );
  return { token, id, expiresAt };
}

/** Returns the session id when the token is valid right now, otherwise null. Garbage never reaches the database. */
export async function validateSession(db: Db, token: string | undefined | null, o: Opts): Promise<{ id: string } | null> {
  if (!looksLikeToken(token)) return null;
  const now = o.now ?? new Date();
  const idleLimit = new Date(now.getTime() - IDLE_MINUTES * 60_000);
  const r = await db.query<{ id: string; last_seen_at: Date | string }>(
    `SELECT id, last_seen_at FROM admin_sessions WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > $2 AND last_seen_at > $3`,
    [tokenHash(token, o.secret), now, idleLimit],
  );
  const row = r.rows[0];
  if (!row) return null;
  if (now.getTime() - new Date(row.last_seen_at).getTime() > 60_000) await db.query(`UPDATE admin_sessions SET last_seen_at = $2 WHERE id = $1`, [row.id, now]);
  return { id: row.id };
}

export async function revokeSession(db: Db, token: string | undefined | null, o: Opts & { reason?: string }): Promise<boolean> {
  if (!looksLikeToken(token)) return false;
  const r = await db.query(`UPDATE admin_sessions SET revoked_at = $2, revoked_reason = $3 WHERE token_hash = $1 AND revoked_at IS NULL`, [tokenHash(token, o.secret), o.now ?? new Date(), o.reason ?? "logout"]);
  return r.rowCount > 0;
}

export async function revokeAllSessions(db: Db, o: { now?: Date; reason?: string; exceptId?: string } = {}): Promise<number> {
  const r = await db.query(
    `UPDATE admin_sessions SET revoked_at = $1, revoked_reason = $2 WHERE revoked_at IS NULL AND expires_at > $1 AND ($3::uuid IS NULL OR id <> $3::uuid)`,
    [o.now ?? new Date(), o.reason ?? "sign out everywhere", o.exceptId ?? null],
  );
  return r.rowCount;
}

export async function activeSessionCount(db: Db, now = new Date()): Promise<number> {
  const idleLimit = new Date(now.getTime() - IDLE_MINUTES * 60_000);
  return Number((await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM admin_sessions WHERE revoked_at IS NULL AND expires_at > $1 AND last_seen_at > $2`, [now, idleLimit])).rows[0].n);
}

/** Housekeeping: removes sessions that ended more than a week ago and old sign-in attempts. */
export async function purgeOld(db: Db, now = new Date()): Promise<void> {
  await db.query(`DELETE FROM admin_sessions WHERE expires_at < $1`, [new Date(now.getTime() - 7 * 86400_000)]);
  await db.query(`DELETE FROM admin_login_attempts WHERE created_at < $1`, [new Date(now.getTime() - 2 * 86400_000)]);
}

export async function recordLoginAttempt(db: Db, hashedIp: string, succeeded: boolean, now = new Date()): Promise<void> {
  await db.query(`INSERT INTO admin_login_attempts (ip_hash, succeeded, created_at) VALUES ($1,$2,$3)`, [hashedIp, succeeded, now]);
}

/** True when this visitor (or everybody together) has failed too often in the last 15 minutes. */
export async function loginBlocked(db: Db, hashedIp: string, now = new Date()): Promise<boolean> {
  const since = new Date(now.getTime() - LOGIN_WINDOW_MINUTES * 60_000);
  const r = await db.query<{ mine: number; total: number }>(
    `SELECT COUNT(*) FILTER (WHERE ip_hash = $1)::int AS mine, COUNT(*)::int AS total FROM admin_login_attempts WHERE succeeded = FALSE AND created_at > $2`,
    [hashedIp, since],
  );
  const row = r.rows[0];
  return Number(row.mine) >= LOGIN_MAX_FAILURES_PER_IP || Number(row.total) >= LOGIN_MAX_FAILURES_GLOBAL;
}
