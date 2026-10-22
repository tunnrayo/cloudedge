import "server-only";
import { getDb } from "@/lib/db";
import { activeSessionCount } from "@/lib/admin-sessions";
import { auditFailureStats } from "@/lib/audit";
import { checkConfig, checkDatabase, checkMigrations, emailCheck, overall, paymentsCheck, securityCheck, type Check, type HealthStatus, type Last } from "@/lib/health-core";

const g = globalThis as unknown as { __ceHealthLast?: { email?: Last; paystack?: Last } };
export const lastTests = () => (g.__ceHealthLast ??= {});

export type HealthReport = { status: HealthStatus; checkedAt: string; lastOkAt: string | null; checks: Check[]; info: Record<string, string> };

/** Runs every check against the live application. Nothing here returns secret values. */
export async function runHealth(): Promise<HealthReport> {
  const checkedAt = new Date().toISOString();
  const { check: dbCheck, db } = await checkDatabase(getDb);
  const migr = await checkMigrations(db);
  let sessions = 0; let webhookAt: string | null = null; let lastOkAt: string | null = null;
  if (db) {
    try { sessions = await activeSessionCount(db); } catch { /* shown as 0 */ }
    try {
      const r = await db.query<{ at: Date | string | null }>("SELECT MAX(created_at) AS at FROM webhook_events WHERE provider = 'paystack'");
      if (r.rows[0]?.at) webhookAt = new Date(r.rows[0].at).toISOString();
    } catch { /* table missing: no webhook info */ }
    try { lastOkAt = (await db.query<{ value: string }>("SELECT value FROM meta WHERE key = 'health_last_ok'")).rows[0]?.value ?? null; } catch { /* ignore */ }
  }
  const t = lastTests();
  const checks: Check[] = [
    { id: "app", label: "Application", status: "PASS", detail: `Running (uptime ${Math.round(process.uptime() / 60)} min).`, checkedAt },
    dbCheck, migr, ...checkConfig(process.env),
    emailCheck(process.env, t.email), ...paymentsCheck(process.env, t.paystack, webhookAt), ...securityCheck(sessions, auditFailureStats().count),
  ];
  const status = overall(checks);
  if (db && status !== "FAIL") {
    try { await db.query("INSERT INTO meta (key, value) VALUES ('health_last_ok', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [checkedAt]); lastOkAt = checkedAt; } catch { /* not critical */ }
  }
  const info: Record<string, string> = {
    Environment: process.env.RAILWAY_ENVIRONMENT_NAME || process.env.NODE_ENV || "unknown",
    "Node.js": process.version,
    Database: db ? (db.kind === "postgres" ? "PostgreSQL" : "PGlite (local)") : "unavailable",
    Release: (process.env.RAILWAY_GIT_COMMIT_SHA || "").slice(0, 7) || "not provided by host",
  };
  return { status, checkedAt, lastOkAt, checks, info };
}
