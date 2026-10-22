// Tests for the platform pieces added in v0.5.0 (local database folder, audit redaction, sessions, services, health).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { localDbDir, prepareLocalDbDir } from "../src/lib/local-db-path.ts";

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "ce-test-")); }

test("local database: missing parent folders are created (regression: ENOENT mkdir .data/pglite)", () => {
  const root = tmp();
  const dir = localDbDir({}, root);
  assert.equal(dir, path.join(root, ".data", "pglite"));
  assert.equal(fs.existsSync(path.join(root, ".data")), false);
  prepareLocalDbDir(dir);
  assert.ok(fs.statSync(dir).isDirectory());
});
test("local database: PGLITE_DIR override, relative and absolute", () => {
  const root = tmp();
  assert.equal(localDbDir({ PGLITE_DIR: "custom/db" }, root), path.join(root, "custom", "db"));
  assert.equal(localDbDir({ PGLITE_DIR: path.join(root, "abs") }, "/elsewhere"), path.join(root, "abs"));
  assert.equal(localDbDir({ PGLITE_DIR: "   " }, root), path.join(root, ".data", "pglite"));
});
test("local database: existing folder and its files are preserved, repeat calls are safe", () => {
  const root = tmp();
  const dir = path.join(root, ".data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "PG_VERSION"), "17");
  prepareLocalDbDir(dir); prepareLocalDbDir(dir);
  assert.equal(fs.readFileSync(path.join(dir, "PG_VERSION"), "utf8"), "17");
});
test("local database: a FILE in the way gives a clear error (no secrets, no crash dump)", () => {
  const root = tmp();
  const blocked = path.join(root, "blocked");
  fs.writeFileSync(blocked, "x");
  assert.throws(() => prepareLocalDbDir(path.join(blocked, "sub")), /Cannot create the local database folder/);
  assert.throws(() => prepareLocalDbDir(blocked), /not a folder/);
});
test("local database: PGlite really opens from a clean folder after prepare (real engine)", async () => {
  const root = tmp();
  const dir = localDbDir({}, root);
  prepareLocalDbDir(dir);
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = await PGlite.create(dir);
  await pg.query("CREATE TABLE t (n int)"); await pg.query("INSERT INTO t VALUES (7)");
  assert.equal((await pg.query<{ n: number }>("SELECT n FROM t")).rows[0].n, 7);
  await pg.close();
  const again = await PGlite.create(dir); // restart: data persisted
  assert.equal((await again.query<{ n: number }>("SELECT n FROM t")).rows[0].n, 7);
  await again.close();
});

/* ---------------------------------------------------------------------------------------------
 * Database-backed pieces, tested on a real (in-memory) PostgreSQL engine with the real migrations.
 * ------------------------------------------------------------------------------------------- */
import { PGlite } from "@electric-sql/pglite";
import { wrapPglite } from "../src/lib/pglite-adapter.ts";
import { applyMigrations } from "../src/lib/migrate.ts";
import type { Db } from "../src/lib/db-types.ts";
import {
  IDLE_MINUTES, SESSION_HOURS, activeSessionCount, createSession, ipHash, loginBlocked, looksLikeToken, purgeOld, recordLoginAttempt, revokeAllSessions, revokeSession, tokenHash, validateSession,
} from "../src/lib/admin-sessions.ts";
import { listAudit, recordAudit, redact, writeAudit, auditFailureStats } from "../src/lib/audit.ts";

const SECRET = "s".repeat(40);
async function memDb(): Promise<Db> {
  const db = wrapPglite(new PGlite() as unknown as Parameters<typeof wrapPglite>[0]);
  await applyMigrations(db);
  return db;
}
const hours = (d: Date, h: number) => new Date(d.getTime() + h * 3600_000);

test("migrations: all apply on an empty database, are recorded once, and re-running changes nothing", async () => {
  const db = await memDb();
  const ids = (await db.query<{ id: number }>("SELECT id FROM schema_migrations ORDER BY id")).rows.map((r) => r.id);
  assert.deepEqual(ids, [1, 2, 3, 4]);
  assert.deepEqual(await applyMigrations(db), []);
});

test("sessions: a valid token works; wrong, malformed and empty tokens do not", async () => {
  const db = await memDb();
  const s = await createSession(db, { secret: SECRET, ip: "1.2.3.4", userAgent: "UA" });
  assert.ok(looksLikeToken(s.token));
  assert.equal((await validateSession(db, s.token, { secret: SECRET }))?.id, s.id);
  assert.equal(await validateSession(db, "0".repeat(64), { secret: SECRET }), null); // right shape, never issued
  assert.equal(await validateSession(db, "eyJleHAiOjk5OTl9.AAAA", { secret: SECRET }), null); // old-style forged cookie
  assert.equal(await validateSession(db, "' OR 1=1 --", { secret: SECRET }), null);
  assert.equal(await validateSession(db, undefined, { secret: SECRET }), null);
});
test("sessions: the database stores a hash, never the token itself", async () => {
  const db = await memDb();
  const s = await createSession(db, { secret: SECRET, ip: "9.9.9.9" });
  const row = (await db.query<{ token_hash: string; ip_hash: string }>("SELECT token_hash, ip_hash FROM admin_sessions")).rows[0];
  assert.notEqual(row.token_hash, s.token);
  assert.equal(row.token_hash, tokenHash(s.token, SECRET));
  assert.ok(!JSON.stringify(row).includes("9.9.9.9"));
  assert.equal(row.ip_hash, ipHash("9.9.9.9", SECRET));
});
test("sessions: logout revokes server-side — a copied cookie stops working immediately", async () => {
  const db = await memDb();
  const s = await createSession(db, { secret: SECRET, ip: "a" });
  assert.ok(await validateSession(db, s.token, { secret: SECRET }));
  assert.equal(await revokeSession(db, s.token, { secret: SECRET }), true);
  assert.equal(await validateSession(db, s.token, { secret: SECRET }), null);
  assert.equal(await revokeSession(db, s.token, { secret: SECRET }), false); // already revoked
});
test("sessions: absolute expiry and idle expiry", async () => {
  const db = await memDb();
  const t0 = new Date("2026-10-22T08:00:00Z");
  const s = await createSession(db, { secret: SECRET, ip: "a", now: t0 });
  assert.ok(await validateSession(db, s.token, { secret: SECRET, now: hours(t0, 1) }));
  // keep it active every hour: still valid at 7h, dead after 8h
  for (let h = 2; h <= 7; h++) assert.ok(await validateSession(db, s.token, { secret: SECRET, now: hours(t0, h) }), `active at ${h}h`);
  assert.equal(await validateSession(db, s.token, { secret: SECRET, now: new Date(t0.getTime() + (SESSION_HOURS * 60 + 1) * 60_000) }), null);
  const idle = await createSession(db, { secret: SECRET, ip: "b", now: t0 });
  assert.equal(await validateSession(db, idle.token, { secret: SECRET, now: new Date(t0.getTime() + (IDLE_MINUTES + 5) * 60_000) }), null);
});
test("sessions: a cookie signed with a different secret is useless, and each login gets its own session", async () => {
  const db = await memDb();
  const a = await createSession(db, { secret: SECRET, ip: "a" });
  const b = await createSession(db, { secret: SECRET, ip: "a" });
  assert.notEqual(a.token, b.token);
  assert.equal(await validateSession(db, a.token, { secret: "z".repeat(40) }), null);
  assert.equal(await activeSessionCount(db), 2);
});
test("sessions: 'sign out everywhere' revokes all (optionally keeping the current one)", async () => {
  const db = await memDb();
  const a = await createSession(db, { secret: SECRET, ip: "a" });
  const b = await createSession(db, { secret: SECRET, ip: "b" });
  assert.equal(await revokeAllSessions(db, { exceptId: a.id }), 1);
  assert.ok(await validateSession(db, a.token, { secret: SECRET }));
  assert.equal(await validateSession(db, b.token, { secret: SECRET }), null);
  assert.equal(await revokeAllSessions(db), 1);
  assert.equal(await activeSessionCount(db), 0);
});
test("sign-in limit: blocks after 5 failures from one visitor for 15 minutes, other visitors unaffected, success does not count", async () => {
  const db = await memDb();
  const t0 = new Date("2026-10-22T10:00:00Z");
  const me = ipHash("1.1.1.1", SECRET), other = ipHash("2.2.2.2", SECRET);
  for (let i = 0; i < 4; i++) await recordLoginAttempt(db, me, false, t0);
  assert.equal(await loginBlocked(db, me, t0), false);
  await recordLoginAttempt(db, me, true, t0);
  assert.equal(await loginBlocked(db, me, t0), false);
  await recordLoginAttempt(db, me, false, t0);
  assert.equal(await loginBlocked(db, me, t0), true);
  assert.equal(await loginBlocked(db, other, t0), false);
  assert.equal(await loginBlocked(db, me, new Date(t0.getTime() + 16 * 60_000)), false);
  await purgeOld(db, new Date(t0.getTime() + 3 * 86400_000));
  assert.equal(Number((await db.query<{ n: number }>("SELECT COUNT(*)::int n FROM admin_login_attempts")).rows[0].n), 0);
});
test("sign-in limit: many distinct addresses failing is also stopped (global ceiling)", async () => {
  const db = await memDb();
  const t0 = new Date("2026-10-22T10:00:00Z");
  for (let i = 0; i < 60; i++) await recordLoginAttempt(db, ipHash(`10.0.0.${i}`, SECRET), false, t0);
  assert.equal(await loginBlocked(db, ipHash("10.9.9.9", SECRET), t0), true);
});

test("audit: events are stored with time, type, outcome, target and actor, and can be filtered and paged", async () => {
  const db = await memDb();
  await writeAudit(db.query.bind(db), { type: "admin.login", outcome: "failure", summary: "Wrong password" });
  await writeAudit(db.query.bind(db), { type: "product.update", actor: "admin#abc12345", target: "product", targetId: "p-1", summary: "Edited Office" });
  for (let i = 0; i < 30; i++) await recordAudit(db, { type: "order.status", target: "order", targetId: `o-${i}`, summary: `Order ${i}` });
  const all = await listAudit(db, {});
  assert.equal(all.total, 32); assert.equal(all.rows.length, 25); assert.equal(all.pages, 2);
  assert.equal((await listAudit(db, { page: 2 })).rows.length, 7);
  assert.equal((await listAudit(db, { type: "admin.login" })).rows[0].outcome, "failure");
  assert.equal((await listAudit(db, { outcome: "failure" })).total, 1);
  assert.equal((await listAudit(db, { q: "Edited" })).rows[0].actor, "admin#abc12345");
  assert.equal((await listAudit(db, { from: "2999-01-01" })).total, 0);
  assert.equal((await listAudit(db, { from: "2000-01-01", to: "2999-01-01" })).total, 32);
  assert.equal((await listAudit(db, { q: "%" })).total, 0, "LIKE wildcards are escaped");
  assert.equal((await listAudit(db, { type: "x'; DROP TABLE audit_log;--" })).total, 32, "unsafe type filter is ignored, not executed");
  assert.equal((await listAudit(db, { page: 999 })).page, 2);
});
test("audit: records cannot be changed or deleted, even by a direct database command", async () => {
  const db = await memDb();
  await recordAudit(db, { type: "admin.login", summary: "x" });
  await assert.rejects(() => db.query("UPDATE audit_log SET summary = 'tampered'"), /cannot be changed or deleted/);
  await assert.rejects(() => db.query("DELETE FROM audit_log"), /cannot be changed or deleted/);
  assert.equal((await listAudit(db, {})).total, 1);
});
test("audit: secrets are redacted before anything is stored", async () => {
  const db = await memDb();
  await recordAudit(db, {
    type: "admin.login", summary: "key sk_live_abcdefghijklmnop and postgres://user:pw@host/db in text",
    details: { password: "hunter2hunter2", ADMIN_SESSION_SECRET: "abc", cookie: "ce_admin=zzz", nested: { api_key: "k", ok: "fine", token: "t" }, list: ["sk_test_abcdefghijklmnopqrstuv", "ok"], long: "x".repeat(900), hex: "a".repeat(64) },
  });
  const raw = JSON.stringify((await db.query("SELECT * FROM audit_log")).rows[0]);
  for (const bad of ["hunter2", "sk_live_abcdef", "sk_test_abcdef", "user:pw@host", "ce_admin=zzz", "a".repeat(64), '"abc"']) assert.ok(!raw.includes(bad), `leaked: ${bad}`);
  assert.ok(raw.includes("[redacted]") && raw.includes("fine"));
  assert.ok(!raw.includes("x".repeat(400)), "long text is shortened");
});
test("audit: redact() handles odd input safely", () => {
  assert.equal(redact(null), null);
  assert.deepEqual(redact({ a: { b: { c: { d: 1 } } } }), { a: { b: { c: "[too deep]" } } });
  assert.equal((redact(Array.from({ length: 50 }, (_, i) => i)) as number[]).length, 20);
});
test("audit: a logging failure never breaks the caller, and is counted for the health page", async () => {
  const broken = { kind: "pglite", query: async () => { throw new Error("db down"); }, tx: async () => { throw new Error("db down"); } } as unknown as Db;
  const before = auditFailureStats().count;
  assert.equal(await recordAudit(broken, { type: "order.status" }), false);
  assert.equal(auditFailureStats().count, before + 1);
});
test("audit: unsafe event types are replaced, bad outcomes are corrected", async () => {
  const db = await memDb();
  await recordAudit(db, { type: "<script>alert(1)</script>", outcome: "weird" as never });
  const r = (await listAudit(db, {})).rows[0];
  assert.equal(r.event_type, "invalid.event"); assert.equal(r.outcome, "success");
});
test("audit + business change in one transaction: a failure rolls both back", async () => {
  const db = await memDb();
  await assert.rejects(() => db.tx(async (q) => {
    await writeAudit(q, { type: "service.create", summary: "inside tx" });
    throw new Error("business step failed");
  }));
  assert.equal((await listAudit(db, {})).total, 0);
});

/* ------------------------------------ health checks ------------------------------------ */
import { checkConfig, checkDatabase, checkMigrations, emailCheck, overall, paymentsCheck, securityCheck, testEmailConnection, testPaystackConnection } from "../src/lib/health-core.ts";

test("health: a working database PASSes (actually queried) and migrations PASS", async () => {
  const db = await memDb();
  let queried = 0;
  const spy: Db = { ...db, query: async (s, p) => { queried++; return db.query(s, p); } };
  const { check, db: got } = await checkDatabase(async () => spy, { NODE_ENV: "development" });
  assert.ok(queried >= 1, "a real query was run");
  assert.equal(check.status, "WARNING"); // PGlite outside production is only a development database
  assert.match(check.detail, /development database/);
  assert.equal((await checkMigrations(got)).status, "PASS");
});
test("health: PGlite in production is a FAIL (critical), never a silent PASS", async () => {
  const db = await memDb();
  const { check } = await checkDatabase(async () => db, { NODE_ENV: "production" });
  assert.equal(check.status, "FAIL"); assert.equal(check.critical, true);
});
test("health: an unavailable database FAILs, hides the real error text, and migrations become NOT TESTED", async () => {
  const { check, db } = await checkDatabase(async () => { throw new Error("connect ECONNREFUSED postgres://admin:SuperSecret@10.0.0.5:5432/x"); });
  assert.equal(check.status, "FAIL"); assert.equal(check.critical, true);
  assert.ok(!JSON.stringify(check).includes("SuperSecret") && !JSON.stringify(check).includes("10.0.0.5"));
  assert.equal(db, null);
  assert.equal((await checkMigrations(null)).status, "NOT TESTED");
  assert.equal(overall([check]), "FAIL");
});
test("health: a database that connects but then errors is reported FAIL", async () => {
  const bad = { kind: "postgres", query: async () => { throw new Error("terminating connection"); }, tx: async () => { throw new Error("x"); } } as unknown as Db;
  assert.equal((await checkDatabase(async () => bad)).check.status, "FAIL");
});
test("health: pending migrations FAIL; unknown (newer) migrations WARN", async () => {
  const db = await memDb();
  await db.query("DELETE FROM schema_migrations WHERE id = 4");
  const pending = await checkMigrations(db);
  assert.equal(pending.status, "FAIL"); assert.match(pending.detail, /4/);
  await db.query("INSERT INTO schema_migrations (id, name) VALUES (4, 'managed_services'), (99, 'future')");
  assert.equal((await checkMigrations(db)).status, "WARNING");
});
test("health: configuration — weak admin settings FAIL, strong PASS, production needs DATABASE_URL", () => {
  assert.equal(checkConfig({ ADMIN_PASSWORD: "short", ADMIN_SESSION_SECRET: "x" }).find((c) => c.id === "admin-config")!.status, "FAIL");
  const ok = checkConfig({ NODE_ENV: "production", ADMIN_PASSWORD: "a-long-password-123", ADMIN_SESSION_SECRET: "s".repeat(40), DATABASE_URL: "postgres://u:p@h/db", SITE_URL: "https://example.ng", NEXT_PUBLIC_SITE_URL: "https://example.ng" });
  assert.deepEqual(ok.map((c) => c.status), ["PASS", "PASS", "PASS"]);
  assert.equal(checkConfig({ NODE_ENV: "production", ADMIN_PASSWORD: "a-long-password-123", ADMIN_SESSION_SECRET: "s".repeat(40) }).find((c) => c.id === "database-url")!.status, "FAIL");
  assert.equal(checkConfig({ NODE_ENV: "production", SITE_URL: "http://localhost:3000", NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }).find((c) => c.id === "site-url")!.status, "WARNING");
  assert.equal(checkConfig({ SITE_URL: "https://a.ng", NEXT_PUBLIC_SITE_URL: "https://b.ng" }).find((c) => c.id === "site-url")!.status, "WARNING");
});
test("health: no result ever contains a secret value", async () => {
  const env = { NODE_ENV: "production", ADMIN_PASSWORD: "TopSecretAdminPw1", ADMIN_SESSION_SECRET: "SESSIONSECRET".repeat(4), DATABASE_URL: "postgres://usr:dbpass@host/db", RESEND_API_KEY: "re_abcdefghijklmnopqrstuv", INQUIRY_FROM_EMAIL: "a@b.ng", PAYSTACK_SECRET_KEY: "sk_test_abcdefghijklmnop" };
  const all = [...checkConfig(env), emailCheck(env, undefined), ...paymentsCheck(env, undefined, null), ...securityCheck(1, 0)];
  const text = JSON.stringify(all);
  for (const s of ["TopSecretAdminPw1", "SESSIONSECRET", "dbpass", "re_abcdefghijkl", "sk_test_abcdefgh"]) assert.ok(!text.includes(s), `leaked ${s}`);
});
test("health: email/payments never claim success from settings alone", () => {
  assert.equal(emailCheck({}, undefined).status, "NOT CONFIGURED");
  assert.equal(emailCheck({ RESEND_API_KEY: "k", INQUIRY_FROM_EMAIL: "a@b.ng" }, undefined).status, "NOT TESTED");
  assert.equal(emailCheck({ RESEND_API_KEY: "k", INQUIRY_FROM_EMAIL: "a@b.ng" }, { at: "t", ok: false, note: "x" }).status, "WARNING");
  assert.equal(paymentsCheck({}, undefined, null)[0].status, "NOT CONFIGURED");
  assert.equal(paymentsCheck({ PAYSTACK_SECRET_KEY: "sk_test_x" }, undefined, null)[0].status, "NOT TESTED");
  assert.equal(paymentsCheck({ PAYSTACK_SECRET_KEY: "sk_test_x", PAYSTACK_BASE_URL: "http://127.0.0.1:4010" }, undefined, null)[0].status, "WARNING"); // mock
  const live = paymentsCheck({ PAYSTACK_SECRET_KEY: "sk_live_x" }, undefined, null);
  assert.equal(live[0].status, "NOT TESTED"); assert.match(live[0].detail, /switched OFF/);
  assert.equal(paymentsCheck({ PAYSTACK_SECRET_KEY: "sk_live_x", PAYMENTS_LIVE_ENABLED: "true" }, undefined, null)[0].status, "WARNING");
  assert.equal(live[1].status, "NOT TESTED"); // webhook never received
  assert.equal(paymentsCheck({ PAYSTACK_SECRET_KEY: "sk_test_x" }, undefined, "2026-10-22")[1].status, "PASS");
});
test("health: email connection test classifies responses (fake HTTP, no real Resend call)", async () => {
  const f = (status: number, body: unknown) => async () => ({ status, json: async () => body });
  const env = { RESEND_API_KEY: "re_x", INQUIRY_FROM_EMAIL: "Cloud Edge <noreply@cloudedge.ng>" };
  assert.equal((await testEmailConnection({}, f(200, {}))).ok, false);
  assert.deepEqual((await testEmailConnection(env, f(200, { data: [{ name: "cloudedge.ng", status: "verified" }] }))).ok, true);
  assert.equal((await testEmailConnection(env, f(200, { data: [{ name: "cloudedge.ng", status: "pending" }] }))).ok, false);
  assert.match((await testEmailConnection(env, f(200, { data: [] }))).note, /not found/);
  assert.equal((await testEmailConnection(env, f(401, { name: "restricted_api_key" }))).ok, true);
  assert.equal((await testEmailConnection(env, f(401, { name: "invalid_api_key" }))).ok, false);
  assert.equal((await testEmailConnection(env, f(500, {}))).ok, false);
  const boom = await testEmailConnection(env, async () => { throw new Error("secret re_x in message"); });
  assert.equal(boom.ok, false); assert.ok(!boom.note.includes("re_x"));
});
test("health: Paystack connection test classifies responses (fake HTTP, no real Paystack call)", async () => {
  const f = (status: number, body: unknown) => async () => ({ status, json: async () => body });
  assert.equal((await testPaystackConnection({}, f(200, {}))).ok, false);
  assert.equal((await testPaystackConnection({ PAYSTACK_SECRET_KEY: "sk_test_x" }, f(200, { status: true }))).ok, true);
  assert.equal((await testPaystackConnection({ PAYSTACK_SECRET_KEY: "sk_test_x" }, f(401, { status: false }))).ok, false);
  assert.equal((await testPaystackConnection({ PAYSTACK_SECRET_KEY: "sk_test_x" }, f(200, { status: false }))).ok, false);
  assert.equal((await testPaystackConnection({ PAYSTACK_SECRET_KEY: "sk_test_x" }, async () => { throw new Error("net"); })).ok, false);
});
test("health: overall status rules", () => {
  const c = (status: "PASS" | "FAIL" | "WARNING", critical = false) => ({ id: "x", label: "x", status, detail: "", checkedAt: "", critical });
  assert.equal(overall([c("PASS"), c("PASS")]), "PASS");
  assert.equal(overall([c("PASS"), c("WARNING")]), "WARNING");
  assert.equal(overall([c("FAIL"), c("PASS")]), "WARNING"); // non-critical failure
  assert.equal(overall([c("FAIL", true)]), "FAIL");
});

/* ------------------------------------ admin-managed services ------------------------------------ */
import { defaultServices } from "../src/lib/site.ts";
import { deleteService, getServiceById, getServiceBySlugDb, inquiryUsage, listServices, moveService, saveService, seedServicesIfNeeded, setServiceStatus, slugify, validateService } from "../src/lib/services-core.ts";

const good = { title: "Cloud Hosting", slug: "", icon: "cloud", category: "Internet & infrastructure", summary: "Reliable hosting set up for your business.", problem: "", what: "We set up and look after hosting for your site.", items: "Setup\nBackups", goodFor: "New websites", inquiryType: "Internet-related services", status: "draft", sortOrder: 5, priceText: "", imageAlt: "" };

test("services: built-in services are seeded once, as published, in order", async () => {
  const db = await memDb();
  assert.equal(await seedServicesIfNeeded(db), defaultServices.length);
  const all = await listServices(db);
  assert.equal(all.length, defaultServices.length);
  assert.deepEqual(all.map((s) => s.slug), defaultServices.map((s) => s.slug));
  assert.ok(all.every((s) => s.status === "published" && s.items.length > 0 && s.goodFor.length > 0 && s.category));
  assert.equal(await seedServicesIfNeeded(db), 0);
});
test("services: seeding again never duplicates, overwrites edits, or brings back deleted services", async () => {
  const db = await memDb();
  await seedServicesIfNeeded(db);
  const web = (await getServiceBySlugDb(db, "web-development"))!;
  const edited = validateService({ ...good, slug: "web-development", title: "My edited title", status: "published", inquiryType: web.inquiryType });
  assert.deepEqual(edited.errors, {});
  assert.ok((await saveService(db, web.id, edited.value, "admin#t")).ok);
  const gone = (await getServiceBySlugDb(db, "digital-products"))!;
  await setServiceStatus(db, gone.id, "inactive", "admin#t");
  assert.ok((await deleteService(db, gone.id, "admin#t")).ok);
  await db.query("DELETE FROM meta WHERE key <> 'services_seeded' AND key = 'nothing'"); // no-op: marker stays
  assert.equal(await seedServicesIfNeeded(db), 0);
  await seedServicesIfNeeded(db);
  assert.equal((await getServiceBySlugDb(db, "web-development"))!.title, "My edited title");
  assert.equal(await getServiceBySlugDb(db, "digital-products"), null);
  assert.equal((await listServices(db)).length, defaultServices.length - 1);
});
test("services: validation rejects bad input and cleans control characters", () => {
  const bad = validateService({ title: "x", slug: "Bad Slug!", summary: "short", what: "", items: "", goodFor: "", inquiryType: "Nope", category: "" });
  for (const k of ["title", "slug", "summary", "what", "items", "goodFor", "inquiryType", "category"]) assert.ok(bad.errors[k], `expected error for ${k}`);
  assert.equal(validateService({ ...good, slug: "new" }).errors.slug, "That web address is reserved. Choose another.");
  assert.equal(validateService({ ...good, slug: "a--b" }).errors.slug !== undefined, true);
  const c = validateService({ ...good, title: "Hos\u0000ting", items: "One\r\nTwo\n\n  \nThree", icon: "<script>" });
  assert.equal(c.value.title, "Hosting"); assert.deepEqual(c.value.items, ["One", "Two", "Three"]); assert.equal(c.value.icon, "code");
  assert.equal(validateService({ ...good, items: Array.from({ length: 20 }, (_, i) => `i${i}`).join("\n") }).value.items.length, 8);
  assert.equal(validateService({ ...good, status: "hacked" }).value.status, "draft");
  assert.equal(validateService({ ...good, title: "My New Service!" }).value.slug, "my-new-service");
  assert.equal(slugify("  Ünïcode & Co. "), "unicode-co");
});
test("services: create → audit event in the same transaction; duplicate address is refused cleanly", async () => {
  const db = await memDb();
  const v = validateService({ ...good, slug: "cloud-hosting" }).value;
  const r = await saveService(db, null, v, "admin#abc");
  assert.ok(r.ok);
  const a = await listAudit(db, { type: "service.create" });
  assert.equal(a.total, 1); assert.equal(a.rows[0].actor, "admin#abc");
  const dup = await saveService(db, null, v, "admin#abc");
  assert.equal(dup.ok, false); assert.equal((dup as { field?: string }).field, "slug");
  assert.equal((await listAudit(db, {})).total, 1, "a failed save writes no audit row");
});
test("services: a failed audit write rolls the service change back (consistency)", async () => {
  const db = await memDb();
  await db.query("ALTER TABLE audit_log ADD CONSTRAINT nope CHECK (event_type <> 'service.create')");
  const v = validateService({ ...good, slug: "cloud-hosting" }).value;
  await assert.rejects(() => saveService(db, null, v, "admin#abc"));
  assert.equal((await listServices(db)).length, 0, "the service was not created without its audit record");
});
test("services: the web address of a live service is locked; a draft can be renamed", async () => {
  const db = await memDb();
  const id = ((await saveService(db, null, validateService({ ...good, slug: "cloud-hosting", status: "published" }).value, "a")) as { id: string }).id;
  const attempt = await saveService(db, id, validateService({ ...good, slug: "renamed", status: "published" }).value, "a");
  assert.equal(attempt.ok, false); assert.equal((attempt as { field?: string }).field, "slug");
  assert.equal((await getServiceById(db, id))!.slug, "cloud-hosting");
  assert.ok((await saveService(db, id, validateService({ ...good, slug: "cloud-hosting", status: "draft", title: "Cloud Hosting 2" }).value, "a")).ok);
  assert.ok((await saveService(db, id, validateService({ ...good, slug: "renamed", status: "draft" }).value, "a")).ok);
  assert.ok(await getServiceBySlugDb(db, "renamed"));
});
test("services: status changes (publish / inactive / draft) are validated and audited", async () => {
  const db = await memDb();
  const id = ((await saveService(db, null, validateService({ ...good, slug: "cloud-hosting" }).value, "a")) as { id: string }).id;
  assert.ok((await setServiceStatus(db, id, "published", "admin#z")).ok);
  assert.equal((await listServices(db, { publishedOnly: true })).length, 1);
  assert.ok((await setServiceStatus(db, id, "inactive", "admin#z")).ok);
  assert.equal((await listServices(db, { publishedOnly: true })).length, 0);
  assert.equal((await setServiceStatus(db, id, "weird" as never, "z")).ok, false);
  assert.equal((await setServiceStatus(db, "00000000-0000-0000-0000-000000000000", "draft", "z")).ok, false);
  assert.equal((await listAudit(db, { type: "service.status" })).total, 2);
});
test("services: published services cannot be deleted, and services customers enquired about are protected", async () => {
  const db = await memDb();
  const v = validateService({ ...good, slug: "cloud-hosting", status: "published" }).value;
  const id = ((await saveService(db, null, v, "a")) as { id: string }).id;
  assert.match((await deleteService(db, id, "a")).error!, /published/);
  await setServiceStatus(db, id, "inactive", "a");
  assert.equal(await inquiryUsage(db, v.inquiryType), 0, "no inquiries table yet");
  await db.query(`CREATE TABLE inquiries (id UUID PRIMARY KEY, type VARCHAR(80) NOT NULL)`);
  await db.query(`INSERT INTO inquiries VALUES (gen_random_uuid(), $1)`, [v.inquiryType]);
  assert.equal(await inquiryUsage(db, v.inquiryType), 1);
  const refused = await deleteService(db, id, "a");
  assert.equal(refused.ok, false); assert.match(refused.error!, /inquiry/);
  assert.ok(await getServiceById(db, id), "still there");
  await db.query("DELETE FROM inquiries");
  assert.ok((await deleteService(db, id, "a")).ok);
  assert.equal(await getServiceById(db, id), null);
  assert.equal((await listAudit(db, { type: "service.delete" })).total, 1);
});
test("services: ordering moves one place and is audited; edges do nothing", async () => {
  const db = await memDb();
  await seedServicesIfNeeded(db);
  const before = (await listServices(db)).map((s) => s.slug);
  const second = (await getServiceBySlugDb(db, before[1]))!;
  assert.ok(await moveService(db, second.id, "up", "a"));
  const after = (await listServices(db)).map((s) => s.slug);
  assert.deepEqual(after.slice(0, 2), [before[1], before[0]]);
  assert.equal(await moveService(db, second.id, "up", "a"), false); // already first
  assert.equal(await moveService(db, "00000000-0000-0000-0000-000000000000", "down", "a"), false);
});
test("services: lookups ignore malformed ids and slugs (no SQL is built from them)", async () => {
  const db = await memDb();
  assert.equal(await getServiceById(db, "1; DROP TABLE services"), null);
  assert.equal(await getServiceBySlugDb(db, "x' OR '1'='1"), null);
});

/* ------------------------------------ portfolio ------------------------------------ */
import { visibleProjects } from "../src/lib/catalog.ts";
import { projects } from "../src/content/projects.ts";
import { settings } from "../src/lib/site.ts";

test("portfolio: demo concepts are hidden by default, client projects are always shown", () => {
  assert.equal(settings.showDemoProjects, false, "default must be hidden (SHOW_DEMO_PROJECTS not set)");
  assert.equal(visibleProjects(projects, settings.showDemoProjects).length, 0);
  assert.equal(visibleProjects(projects, true).length, projects.length);
  const client = { ...projects[0], kind: "client" as const, slug: "real" };
  assert.deepEqual(visibleProjects([...projects, client], false).map((p) => p.slug), ["real"]);
});

/* ------------------------------------ request guards and email ------------------------------------ */
import { readJson, sameOrigin } from "../src/lib/request-guard.ts";
import { escHtml, oneLine, safeAddress, safeFrom, sendViaResend, type HttpFetch } from "../src/lib/email-core.ts";

const post = (body: BodyInit | null, headers: Record<string, string> = { "content-type": "application/json" }) => new Request("http://site.test/api/x", { method: "POST", body, headers });

test("request guard: JSON only, size-limited, malformed rejected", async () => {
  assert.deepEqual(await readJson(post('{"a":1}'), 100), { ok: true, body: { a: 1 } });
  assert.deepEqual(await readJson(post('{"a":1}', { "content-type": "application/json; charset=utf-8" }), 100), { ok: true, body: { a: 1 } });
  assert.equal((await readJson(post("a=1", { "content-type": "application/x-www-form-urlencoded" }), 100) as { status: number }).status, 415);
  assert.equal((await readJson(post("{}", { }), 100) as { status: number }).status, 415);
  assert.equal((await readJson(post("{bad"), 100) as { status: number }).status, 400);
  assert.equal((await readJson(post(JSON.stringify({ x: "y".repeat(500) })), 100) as { status: number }).status, 413);
  // no Content-Length (streamed) body that grows past the limit is still stopped
  const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"x":"' + "z".repeat(400))); c.enqueue(new TextEncoder().encode('"}')); c.close(); } });
  const streamed = new Request("http://site.test/x", { method: "POST", body: stream, headers: { "content-type": "application/json" }, duplex: "half" } as RequestInit);
  assert.equal((await readJson(streamed, 100) as { status: number }).status, 413);
  assert.equal((await readJson(new Request("http://site.test/x", { method: "POST", headers: { "content-type": "application/json" } }), 100) as { status: number }).status, 400);
});
test("request guard: cross-site posts are refused, same-site and non-browser calls allowed", () => {
  const r = (h: Record<string, string>) => new Request("http://site.test/x", { method: "POST", headers: h });
  assert.equal(sameOrigin(r({ origin: "http://site.test", host: "site.test" })), true);
  assert.equal(sameOrigin(r({ origin: "https://evil.example", host: "site.test" })), false);
  assert.equal(sameOrigin(r({ "sec-fetch-site": "cross-site" })), false);
  assert.equal(sameOrigin(r({ "sec-fetch-site": "same-origin", origin: "http://site.test", host: "site.test" })), true);
  assert.equal(sameOrigin(r({ origin: "not a url", host: "site.test" })), false);
  assert.equal(sameOrigin(r({})), true);
});

const MSG = { from: "Cloud Edge <noreply@cloudedge.ng>", to: "client@example.com", replyTo: "client@example.com", subject: "Hello", html: "<p>x</p>", text: "x" };
const run = (fetcher: HttpFetch, msg = MSG, logs: string[] = []) => sendViaResend(msg, { apiKey: "re_SECRETKEY123456", fetcher, retryDelayMs: 1, log: (m) => logs.push(m) });

test("email: accepted by provider -> sent; request carries key, idempotency key, single recipient", async () => {
  let seen: { url: string; headers: Record<string, string>; body: string } | undefined;
  assert.equal(await run(async (url, init) => { seen = { url, headers: init.headers, body: init.body }; return { status: 200, ok: true }; }), "sent");
  assert.equal(seen!.url, "https://api.resend.com/emails");
  assert.equal(seen!.headers.Authorization, "Bearer re_SECRETKEY123456");
  assert.ok(seen!.headers["Idempotency-Key"]);
  assert.deepEqual(JSON.parse(seen!.body).to, ["client@example.com"]);
});
test("email: provider rejects (4xx) -> failed, no retry, no secret or body in logs", async () => {
  let calls = 0; const logs: string[] = [];
  assert.equal(await run(async () => { calls++; return { status: 403, ok: false }; }, MSG, logs), "failed");
  assert.equal(calls, 1);
  assert.ok(!logs.join("").includes("re_SECRETKEY") && !logs.join("").includes("client@example.com"));
});
test("email: temporary failure is retried once with the same idempotency key", async () => {
  const keys: string[] = []; let n = 0;
  assert.equal(await run(async (_u, init) => { keys.push(init.headers["Idempotency-Key"]); return ++n === 1 ? { status: 503, ok: false } : { status: 200, ok: true }; }), "sent");
  assert.equal(keys.length, 2); assert.equal(keys[0], keys[1]);
  n = 0; assert.equal(await run(async () => { n++; throw new Error("socket hang up"); }), "failed"); assert.equal(n, 2);
  n = 0; assert.equal(await run(async () => { n++; return { status: 429, ok: false }; }), "failed"); assert.equal(n, 2);
});
test("email: header-injection and malformed addresses are refused before any request is made", async () => {
  let calls = 0; const f: HttpFetch = async () => { calls++; return { status: 200, ok: true }; };
  for (const to of ["a@b.com\r\nBcc: evil@x.com", "a@b.com,evil@x.com", "<a@b.com>", "a b@c.com", "", "no-at-sign"]) assert.equal(await run(f, { ...MSG, to }), "failed", to);
  assert.equal(await run(f, { ...MSG, replyTo: "x@y.com\nBcc: z@z.com" }), "failed");
  assert.equal(await run(f, { ...MSG, from: "Evil <a@b.com>\r\nBcc: z@z.com" }), "failed");
  assert.equal(calls, 0);
  assert.equal(await sendViaResend(MSG, { apiKey: "", fetcher: f }), "failed");
  assert.equal(safeAddress("ada@example.com"), true); assert.equal(safeFrom("Cloud Edge <noreply@cloudedge.ng>"), true); assert.equal(safeFrom("noreply@cloudedge.ng"), true);
});
test("email: subject line breaks are flattened and HTML is escaped", async () => {
  assert.equal(oneLine("Hi\r\nBcc: x@y.com more"), "Hi Bcc: x@y.com more");
  assert.equal(escHtml(`<img src=x onerror="a()">&'`), "&lt;img src=x onerror=&quot;a()&quot;&gt;&amp;&#39;");
  let body = "";
  await run(async (_u, i) => { body = i.body; return { status: 200, ok: true }; }, { ...MSG, subject: "Order\r\nBcc: evil@x.com" });
  assert.ok(!JSON.parse(body).subject.includes("\n"));
});
test("email: a custom base URL (test servers) is used and the API key never leaves the Authorization header", async () => {
  let url = "", payload = "";
  await sendViaResend(MSG, { apiKey: "re_k", baseUrl: "http://127.0.0.1:4020/", fetcher: async (u, i) => { url = u; payload = i.body; return { status: 200, ok: true }; } });
  assert.equal(url, "http://127.0.0.1:4020/emails"); assert.ok(!payload.includes("re_k"));
});
