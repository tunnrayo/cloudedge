// End-to-end test — see tests/e2e/README.md for how to run it.
import { chromium } from "playwright";
const B = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const results = [];
const check = (name, cond, info = "") => { results.push([cond ? "PASS" : "FAIL", name, info]); };
const post = (body, headers = {}) => fetch(B + "/api/inquiry", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
const valid = { mode: "contact", name: "API Tester", email: "api@example.com", type: "General inquiry", message: "Testing the inquiry API end to end." };

// ---------- API ----------
let r = await fetch(B + "/api/inquiry"); check("API GET -> 405", r.status === 405, r.status);
r = await post("{bad json", { "x-real-ip": "10.0.0.1" }); check("API bad JSON -> 400", r.status === 400, r.status);
r = await post({ ...valid, email: "x", message: "hi" }, { "x-real-ip": "10.0.0.2" }); let j = await r.json();
check("API invalid -> 422 with field errors", r.status === 422 && j.errors?.email && j.errors?.message, JSON.stringify(j.errors));
r = await post({ ...valid, website: "spam.example" }, { "x-real-ip": "10.0.0.3" }); j = await r.json(); check("API honeypot -> 200 ok, not stored", r.status === 200 && !j.reference, JSON.stringify(j));
r = await post(valid, { "x-real-ip": "10.0.0.4", origin: "https://evil.example" }); check("API cross-origin -> 403", r.status === 403, r.status);
r = await post({ ...valid, product: "does-not-exist" }, { "x-real-ip": "10.0.0.5" }); check("API unknown product -> 422", r.status === 422, r.status);
r = await post(valid, { "x-real-ip": "10.0.0.6" }); j = await r.json(); check("API valid -> 200 + reference", r.status === 200 && /^CE-[A-Z0-9]{6}$/.test(j.reference), JSON.stringify(j));
let codes = [];
for (let i = 0; i < 6; i++) codes.push((await post(valid, { "x-real-ip": "10.9.9.9" })).status);
check("API rate limit: 6th request -> 429", codes[5] === 429 && codes.slice(0, 5).every((c) => c === 200), codes.join(","));
r = await post("x".repeat(30000), { "x-real-ip": "10.0.0.7" }); check("API oversized body -> 413", r.status === 413, r.status);

// ---------- Browser ----------
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, extraHTTPHeaders: { "x-real-ip": "10.1.1.1" } });
const page = await ctx.newPage();
const consoleErrors = []; page.on("pageerror", (e) => consoleErrors.push(e.message));

await page.goto(B + "/contact");
await page.click("button[type=submit]");
check("Contact: empty submit shows errors", (await page.locator(".err").count()) >= 3, await page.locator(".err").count());
check("Contact: focus moves to first invalid field", (await page.evaluate(() => document.activeElement?.getAttribute("name"))) === "name");
await page.fill("#name", "Browser Tester"); await page.fill("#email", "browser@example.com");
await page.selectOption("#type", "Software development"); await page.fill("#message", "Hello from the automated browser test.");
await page.click("button[type=submit]");
await page.waitForSelector(".success-panel", { timeout: 10000 });
const ref1 = await page.locator(".success-panel .ref").textContent();
check("Contact: success panel with reference", /^CE-/.test(ref1 ?? ""), ref1);

await page.goto(B + "/quote?product=slack-pro");
check("Quote: product banner shown", (await page.locator(".alert.info").textContent())?.includes("Slack Pro"));
check("Quote: type preselected", (await page.locator("#type").inputValue()) === "Product enquiry");
await page.fill("#name", "Quote Tester"); await page.fill("#email", "quote@example.com");
await page.fill("#scope", "We need an online store for about 50 products with delivery options.");
await page.selectOption("#budget", "₦500,000 – ₦2,000,000"); await page.selectOption("#timeline", "1 – 3 months");
await page.click("button[type=submit]"); await page.waitForSelector(".success-panel", { timeout: 10000 });
check("Quote: submitted successfully", true);

await page.goto(B + "/quote?service=mobile-app-development");
check("Quote: service preselected from service page", (await page.locator("#type").inputValue()) === "Mobile application");

// Links: every internal link on key pages resolves
const seen = new Set(); const bad = [];
for (const p of ["/", "/about", "/services", "/solutions", "/products", "/portfolio", "/contact", "/faq", "/privacy", "/terms", "/services/ecommerce", "/products/norton-360-deluxe"]) {
  await page.goto(B + p);
  for (const href of await page.$$eval("a[href^='/']", (as) => as.map((a) => a.getAttribute("href")))) {
    const u = href.split("#")[0]; if (seen.has(u)) continue; seen.add(u);
    const s = (await fetch(B + u, { redirect: "manual" })).status; if (s >= 400) bad.push(`${u}:${s}`);
  }
}
check(`Internal links valid (${seen.size} unique)`, bad.length === 0, bad.join(" "));

// Mobile menu
const m = await browser.newContext({ viewport: { width: 390, height: 800 } }); const mp = await m.newPage();
await mp.goto(B + "/");
check("Mobile: nav hidden initially", !(await mp.locator("#main-nav").isVisible()) || (await mp.locator("#main-nav a[href='/about']").boundingBox()).x >= 390);
await mp.click(".menu-btn");
await mp.waitForTimeout(400);
check("Mobile: menu opens", (await mp.locator(".menu-btn").getAttribute("aria-expanded")) === "true" && (await mp.locator("#main-nav a[href='/about']").boundingBox()).x < 390);
await mp.click("#main-nav a[href='/about']"); await mp.waitForURL("**/about");
await mp.waitForTimeout(400);
check("Mobile: link navigates and menu closes", (await mp.locator(".menu-btn").getAttribute("aria-expanded")) === "false");
await mp.click(".menu-btn"); await mp.keyboard.press("Escape"); await mp.waitForTimeout(200);
check("Mobile: Escape closes menu", (await mp.locator(".menu-btn").getAttribute("aria-expanded")) === "false");
await m.close();

// Keyboard: skip link
await page.goto(B + "/"); await page.keyboard.press("Tab");
check("Keyboard: first Tab focuses skip link", (await page.evaluate(() => document.activeElement?.className)) === "skip-link");

// ---------- Admin ----------
const anon = await (await fetch(B + "/admin", { redirect: "manual" })); check("Admin: anonymous /admin redirected", [307, 308].includes(anon.status) && anon.headers.get("location")?.includes("/admin/login"), anon.status);
const anonExp = await fetch(B + "/admin/inquiries/export", { redirect: "manual" }); check("Admin: anonymous export blocked", anonExp.status !== 200, anonExp.status);
const forged = await fetch(B + "/admin", { redirect: "manual", headers: { cookie: "ce_admin=eyJleHAiOjk5OTk5OTk5OTk5OTl9.forged" } }); check("Admin: forged cookie rejected", forged.status === 307, forged.status);
await page.goto(B + "/admin/login");
await page.fill("#password", "wrong-password"); await page.click("button[type=submit]");
await page.waitForSelector(".alert.bad"); check("Admin: wrong password rejected", (await page.locator(".alert.bad").textContent()).includes("Incorrect"));
await page.fill("#password", "test-admin-password-123"); await page.click("button[type=submit]");
await page.waitForURL(B + "/admin"); await page.goto(B + "/admin/inquiries"); 
const rows = await page.locator("tbody tr").count();
check("Admin: dashboard lists inquiries", rows >= 3, rows);
check("Admin: browser inquiry present", (await page.content()).includes(ref1));
const cookies = await ctx.cookies(); const ck = cookies.find((c) => c.name === "ce_admin");
check("Admin: session cookie httpOnly + SameSite=Strict", ck?.httpOnly && ck?.sameSite === "Strict");
await page.fill("#q", "Quote Tester"); await page.click(".toolbar button[type=submit]");
check("Admin: search filter", (await page.locator("tbody tr").count()) === 1);
await page.click("tbody tr a"); await page.waitForURL("**/admin/inquiries/**");
check("Admin: detail shows product + budget", (await page.content()).includes("Slack Pro") && (await page.content()).includes("₦500,000 – ₦2,000,000"));
await page.selectOption("#status", "responded"); await page.fill("#notes", "Called back on Monday."); await page.click("form button:has-text('Save changes')");
await page.waitForSelector(".alert.ok"); check("Admin: status + notes saved", (await page.locator("#status").inputValue()) === "responded" && (await page.locator("#notes").inputValue()) === "Called back on Monday.");
const exp = await page.request.get(B + "/admin/inquiries/export"); const csv = await exp.text();
check("Admin: CSV export", exp.status() === 200 && csv.includes("reference,createdAt") && csv.includes("Quote Tester"), exp.headers()["content-disposition"]);
await page.click("button:has-text('Delete permanently')"); await page.waitForSelector(".alert.bad");
check("Admin: delete requires confirmation", (await page.locator(".alert.bad").textContent()).includes("confirm"));
await page.check("input[name=confirm]"); await page.click("button:has-text('Delete permanently')");
await page.waitForURL("**/admin/inquiries?deleted=1"); check("Admin: delete works", (await page.locator(".alert.ok").textContent()).includes("deleted"));
await page.click("button:has-text('Sign out')"); await page.waitForURL("**/admin/login");
const after = await page.request.get(B + "/admin/inquiries", { maxRedirects: 0 }); check("Admin: signed out -> protected again", after.status() === 307, after.status());

check("No uncaught page errors", consoleErrors.length === 0, consoleErrors.join(" | "));
await browser.close();
for (const [s, n, i] of results) console.log(s, "-", n, i ? `(${i})` : "");
console.log(`\n${results.filter((x) => x[0] === "PASS").length}/${results.length} passed`);
