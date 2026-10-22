/**
 * HEALTH CHECKS (no framework imports, so they can be unit-tested with fake databases and fake HTTP)
 *
 * Rules: a check only says PASS if the thing was ACTUALLY tested. A setting that merely exists is "NOT TESTED",
 * a missing optional setting is "NOT CONFIGURED". Secret values are never put in a result.
 */
import type { Db } from "./db-types.ts";
import { MIGRATIONS } from "./migrations.ts";

export type HealthStatus = "PASS" | "FAIL" | "WARNING" | "NOT CONFIGURED" | "NOT TESTED";
export type Check = { id: string; label: string; status: HealthStatus; detail: string; action?: string; critical?: boolean; checkedAt: string };
type Env = Record<string, string | undefined>;
const now = () => new Date().toISOString();
const mk = (id: string, label: string, status: HealthStatus, detail: string, extra: { action?: string; critical?: boolean } = {}): Check => ({ id, label, status, detail, checkedAt: now(), ...extra });

/** Overall: FAIL if any critical check failed, WARNING if anything needs attention, otherwise PASS. */
export function overall(checks: Check[]): HealthStatus {
  if (checks.some((c) => c.critical && c.status === "FAIL")) return "FAIL";
  if (checks.some((c) => c.status === "FAIL" || c.status === "WARNING")) return "WARNING";
  return "PASS";
}

export async function checkDatabase(getDb: () => Promise<Db>, env: Env = process.env): Promise<{ check: Check; db: Db | null }> {
  const t0 = Date.now();
  try {
    const db = await getDb();
    await db.query("SELECT 1");
    const ms = Date.now() - t0;
    if (db.kind === "pglite") {
      const prod = env.NODE_ENV === "production";
      return { db, check: mk("database", "Database connection", prod ? "FAIL" : "WARNING",
        prod ? "The built-in local database is in use in production. Its data is lost when the host redeploys." : "Using the built-in local development database (PGlite). Fine for your own computer, not for the live site.",
        { critical: prod, action: prod ? "Add a PostgreSQL database and set DATABASE_URL." : undefined }) };
    }
    return { db, check: mk("database", "Database connection", "PASS", `PostgreSQL answered a test query in ${ms} ms. Uploaded images are stored in this database.`, { critical: true }) };
  } catch (e) {
    console.error("[health] database check failed:", (e as Error).name);
    return { db: null, check: mk("database", "Database connection", "FAIL", "The database did not answer. Details are in the server logs.", { critical: true, action: "Check DATABASE_URL and that the database service is running." }) };
  }
}

export async function checkMigrations(db: Db | null): Promise<Check> {
  if (!db) return mk("migrations", "Database migrations", "NOT TESTED", "Not tested because the database is unavailable.", { critical: true });
  try {
    const done = new Set((await db.query<{ id: number }>("SELECT id FROM schema_migrations")).rows.map((r) => Number(r.id)));
    const pending = MIGRATIONS.filter((m) => !done.has(m.id)).map((m) => m.id);
    const unknown = [...done].filter((id) => !MIGRATIONS.some((m) => m.id === id));
    if (pending.length) return mk("migrations", "Database migrations", "FAIL", `${pending.length} migration(s) not applied yet: ${pending.join(", ")}.`, { critical: true, action: "Restart the app; migrations run automatically on start." });
    if (unknown.length) return mk("migrations", "Database migrations", "WARNING", `The database has migration(s) this version of the app does not know (${unknown.join(", ")}). This can happen after rolling back to an older version.`, { critical: false });
    return mk("migrations", "Database migrations", "PASS", `All ${MIGRATIONS.length} migrations are applied.`, { critical: true });
  } catch (e) {
    console.error("[health] migration check failed:", (e as Error).name);
    return mk("migrations", "Database migrations", "FAIL", "Could not read the migration table.", { critical: true });
  }
}

export function checkConfig(env: Env): Check[] {
  const prod = env.NODE_ENV === "production";
  const out: Check[] = [];
  const pw = (env.ADMIN_PASSWORD ?? "").length, sec = (env.ADMIN_SESSION_SECRET ?? "").length;
  out.push(pw >= 12 && sec >= 32
    ? mk("admin-config", "Admin sign-in settings", "PASS", "Admin password (12+ characters) and a separate session secret (32+ characters) are set.", { critical: true })
    : mk("admin-config", "Admin sign-in settings", "FAIL", "ADMIN_PASSWORD (12+ characters) and/or ADMIN_SESSION_SECRET (32+ characters) are missing or too short.", { critical: true, action: "Set both in your environment variables." }));
  if (prod) {
    out.push(env.DATABASE_URL ? mk("database-url", "DATABASE_URL", "PASS", "A database connection string is set.", { critical: true }) : mk("database-url", "DATABASE_URL", "FAIL", "Not set. Production needs a PostgreSQL database.", { critical: true, action: "Set DATABASE_URL (Railway: ${{Postgres.DATABASE_URL}})." }));
  }
  const site = env.SITE_URL ?? "", pub = env.NEXT_PUBLIC_SITE_URL ?? "";
  const local = /localhost|127\.0\.0\.1/.test(site) || /localhost|127\.0\.0\.1/.test(pub);
  if (!site || !pub) out.push(mk("site-url", "Website address (SITE_URL)", prod ? "WARNING" : "NOT CONFIGURED", "SITE_URL and/or NEXT_PUBLIC_SITE_URL is not set. Payment return links, email links and the sitemap need them.", { action: "Set both to your public https address." }));
  else if (prod && (local || !site.startsWith("https://"))) out.push(mk("site-url", "Website address (SITE_URL)", "WARNING", "In production, SITE_URL should be your public https:// address.", { action: "Set SITE_URL and NEXT_PUBLIC_SITE_URL to your live https address." }));
  else if (site.replace(/\/$/, "") !== pub.replace(/\/$/, "")) out.push(mk("site-url", "Website address (SITE_URL)", "WARNING", "SITE_URL and NEXT_PUBLIC_SITE_URL are different. They should be the same address.", { action: "Make them identical." }));
  else out.push(mk("site-url", "Website address (SITE_URL)", "PASS", "Both address settings are set and match.", {}));
  return out;
}

export type Last = { at: string; ok: boolean; note: string } | undefined;

export function emailCheck(env: Env, last: Last): Check {
  if (!env.RESEND_API_KEY || !env.INQUIRY_FROM_EMAIL) {
    return mk("email", "Email (Resend)", "NOT CONFIGURED", "RESEND_API_KEY and/or INQUIRY_FROM_EMAIL is not set. Emails are recorded as \"not configured\" and never reported as sent.", { action: "See DEPLOYMENT.md, section Email." });
  }
  if (!last) return mk("email", "Email (Resend)", "NOT TESTED", "Settings are present, but delivery has not been tested. Use \"Test email connection\", then send a real test message.", { action: "Press Test email connection." });
  return mk("email", "Email (Resend)", last.ok ? "PASS" : "WARNING", `Connection test at ${last.at}: ${last.note}`, { action: last.ok ? "Also send a real test message to confirm your sender domain is verified." : "Check the API key and verified sender domain." });
}

export function paymentsCheck(env: Env, last: Last, lastWebhookAt: string | null): Check[] {
  const key = env.PAYSTACK_SECRET_KEY ?? "";
  const mode = key.startsWith("sk_live_") ? "live" : key.startsWith("sk_test_") ? "test" : "off";
  const pointsAtMock = Boolean(env.PAYSTACK_BASE_URL) && !/api\.paystack\.co/.test(env.PAYSTACK_BASE_URL ?? "");
  const list: Check[] = [];
  if (mode === "off") list.push(mk("payments", "Payments (Paystack)", "NOT CONFIGURED", "No Paystack key. Online payment is off; payment instructions and manual (bank transfer) payments still work.", { action: "Add a sk_test_ key to try test payments." }));
  else if (pointsAtMock) list.push(mk("payments", "Payments (Paystack)", "WARNING", `Mock mode: PAYSTACK_BASE_URL points at a stand-in server, not Paystack. For automated testing only — remove it on the live site.${last ? ` Last connection test (against the stand-in): ${last.note}` : ""}`, { action: "Unset PAYSTACK_BASE_URL." }));
  else if (mode === "test") list.push(mk("payments", "Payments (Paystack)", last ? (last.ok ? "PASS" : "WARNING") : "NOT TESTED", last ? `TEST mode. Connection test at ${last.at}: ${last.note}` : "TEST mode key present (no real money). Connection to Paystack has not been tested.", { action: last?.ok ? undefined : "Press Test Paystack connection." }));
  else {
    const enabled = env.PAYMENTS_LIVE_ENABLED === "true";
    list.push(mk("payments", "Payments (Paystack)", enabled ? "WARNING" : "NOT TESTED", enabled ? "LIVE mode and PAYMENTS_LIVE_ENABLED=true: real customers can pay. Only keep this if you have completed a full test-mode run." : "LIVE key present but live payments are switched OFF (PAYMENTS_LIVE_ENABLED is not \"true\"). Customers cannot pay online yet.", { action: enabled ? "Make sure a full test-mode run succeeded first." : undefined }));
  }
  if (mode !== "off") list.push(mk("webhook", "Paystack webhook deliveries", lastWebhookAt ? "PASS" : "NOT TESTED", lastWebhookAt ? `Paystack has delivered a signed webhook to this site (last: ${lastWebhookAt}).` : "No webhook from Paystack has been received yet, so the webhook URL has not been proven to work.", { action: lastWebhookAt ? undefined : "Set https://YOUR-DOMAIN/api/paystack/webhook in Paystack, then make a test payment." }));
  return list;
}

export function securityCheck(activeSessions: number, auditFailures: number): Check[] {
  return [
    mk("sessions", "Admin sessions", "PASS", `Sessions are stored in the database and can be revoked. ${activeSessions} active now.`),
    auditFailures > 0 ? mk("audit", "Audit log", "WARNING", `${auditFailures} audit event(s) could not be written since the server started.`, { action: "Check the database and server logs." }) : mk("audit", "Audit log", "PASS", "No audit-write failures since the server started."),
    mk("rate-limit", "Rate limiting", "WARNING", "Admin sign-in limits are stored in the database (safe across several instances). Limits on public forms are kept in memory per instance and reset on restart; this only matters if you run more than one instance.", {}),
  ];
}

type Fetch = (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{ status: number; json(): Promise<unknown> }>;

/** Safe, read-only call to Resend to check the API key. Never sends an email. */
export async function testEmailConnection(env: Env, fetcher: Fetch = fetch as unknown as Fetch): Promise<{ ok: boolean; note: string }> {
  if (!env.RESEND_API_KEY) return { ok: false, note: "No API key is set." };
  try {
    const res = await fetcher(`${(env.RESEND_BASE_URL || "https://api.resend.com").replace(/\/$/, "")}/domains`, { headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` }, signal: AbortSignal.timeout(10_000) });
    const body = (await res.json().catch(() => null)) as { name?: string; data?: { name?: string; status?: string }[] } | null;
    if (res.status === 200) {
      const from = (env.INQUIRY_FROM_EMAIL ?? "").match(/@([^>\s]+)/)?.[1]?.toLowerCase();
      const d = body?.data?.find((x) => x.name?.toLowerCase() === from);
      if (from && d) return { ok: d.status === "verified", note: d.status === "verified" ? `API key accepted and the sender domain ${from} is verified.` : `API key accepted, but the sender domain ${from} is "${d.status}" (not verified).` };
      return { ok: false, note: from ? `API key accepted, but the sender domain ${from} was not found in your Resend account.` : "API key accepted, but INQUIRY_FROM_EMAIL has no domain to check." };
    }
    if (res.status === 401 && body?.name === "restricted_api_key") return { ok: true, note: "API key accepted (send-only key, so the sender domain cannot be checked here). Send a real test message to confirm." };
    if (res.status === 401 || res.status === 403) return { ok: false, note: "Resend rejected the API key." };
    return { ok: false, note: `Resend answered with an unexpected status (HTTP ${res.status}).` };
  } catch (e) {
    return { ok: false, note: `Could not reach Resend (${(e as Error).name}).` };
  }
}

/** Safe, read-only call to Paystack (lists one bank) to check the secret key. Creates no transaction. */
export async function testPaystackConnection(env: Env, fetcher: Fetch = fetch as unknown as Fetch): Promise<{ ok: boolean; note: string }> {
  const key = env.PAYSTACK_SECRET_KEY ?? "";
  if (!/^sk_(test|live)_/.test(key)) return { ok: false, note: "No Paystack secret key is set." };
  try {
    const res = await fetcher(`${(env.PAYSTACK_BASE_URL || "https://api.paystack.co").replace(/\/$/, "")}/bank?country=nigeria&perPage=1`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) });
    const body = (await res.json().catch(() => null)) as { status?: boolean } | null;
    if (res.status === 200 && body?.status === true) return { ok: true, note: "Paystack accepted the secret key." };
    if (res.status === 401) return { ok: false, note: "Paystack rejected the secret key." };
    return { ok: false, note: `Paystack answered with an unexpected response (HTTP ${res.status}).` };
  } catch (e) {
    return { ok: false, note: `Could not reach Paystack (${(e as Error).name}).` };
  }
}
