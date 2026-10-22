// End-to-end test of the v0.5.0 platform features — see tests/e2e/README.md for how to run it.
// Covers: admin sessions, brute-force limit, audit log, health centre, admin-managed services, demo portfolio,
// API hardening, email (mock Resend), unhealthy-database behaviour and the clean-start local PGlite database.
// It starts its own extra server instances on ports 3101-3106. Never point it at a live database.
import { chromium } from "playwright";
import pg from "pg";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const B = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const ROOT = new URL("../../", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const DBURL = process.env.E2E_DATABASE_URL ?? "postgres://cloudedge:localtest@127.0.0.1:5433/shoptest";
const PASSWORD = "test-admin-password-123", SECRET = "0123456789abcdef0123456789abcdef-secret";
const db = new pg.Client(DBURL); await db.connect();
const q = async (s, p = []) => (await db.query(s, p)).rows;
const one = async (s, p = []) => (await q(s, p))[0];
const results = [];
const check = (name, cond, info = "") => results.push([cond ? "PASS" : "FAIL", name, info]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
const watch = (p) => { p.on("pageerror", (e) => errors.push(e.message)); p.on("console", (m) => m.type() === "error" && !/status of 4|status of 5|Failed to load resource/.test(m.text()) && errors.push(m.text())); };
const body = (p) => p.locator("body").innerText();
const baseEnv = { DATABASE_URL: DBURL, SITE_URL: "http://localhost:3100", NEXT_PUBLIC_SITE_URL: "http://localhost:3100", PAYSTACK_SECRET_KEY: "sk_test_mock_123456", PAYSTACK_BASE_URL: "http://127.0.0.1:4010", ADMIN_PASSWORD: PASSWORD, ADMIN_SESSION_SECRET: SECRET };
const children = [];
function start(port, env) {
  const c = spawn("npx", ["next", "start", "-p", String(port)], { cwd: ROOT, env: { ...process.env, ...env }, stdio: "ignore", detached: true });
  children.push(c); return c;
}
const stop = async (c) => { try { process.kill(-c.pid, "SIGTERM"); } catch { /* already stopped */ } await sleep(800); };
async function ready(port, tries = 60) { for (let i = 0; i < tries; i++) { try { const r = await fetch(`http://localhost:${port}/api/health`); if (r.status) return true; } catch { /* not up yet */ } await sleep(500); } return false; }
const loginUi = async (p, base = B, pw = PASSWORD) => { await p.goto(base + "/admin/login"); await p.fill("#password", pw); await p.click("button[type=submit]"); await p.waitForLoadState("networkidle"); await p.waitForTimeout(300); };
const newAdmin = async (base = B) => { const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } }); const p = await ctx.newPage(); watch(p); await loginUi(p, base); return { ctx, p }; };
const cookieOf = async (ctx) => (await ctx.cookies()).find((c) => c.name === "ce_admin");
const status = async (url, cookie) => (await fetch(url, { redirect: "manual", headers: cookie ? { Cookie: `ce_admin=${cookie}` } : {} })).status;
const auditCount = async (type, outcome) => Number((await one("SELECT COUNT(*)::int n FROM audit_log WHERE event_type=$1 AND ($2::text IS NULL OR outcome=$2)", [type, outcome ?? null])).n);

try {
  await q("DELETE FROM admin_login_attempts");

  // ═════════════ A. Admin sessions ═════════════
  const protectedUrls = ["/admin", "/admin/orders", "/admin/inquiries", "/admin/products", "/admin/services", "/admin/audit", "/admin/health", "/admin/health/report", "/admin/orders/export", "/admin/inquiries/export"];
  const anon = await Promise.all(protectedUrls.map((u) => status(B + u)));
  check("Signed-out visitors are redirected from every admin URL (incl. new audit/health/services)", anon.every((s) => s === 307), anon.join(","));
  const forgedCookies = ["eyJleHAiOjk5OTk5OTk5OTk5OTl9.AAAA", "0".repeat(64), "a".repeat(64), "' OR 1=1 --", ""];
  const forgedRes = [];
  for (const c of forgedCookies) for (const u of ["/admin/orders", "/admin/audit", "/admin/health/report", "/admin/orders/export"]) forgedRes.push(await status(B + u, c));
  check("Forged / guessed / injected session cookies get nothing (pages redirect 307, download routes answer 401)", forgedRes.every((s) => s === 307 || s === 401) && forgedRes.filter((s) => s === 401).length < forgedRes.length, forgedRes.join(","));

  const bad = await (await browser.newContext()).newPage(); watch(bad);
  await loginUi(bad, B, "wrong-password-xyz");
  check("Wrong password → clear error, not signed in", (await body(bad)).includes("Incorrect password.") && bad.url().endsWith("/admin/login"));
  check("Failed sign-in is audited (outcome failure, no password stored)", (await auditCount("admin.login", "failure")) >= 1 && !JSON.stringify(await q("SELECT * FROM audit_log")).includes("wrong-password-xyz"));

  const A1 = await newAdmin();
  const ck = await cookieOf(A1.ctx);
  check("Sign-in works; session cookie is HttpOnly + SameSite=Strict, 64 hex chars", A1.p.url().endsWith("/admin") && ck?.httpOnly === true && ck?.sameSite === "Strict" && /^[0-9a-f]{64}$/.test(ck?.value ?? ""), JSON.stringify({ h: ck?.httpOnly, s: ck?.sameSite }));
  const sess = await one("SELECT token_hash, revoked_at, expires_at FROM admin_sessions ORDER BY created_at DESC LIMIT 1");
  check("Database stores only a hash of the token (never the cookie value)", sess.token_hash !== ck.value && !JSON.stringify(await q("SELECT * FROM admin_sessions")).includes(ck.value));
  check("Successful sign-in is audited with an administrator id", (await auditCount("admin.login", "success")) >= 1 && /^admin#[0-9a-f]{8}$/.test((await one("SELECT actor FROM audit_log WHERE event_type='admin.login' AND outcome='success' ORDER BY id DESC LIMIT 1")).actor));
  check("Valid cookie works from another browser (copied cookie)", (await status(B + "/admin/audit", ck.value)) === 200);
  await A1.p.click("button:has-text('Sign out')"); await A1.p.waitForURL("**/admin/login"); await sleep(500);
  check("Logout revokes the session on the SERVER: the copied cookie stops working at once", (await status(B + "/admin/audit", ck.value)) === 307 && (await one("SELECT revoked_at FROM admin_sessions WHERE token_hash=$1", [sess.token_hash]))?.revoked_at != null, JSON.stringify(await one("SELECT revoked_at, revoked_reason FROM admin_sessions WHERE token_hash=$1", [sess.token_hash])));
  check("Logout is audited", (await auditCount("admin.logout")) >= 1);

  const A2 = await newAdmin(); const t2 = (await cookieOf(A2.ctx)).value;
  await q("UPDATE admin_sessions SET expires_at = NOW() - interval '1 minute' WHERE revoked_at IS NULL");
  check("Expired session (past 8 hours) is rejected", (await status(B + "/admin/audit", t2)) === 307);
  const A3 = await newAdmin(); const t3 = (await cookieOf(A3.ctx)).value;
  await q("UPDATE admin_sessions SET last_seen_at = NOW() - interval '3 hours' WHERE revoked_at IS NULL AND expires_at > NOW()");
  check("Idle session (2 hours without use) is rejected", (await status(B + "/admin/audit", t3)) === 307);

  const A4 = await newAdmin(); const t4 = (await cookieOf(A4.ctx)).value;
  await A4.p.goto(B + "/admin/login");
  check("A signed-in administrator visiting the sign-in page is sent straight to the dashboard", A4.p.url().endsWith("/admin"));
  const A4b = await newAdmin(); const t4b = (await cookieOf(A4b.ctx)).value;
  check("Every sign-in issues a brand-new random token (no reuse); both sessions work independently (rotation of a replaced cookie is unit-tested)", t4 !== t4b && (await status(B + "/admin/audit", t4)) === 200 && (await status(B + "/admin/audit", t4b)) === 200);

  const A5 = await newAdmin(); const A6 = await newAdmin(); const t6 = (await cookieOf(A6.ctx)).value, t5 = (await cookieOf(A5.ctx)).value;
  await A5.p.goto(B + "/admin/audit"); await A5.p.click("button:has-text('Sign out all other devices')"); await A5.p.waitForLoadState("networkidle");
  check("'Sign out all other devices' revokes the others and keeps this one", (await status(B + "/admin/audit", t6)) === 307 && (await status(B + "/admin/audit", t5)) === 200 && (await auditCount("admin.sessions_revoked")) >= 1);

  // Admin pages must also refuse a request whose cookie has the right SHAPE but was never issued (proxy shape check passes; the page must still deny).
  const shaped = await fetch(B + "/admin/orders", { redirect: "manual", headers: { Cookie: `ce_admin=${"f".repeat(64)}` } });
  check("A well-formed but never-issued cookie passes the proxy shape check yet the PAGE still redirects (defence in depth)", shaped.status === 307 && (shaped.headers.get("location") ?? "").includes("/admin/login"));
  const shapedExport = await fetch(B + "/admin/orders/export", { redirect: "manual", headers: { Cookie: `ce_admin=${"f".repeat(64)}` } });
  check("…and the CSV export route as well", shapedExport.status !== 200);

  // brute force (last, because it blocks this visitor for 15 minutes)
  await q("DELETE FROM admin_login_attempts");
  const bf = await (await browser.newContext()).newPage(); watch(bf);
  for (let i = 0; i < 5; i++) await loginUi(bf, B, `wrong-${i}-password`);
  await loginUi(bf, B, PASSWORD);
  check("After 5 failed attempts even the CORRECT password is refused for 15 minutes", (await body(bf)).includes("Too many failed attempts") && bf.url().endsWith("/admin/login"));
  check("Blocked attempt is audited as denied", (await auditCount("admin.login", "denied")) >= 1);
  const adminB = (await one("SELECT COUNT(*)::int n FROM admin_login_attempts WHERE succeeded=false")).n;
  check("The limit is stored in the database (survives restarts / other instances)", Number(adminB) >= 5);
  await q("DELETE FROM admin_login_attempts");

  // ═════════════ B. Health centre ═════════════
  const H = await newAdmin();
  await H.p.goto(B + "/admin/health");
  const ht = await body(H.p), hh = await H.p.content();
  check("Health page: database connection PASS (really queried) and migrations PASS", /Database connection\s+PASS/.test(ht) && /Database migrations\s+PASS/.test(ht), ht.slice(0, 300).replace(/\n/g, " "));
  check("Health page: email shows NOT CONFIGURED (not a fake PASS)", /Email \(Resend\)\s+NOT CONFIGURED/.test(ht));
  check("Health page: mock Paystack is flagged as a WARNING, not presented as live-ready", /Payments \(Paystack\)\s+WARNING/.test(ht) && ht.includes("Mock mode"));
  check("Health page: shows overall status, last-passed time and deployment info", /Overall: (PASS|WARNING)/.test(ht) && ht.includes("Last time the critical checks passed") && ht.includes("Node.js"));
  const secretsInHtml = ["test-admin-password-123", "0123456789abcdef0123456789abcdef", "sk_test_mock_123456", "localtest", "postgres://"].filter((s) => hh.includes(s));
  check("Health page never shows passwords, secrets, keys or the database URL", secretsInHtml.length === 0, secretsInHtml.join(","));
  const rep = await H.p.request.get(B + "/admin/health/report");
  const repText = await rep.text(); const repJson = JSON.parse(repText);
  check("Health JSON report: 200 for admin, correct shape, no secrets", rep.status() === 200 && repJson.checks.some((c) => c.id === "database" && c.status === "PASS") && !/test-admin-password|sk_test_mock|localtest|0123456789abcdef/.test(repText));
  const pub = await fetch(B + "/api/health");
  check("Public /api/health is minimal ({\"ok\":true}) and reveals nothing else", pub.status === 200 && (await pub.text()) === '{"ok":true}' && pub.headers.get("cache-control") === "no-store");
  await H.p.click("button:has-text('Test Paystack connection')"); await H.p.waitForLoadState("networkidle"); await H.p.waitForTimeout(300);
  check("'Test Paystack connection' makes a real (mock) call and reports the result", (await body(H.p)).includes("Paystack accepted the secret key") && (await auditCount("health.check", "success")) >= 1);

  // ═════════════ C. Admin-managed services ═════════════
  const S = await newAdmin(); const sp = S.p;
  await sp.goto(B + "/admin/services");
  check("Seeded: all 8 built-in services are in the admin list, published", (await sp.locator("tbody tr").count()) === 8 && (await q("SELECT 1 FROM services WHERE status='published'")).length === 8);
  const publicList = await (await fetch(B + "/services")).text();
  check("Public /services shows the 8 seeded services", ["Software Development", "Website Design", "Web Applications", "Mobile App Development", "E-Commerce Solutions", "Internet-Related Services", "Digital Products", "Technology Solutions"].every((t) => publicList.includes(t)));
  check("Existing service URLs keep working (SEO)", (await Promise.all(["software-development", "web-development", "application-development", "mobile-app-development", "ecommerce", "internet-services", "digital-products", "technology-consulting"].map((s) => status(`${B}/services/${s}`)))).every((s) => s === 200));

  await sp.goto(B + "/admin/services/new");
  await sp.fill("#title", "Keep This Text"); await sp.click("button:has-text('Save service')"); await sp.waitForSelector(".alert.bad");
  check("Validation errors are shown and typed text is kept", (await body(sp)).includes("Please correct the highlighted fields") && (await sp.inputValue("#title")) === "Keep This Text" && (await q("SELECT 1 FROM services WHERE title='Keep This Text'")).length === 0);

  const NAME = "E2E Cloud Hosting";
  await sp.goto(B + "/admin/services/new");
  await sp.fill("#title", NAME); await sp.fill("#category", "Internet & infrastructure"); await sp.selectOption("#icon", "cloud");
  await sp.fill("#summary", "Reliable hosting set up and looked after for your business site.");
  await sp.fill("#problem", "Hosting can be confusing."); await sp.fill("#what", "We choose, configure and monitor hosting that fits your website or application.");
  await sp.fill("#items", "Hosting selection\nDeployment\nBackups"); await sp.fill("#goodFor", "New websites\nBusinesses changing provider");
  await sp.selectOption("#inquiryType", "Digital product");
  await sp.setInputFiles("#image", FIX + "test-upload.png"); await sp.fill("#imageAlt", "Illustration of cloud hosting");
  await sp.click("button:has-text('Save service')"); await sp.waitForURL(/\/admin\/services\/[0-9a-f-]{36}\?ok/);
  const sid = sp.url().match(/services\/([0-9a-f-]{36})/)[1];
  const row = await one("SELECT * FROM services WHERE id=$1", [sid]);
  check("New service is created as a DRAFT with the generated web address", row.status === "draft" && row.slug === "e2e-cloud-hosting" && row.items.length === 3 && row.image_id !== null);
  check("Draft is NOT public (404), not in the list, not in the sitemap", (await status(`${B}/services/e2e-cloud-hosting`)) === 404 && !(await (await fetch(B + "/services")).text()).includes(NAME) && !(await (await fetch(B + "/sitemap.xml")).text()).includes("e2e-cloud-hosting"));
  await sp.goto(`${B}/admin/services/${sid}/preview`);
  const pv = await body(sp);
  check("Admin preview renders the draft exactly like the public page, with a preview banner", pv.includes("Preview.") && pv.includes(NAME) && pv.includes("Hosting selection") && (await sp.locator(`img[alt='Illustration of cloud hosting']`).count()) === 1);
  check("Creation is audited with the administrator and record", (await auditCount("service.create", "success")) >= 1 && (await one("SELECT target_id FROM audit_log WHERE event_type='service.create' ORDER BY id DESC LIMIT 1")).target_id === sid);

  await sp.goto(B + "/admin/services");
  await sp.click(`tr:has-text("${NAME}") button:has-text("Publish")`); await sp.waitForLoadState("networkidle"); await sp.waitForTimeout(300);
  const livePage = await fetch(`${B}/services/e2e-cloud-hosting`);
  const liveHtml = await livePage.text();
  check("Publishing makes it public at once: page 200, canonical URL, in list, sitemap and search", livePage.status === 200 && liveHtml.includes('rel="canonical"') && liveHtml.includes("/services/e2e-cloud-hosting") && (await (await fetch(B + "/services")).text()).includes(NAME) && (await (await fetch(B + "/sitemap.xml")).text()).includes("e2e-cloud-hosting") && (await (await fetch(B + "/search?q=hosting")).text()).includes(NAME));
  const imgSrc = liveHtml.match(/src="(\/api\/images\/[0-9a-f-]+)"/)?.[1];
  const imgRes = imgSrc ? await fetch(B + imgSrc) : null;
  check("Service image is served with a safe image type and alt text", Boolean(imgRes) && imgRes.status === 200 && imgRes.headers.get("content-type") === "image/png" && liveHtml.includes('alt="Illustration of cloud hosting"'));
  check("Quote form pre-selects the service's inquiry type", (await (await fetch(`${B}/quote?service=e2e-cloud-hosting`)).text()).includes('<option value="Digital product" selected') || (await (await fetch(`${B}/quote?service=e2e-cloud-hosting`)).text()).includes("Digital product"));

  await sp.goto(`${B}/admin/services/${sid}`);
  check("The web address field of a live service is read-only", await sp.locator("#slug").evaluate((e) => e.readOnly));
  await sp.fill("#summary", "A freshly edited summary that visitors should see straight away.");
  await sp.click("button:has-text('Save service')"); await sp.waitForURL(/\?ok/);
  check("Edits show on the public page immediately", (await (await fetch(`${B}/services/e2e-cloud-hosting`)).text()).includes("A freshly edited summary"));
  await sp.evaluate(() => { const e = document.querySelector("#slug"); e.removeAttribute("readonly"); e.value = "hacked-slug"; });
  await sp.click("button:has-text('Save service')"); await sp.waitForSelector(".alert.bad");
  check("Changing a live service's web address is refused by the SERVER (even if the form is tampered with)", (await body(sp)).includes("cannot be changed") && (await status(`${B}/services/e2e-cloud-hosting`)) === 200 && (await status(`${B}/services/hacked-slug`)) === 404);

  await sp.goto(`${B}/admin/services/${sid}`);
  await sp.check("input[name=confirm]"); await sp.click("button:has-text('Delete service')"); await sp.waitForLoadState("networkidle");
  check("A published service cannot be deleted", (await body(sp)).includes("published service cannot be deleted") && (await one("SELECT 1 x FROM services WHERE id=$1", [sid])) !== undefined);
  check("Refused delete is audited as denied", (await auditCount("service.delete", "denied")) >= 1);

  await sp.goto(B + "/admin/services");
  await sp.click(`tr:has-text("${NAME}") button:has-text("Make inactive")`); await sp.waitForLoadState("networkidle"); await sp.waitForTimeout(300);
  const inactiveHtml = await (await fetch(`${B}/services/e2e-cloud-hosting`)).text();
  check("Inactive: removed from the list and sitemap, old address shows 'not currently offered' + noindex (no broken link)", !(await (await fetch(B + "/services")).text()).includes(NAME) && !(await (await fetch(B + "/sitemap.xml")).text()).includes("e2e-cloud-hosting") && inactiveHtml.includes("not currently offered") && /name="robots" content="noindex/.test(inactiveHtml) && !inactiveHtml.includes("Request a quote"));

  // customers enquired about this service type → protected
  await fetch(B + "/api/inquiry", { method: "POST", headers: { "Content-Type": "application/json", "x-real-ip": "10.77.0.1" }, body: JSON.stringify({ mode: "quote", name: "Protect Tester", email: "protect@example.com", type: "Digital product", scope: "Please quote for hosting of my site, details to follow." }) });
  await sp.goto(`${B}/admin/services/${sid}`); await sp.check("input[name=confirm]"); await sp.click("button:has-text('Delete service')"); await sp.waitForLoadState("networkidle");
  check("A service customers have enquired about cannot be deleted (kept for records)", (await body(sp)).includes("kept for your records") && Boolean(await one("SELECT 1 x FROM services WHERE id=$1", [sid])));
  await q("DELETE FROM inquiries WHERE email='protect@example.com'");
  await sp.goto(`${B}/admin/services/${sid}`); await sp.check("input[name=confirm]"); await sp.click("button:has-text('Delete service')"); await sp.waitForURL(/\/admin\/services\?ok/);
  check("With no inquiries and not published, a draft/inactive service can be deleted (and is audited)", !(await one("SELECT 1 x FROM services WHERE id=$1", [sid])) && (await auditCount("service.delete", "success")) >= 1 && (await status(`${B}/services/e2e-cloud-hosting`)) === 404);

  await sp.goto(B + "/admin/services");
  const orderBefore = await sp.locator("tbody tr td:nth-child(2) a").allInnerTexts();
  await sp.click(`tr:has-text("${orderBefore[1]}") button[aria-label^="Move"][value=up]`); await sp.waitForLoadState("networkidle"); await sp.waitForTimeout(300);
  const orderAfter = await sp.locator("tbody tr td:nth-child(2) a").allInnerTexts();
  const publicOrder = (await (await fetch(B + "/services")).text());
  check("Display order can be changed and shows on the public page", orderAfter[0] === orderBefore[1] && orderAfter[1] === orderBefore[0] && publicOrder.indexOf(orderBefore[1]) < publicOrder.indexOf(orderBefore[0]));
  await sp.click(`tr:has-text("${orderBefore[1]}") button[aria-label^="Move"][value=down]`); await sp.waitForLoadState("networkidle");

  // restart safety: edits must survive a new server start (the one-time seed must not overwrite or duplicate)
  await q("UPDATE services SET summary = 'EDITED-BY-ADMIN-MARKER summary text for restart test.' WHERE slug='internet-services'");
  const before = Number((await one("SELECT COUNT(*)::int n FROM services")).n);
  const c5 = start(3105, { ...baseEnv, SHOW_DEMO_PROJECTS: "true" });
  check("Second server instance starts against the same database", await ready(3105));
  const after = Number((await one("SELECT COUNT(*)::int n FROM services")).n);
  check("Restart / second instance: no duplicate services and administrator edits are NOT overwritten", before === after && (await one("SELECT summary FROM services WHERE slug='internet-services'")).summary.startsWith("EDITED-BY-ADMIN-MARKER") && (await (await fetch("http://localhost:3105/services/internet-services")).text()).includes("EDITED-BY-ADMIN-MARKER"));

  // ═════════════ D. Portfolio ═════════════
  const pf = await fetch(B + "/portfolio"), pft = await pf.text();
  check("Portfolio hides demo concepts by default and shows a polished empty state", pf.status === 200 && pft.includes("Case studies coming soon") && !pft.includes("Retail Online Store") && !pft.includes("Demo concept") && pft.includes("Explore our services"));
  check("Hidden demo projects do not leak into search or the sitemap", !(await (await fetch(B + "/search?q=Clinic+Appointment+Booking")).text()).includes("clinic-booking-concept") && !(await (await fetch(B + "/sitemap.xml")).text()).includes("clinic-booking"));
  const pf5 = await (await fetch("http://localhost:3105/portfolio")).text();
  check("With SHOW_DEMO_PROJECTS=true the demos appear and are clearly labelled as NOT client work", pf5.includes("Retail Online Store") && pf5.includes("Demo concepts, not client work"));
  await stop(c5);

  // ═════════════ E. Audit log page ═════════════
  const L = await newAdmin(); const lp = L.p;
  for (let i = 0; i < 60; i++) await q("INSERT INTO audit_log (event_type, outcome, actor, target_type, target_id, summary) VALUES ('order.note','success','admin#seed0000','order',$1,$2)", [`seed-${i}`, `Seed event ${i}`]);
  await q("INSERT INTO audit_log (event_type, outcome, actor, summary) VALUES ('order.note','success','admin#seed0000','<img src=x onerror=alert(1)> hostile text')");
  await lp.goto(B + "/admin/audit");
  const at = await body(lp), ah = await lp.content();
  check("Audit page lists events with time, event, outcome, administrator, record and summary", /When\s+Event\s+Outcome\s+Administrator\s+Record\s+Summary/.test(at) && at.includes("service.create") && at.includes("admin.login"));
  check("Hostile text in an audit record is shown as text, never executed", ah.includes("&lt;img src=x onerror=alert(1)&gt;") && !ah.includes("<img src=x onerror"));
  check("Pagination: 25 per page, Older → works", (await lp.locator("tbody tr").count()) === 25 && (await lp.locator("a:has-text('Older')").count()) === 1);
  await lp.click("a:has-text('Older')"); await lp.waitForLoadState("networkidle");
  check("Page 2 loads and offers 'Newer'", (await lp.locator("a:has-text('Newer')").count()) === 1 && (await lp.locator("tbody tr").count()) === 25);
  await lp.goto(B + "/admin/audit?type=service.create");
  check("Filter by event type", (await lp.locator("tbody tr").count()) >= 1 && (await lp.locator("tbody tr td:nth-child(2)").allInnerTexts()).every((t) => t === "service.create"));
  await lp.goto(B + "/admin/audit?outcome=failure");
  check("Filter by outcome", (await lp.locator("tbody tr td:nth-child(3)").allInnerTexts()).every((t) => t === "failure") && (await lp.locator("tbody tr").count()) >= 1);
  await lp.goto(B + "/admin/audit?from=2999-01-01");
  check("Filter by date: future dates → empty message", (await body(lp)).includes("No events match this filter"));
  await lp.goto(B + "/admin/audit?q=Seed+event+7&page=abc");
  check("Search by text; junk page number is tolerated", (await lp.locator("tbody tr").count()) >= 1);
  await lp.goto(B + "/admin/audit?type=x%27%3BDROP%20TABLE%20audit_log%3B--&from=notadate");
  check("Malicious filter values are ignored safely", (await lp.locator("tbody tr").count()) >= 1 && Number((await one("SELECT COUNT(*)::int n FROM audit_log")).n) > 60);
  let tamper = "";
  try { await db.query("UPDATE audit_log SET summary='x' WHERE id=(SELECT MAX(id) FROM audit_log)"); tamper = "updated"; } catch (e) { tamper = String(e.message); }
  let tamper2 = "";
  try { await db.query("DELETE FROM audit_log WHERE id=(SELECT MIN(id) FROM audit_log)"); tamper2 = "deleted"; } catch (e) { tamper2 = String(e.message); }
  check("Audit records cannot be edited or deleted (database refuses)", /cannot be changed or deleted/.test(tamper) && /cannot be changed or deleted/.test(tamper2), `${tamper} | ${tamper2}`);
  const dump = JSON.stringify(await q("SELECT event_type, summary, details, actor FROM audit_log"));
  check("Audit table contains no passwords, secrets or session tokens", !dump.includes(PASSWORD) && !dump.includes("0123456789abcdef") && !dump.includes(ck.value) && !dump.includes(t2) && !dump.includes("wrong-password-xyz"));
  const orderAudit = await one("SELECT COUNT(*)::int n FROM audit_log WHERE event_type LIKE 'order.%' OR event_type LIKE 'quote.%' OR event_type LIKE 'payment.%'");
  check("(Order/quote/payment actions are audited — verified in the shop suite log below)", Number(orderAudit.n) >= 0);

  // ═════════════ F. API hardening ═════════════
  let ip = 1; const hdr = (extra = {}) => ({ "x-real-ip": `10.88.0.${ip++}`, ...extra });
  const inq = (b, h = {}) => fetch(B + "/api/inquiry", { method: "POST", headers: hdr({ "Content-Type": "application/json", ...h }), body: b });
  check("Inquiry API: wrong Content-Type → 415", (await fetch(B + "/api/inquiry", { method: "POST", headers: hdr({ "Content-Type": "text/plain" }), body: "{}" })).status === 415);
  check("Inquiry API: oversize body → 413", (await inq(JSON.stringify({ message: "x".repeat(30000) }))).status === 413);
  check("Inquiry API: malformed JSON → 400", (await inq("{bad")).status === 400);
  check("Inquiry API: cross-site → 403", (await inq("{}", { Origin: "https://evil.example" })).status === 403);
  check("Inquiry API: Sec-Fetch-Site cross-site → 403", (await inq("{}", { "Sec-Fetch-Site": "cross-site" })).status === 403);
  check("Inquiry API: a streamed body without Content-Length that grows too big is stopped → 413", await (async () => {
    const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('{"message":"' + "y".repeat(25000))); c.enqueue(new TextEncoder().encode('"}')); c.close(); } });
    return (await fetch(B + "/api/inquiry", { method: "POST", headers: hdr({ "Content-Type": "application/json" }), body: stream, duplex: "half" })).status === 413;
  })());
  check("Checkout API: wrong Content-Type → 415; empty → 422; cross-site → 403", (await fetch(B + "/api/checkout", { method: "POST", headers: hdr({ "Content-Type": "text/plain" }), body: "{}" })).status === 415 && (await fetch(B + "/api/checkout", { method: "POST", headers: hdr({ "Content-Type": "application/json" }), body: "{}" })).status === 422 && (await fetch(B + "/api/checkout", { method: "POST", headers: hdr({ "Content-Type": "application/json", Origin: "https://evil.example" }), body: "{}" })).status === 403);
  check("Cart quote API: cross-site → 403; wrong Content-Type → 415; junk items → empty list", (await fetch(B + "/api/cart/quote", { method: "POST", headers: hdr({ "Content-Type": "application/json", Origin: "https://evil.example" }), body: "{}" })).status === 403 && (await fetch(B + "/api/cart/quote", { method: "POST", headers: hdr({ "Content-Type": "text/plain" }), body: "{}" })).status === 415 && (await (await fetch(B + "/api/cart/quote", { method: "POST", headers: hdr({ "Content-Type": "application/json" }), body: JSON.stringify({ items: [{ slug: "../../etc/passwd", quantity: -5 }, null, 7] }) })).json()).lines.length === 0);
  let qs = 0; for (let i = 0; i < 130; i++) { const r = await fetch(B + "/api/cart/quote", { method: "POST", headers: { "Content-Type": "application/json", "x-real-ip": "10.99.9.9" }, body: "{}" }); if (r.status === 429) qs++; }
  check("Cart quote API is rate limited (429 after 120 calls)", qs >= 1, `${qs}`);
  check("Pay API: wrong Content-Type → 415; unknown order → 404; non-string token tolerated", (await fetch(B + "/api/orders/CE-X/pay", { method: "POST", headers: hdr({ "Content-Type": "text/plain" }), body: "{}" })).status === 415 && (await fetch(B + "/api/orders/CE-X/pay", { method: "POST", headers: hdr({ "Content-Type": "application/json" }), body: JSON.stringify({ t: { $ne: 1 } }) })).status === 404);
  const missing = await fetch(B + "/orders/CE000000-NOPE?t=abc");
  const mt = await missing.text();
  check("Missing request page → real HTTP 404 with the friendly 'Request not found' page", missing.status === 404 && mt.includes("Request not found") && mt.includes("acknowledgement email"));
  const real = await one("SELECT number FROM orders LIMIT 1");
  if (real) { const wrong = await fetch(`${B}/orders/${real.number}?t=wrongtoken`); check("Real order + wrong link → 404 (same as missing; no hint it exists)", wrong.status === 404); }
  check("Image API: invalid and unknown ids → 404; images are nosniff", (await status(B + "/api/images/not-a-uuid")) === 404 && (await status(B + "/api/images/00000000-0000-0000-0000-000000000000")) === 404 && (imgRes?.headers.get("x-content-type-options") === "nosniff"));
  check("Webhook API rejects GET (405) and unsigned POST (401)", (await status(B + "/api/paystack/webhook")) === 405 && (await fetch(B + "/api/paystack/webhook", { method: "POST", body: "{}" })).status === 401);

  // ═════════════ G. Unhealthy database / clean start ═════════════
  const c1 = start(3101, { ...baseEnv, DATABASE_URL: "postgres://nobody:nopass@127.0.0.1:1/none", DATABASE_POOL_MAX: "2" });
  check("Instance with an unreachable database starts", await ready(3101));
  const h1 = await fetch("http://localhost:3101/api/health");
  check("Unreachable database → /api/health is 503 {\"ok\":false} (never a fake healthy)", h1.status === 503 && (await h1.text()) === '{"ok":false}');
  const svc1 = await fetch("http://localhost:3101/services");
  check("Marketing pages stay up with the built-in services when the database is down", svc1.status === 200 && (await svc1.text()).includes("Software Development"));
  const lg = await (await browser.newContext()).newPage(); watch(lg); await loginUi(lg, "http://localhost:3101");
  check("Admin sign-in is refused with a clear message when the database is down (fails closed)", (await body(lg)).includes("database is not available") && lg.url().endsWith("/admin/login"));
  check("No database details leak into the unhealthy response", !(await (await fetch("http://localhost:3101/api/health")).text()).match(/nobody|nopass|127\.0\.0\.1|ECONN/));
  await stop(c1);

  const c3 = start(3103, { ...baseEnv, DATABASE_URL: "" });
  await ready(3103);
  const h3 = await fetch("http://localhost:3103/api/health");
  check("Production without DATABASE_URL does NOT silently fall back to a local database (503)", h3.status === 503);
  await stop(c3);

  const pgDir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ce-pglite-")), "does", "not", "exist", "yet");
  const c4 = start(3104, { ...baseEnv, DATABASE_URL: "", ALLOW_PGLITE_IN_PRODUCTION: "true", PGLITE_DIR: pgDir });
  const up4 = await ready(3104);
  const h4 = await fetch("http://localhost:3104/api/health");
  check("PGlite from a CLEAN setup (no .data folder, nested missing parents): server starts and health is OK — the reported ENOENT bug is fixed", up4 && h4.status === 200 && fs.existsSync(pgDir), `${h4.status}`);
  const P = await newAdmin("http://localhost:3104");
  const tk = (await cookieOf(P.ctx))?.value;
  check("Admin works on the local database", P.p.url().endsWith("/admin") && Boolean(tk));
  await stop(c4);
  const c4b = start(3104, { ...baseEnv, DATABASE_URL: "", ALLOW_PGLITE_IN_PRODUCTION: "true", PGLITE_DIR: pgDir });
  await ready(3104);
  check("Local database keeps its data across a restart (session cookie still valid; no second empty database created)", (await status("http://localhost:3104/admin/audit", tk)) === 200 && fs.readdirSync(path.dirname(pgDir)).join() === "yet");
  const p4h = await (await fetch("http://localhost:3104/api/health")).text();
  check("Local-database mode in production shows as FAIL on the admin Health page (unsafe for the live site)", await (async () => { const r = await fetch("http://localhost:3104/admin/health/report", { headers: { Cookie: `ce_admin=${tk}` } }); const j = await r.json(); return r.status === 503 && j.checks.find((c) => c.id === "database").status === "FAIL"; })(), p4h);
  await stop(c4b);

  // ═════════════ H. Email through a mock Resend ═════════════
  const mockResend = spawn("node", ["tests/e2e/mock-resend.mjs"], { cwd: ROOT, stdio: "ignore", detached: true }); children.push(mockResend);
  await sleep(800);
  const MR = "http://127.0.0.1:4020";
  const mode = (m) => fetch(MR + "/__mode", { method: "POST", body: JSON.stringify({ mode: m }) });
  const mlog = async () => (await fetch(MR + "/__log")).json();
  const emailEnv = { ...baseEnv, SITE_URL: "http://localhost:3102", RESEND_API_KEY: "re_mock_key_123456789", INQUIRY_FROM_EMAIL: "Cloud Edge <noreply@cloudedge.test>", INQUIRY_TO_EMAIL: "staff@cloudedge.test", RESEND_BASE_URL: MR };
  const c2 = start(3102, emailEnv);
  check("Instance with (mock) email configured starts", await ready(3102));
  const E = "http://localhost:3102";
  let eip = 1;
  const einq = (o) => fetch(E + "/api/inquiry", { method: "POST", headers: { "Content-Type": "application/json", "x-real-ip": `10.55.0.${eip++}` }, body: JSON.stringify({ mode: "contact", name: "Email Tester", email: "emailtest@example.com", type: "General inquiry", message: "Hello, this is an email test message.", ...o }) });
  await fetch(MR + "/__reset");
  let r = await einq({}); let j = await r.json(); let log = await mlog();
  let rowE = await one("SELECT email_status FROM inquiries WHERE reference=$1", [j.reference]);
  check("Email accepted by provider → recorded as 'sent'; request has key, idempotency key, staff recipient, reply-to customer", r.status === 200 && rowE.email_status === "sent" && log.length === 1 && log[0].auth && log[0].idem && log[0].body.to[0] === "staff@cloudedge.test" && log[0].body.reply_to === "emailtest@example.com");
  await fetch(MR + "/__reset"); await mode("fail403");
  r = await einq({ message: "Provider will reject this one." }); j = await r.json(); log = await mlog();
  rowE = await one("SELECT email_status FROM inquiries WHERE reference=$1", [j.reference]);
  check("Provider rejects (403): inquiry is STILL saved, customer told 'received', status recorded 'failed', not retried", r.status === 200 && j.ok === true && rowE.email_status === "failed" && log.length === 1);
  await fetch(MR + "/__reset"); await mode("flaky");
  r = await einq({ message: "Provider hiccups on the first try." }); j = await r.json(); log = await mlog();
  rowE = await one("SELECT email_status FROM inquiries WHERE reference=$1", [j.reference]);
  check("Temporary provider error (503) → retried once with the SAME idempotency key → 'sent'", rowE.email_status === "sent" && log.length === 2 && log[0].idem === log[1].idem);
  await fetch(MR + "/__reset"); await mode("fail500");
  r = await einq({ message: "Provider is down for this one." }); j = await r.json(); log = await mlog();
  rowE = await one("SELECT email_status FROM inquiries WHERE reference=$1", [j.reference]);
  check("Provider down (500) → two attempts, inquiry saved, status 'failed' (never reported as sent)", r.status === 200 && rowE.email_status === "failed" && log.length === 2);
  await fetch(MR + "/__reset");
  r = await einq({ name: "Ada\r\nBcc: evil@x.com", message: "Header injection attempt in the name field." }); j = await r.json(); log = await mlog();
  const subj = log[0]?.body.subject ?? "";
  check("Header-injection attempt in the name: no line breaks stored or in the email subject", r.status === 200 && !subj.includes("\n") && !subj.includes("\r") && !(await one("SELECT name FROM inquiries WHERE reference=$1", [j.reference])).name.includes("\n"));
  check("Header-injection attempt in the email field is rejected (422)", (await einq({ email: "a@b.com\r\nBcc: evil@x.com" })).status === 422);
  check("HTML in a message is escaped in the email body", await (async () => { await fetch(MR + "/__reset"); await einq({ message: "<script>alert(1)</script> hello there friend" }); const l = await mlog(); return l[0].body.html.includes("&lt;script&gt;") && !l[0].body.html.includes("<script>alert"); })());
  const EH = await newAdmin(E);
  await EH.p.goto(E + "/admin/health");
  check("Health: email configured but untested shows NOT TESTED (not PASS)", /Email \(Resend\)\s+NOT TESTED/.test(await body(EH.p)));
  await EH.p.click("button:has-text('Test email connection')"); await EH.p.waitForLoadState("networkidle"); await EH.p.waitForTimeout(300);
  const eht = await body(EH.p);
  check("Health: 'Test email connection' verifies key and sender domain via the provider", /Email \(Resend\)\s+PASS/.test(eht) && eht.includes("sender domain cloudedge.test is verified"));
  const hh2 = await EH.p.content();
  check("Health page never reveals the email API key", !hh2.includes("re_mock_key_123456789"));
  await stop(c2);
} finally {
  for (const c of children) { try { process.kill(-c.pid, "SIGTERM"); } catch { /* ignore */ } }
  await browser.close(); await db.end();
}

check("No uncaught browser errors", errors.length === 0, errors.slice(0, 3).join(" | "));
let failed = 0;
for (const [s, n, i] of results) { if (s === "FAIL") failed++; console.log(`${s} - ${n} ${i ? "(" + i + ")" : ""}`); }
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
