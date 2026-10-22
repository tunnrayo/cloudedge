// End-to-end test of the MANUAL SOURCING workflow — see tests/e2e/README.md for how to run it.
import { chromium } from "playwright";
import pg from "pg";
import { createHmac, randomBytes } from "node:crypto";

const B = process.env.E2E_BASE_URL ?? "http://localhost:3100", MOCK = "http://127.0.0.1:4010", KEY = "sk_test_mock_123456";
const SP = new URL("./fixtures", import.meta.url).pathname;
const db = new pg.Client(process.env.E2E_DATABASE_URL ?? "postgres://cloudedge:localtest@127.0.0.1:5433/shoptest"); await db.connect();
const q = async (s, p = []) => (await db.query(s, p)).rows;
const one = async (s, p = []) => (await q(s, p))[0];
const results = [];
const check = (name, cond, info = "") => results.push([cond ? "PASS" : "FAIL", name, info]);
const sign = (body) => createHmac("sha512", KEY).update(body).digest("hex");
const webhook = (body, sig = sign(body)) => fetch(B + "/api/paystack/webhook", { method: "POST", headers: { "Content-Type": "application/json", "x-paystack-signature": sig }, body });
const rid = () => randomBytes(16).toString("hex");
let ip = 1;
const api = (path, body, extra = {}) => fetch(B + path, { method: "POST", headers: { "Content-Type": "application/json", "x-real-ip": `10.9.0.${ip++}`, ...extra }, body: JSON.stringify(body) });
const customer = (o = {}) => ({ name: "Tess Tester", email: "tess@example.com", country: "Nigeria", acceptTerms: true, ...o });

const act = async (p, sel) => { await Promise.all([p.waitForResponse((r) => r.request().method() === "POST" && r.url().startsWith(B)), p.click(sel)]); await p.waitForLoadState("networkidle"); await p.waitForTimeout(150); };
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
const watch = (p) => { p.on("pageerror", (e) => errors.push(e.message)); p.on("console", (m) => m.type() === "error" && !/404|status of 4/.test(m.text()) && errors.push(m.text())); };
const txt = (p) => p.locator("body").innerText();
const alertText = async (p, kind) => ((await p.locator(`.alert.${kind}`).first().textContent().catch(() => "")) ?? "");

// ───────────── A. Admin sign-in ─────────────
const admin = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage(); watch(admin);
await admin.goto(B + "/admin/login"); await admin.fill("#password", "test-admin-password-123"); await admin.click("button[type=submit]"); await admin.waitForURL(B + "/admin");
check("Admin dashboard shows test payment mode", (await admin.content()).includes("test mode"));
const pid = async (slug) => (await one("SELECT id FROM products WHERE slug = $1", [slug])).id;

// ───────────── B. Browsing ─────────────
const shop = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await shop.newPage(); watch(page);
await page.goto(B + "/products?q=norton");
check("Search 'norton' returns 5 products", (await page.locator(".shop-card").count()) === 5, await page.locator(".shop-card").count());
await page.goto(B + "/products/category/cybersecurity?sort=price-asc");
const prices = await page.$$eval(".shop-card .price strong", (els) => els.map((e) => Number(e.textContent.replace(/[^\d]/g, ""))));
check("Category page + price sort ascending", prices.length === 12 && prices.every((v, i) => i === 0 || prices[i - 1] <= v), prices.join(","));
await page.goto(B + "/products?billing=one_time");
check("Billing filter: one-time → 2 products", (await page.locator(".shop-card").count()) === 2);
await page.goto(B + "/products");
const imgs = await page.$$eval(".shop-card img", (els) => els.map((e) => e.getAttribute("src")));
check("61 products, each with a distinct image", imgs.length === 61 && new Set(imgs).size === 61, `${imgs.length}/${new Set(imgs).size}`);
const broken = [];
for (const s of new Set(imgs)) { const r = await fetch(B + s); if (r.status !== 200) broken.push(s); }
check("No broken product images", broken.length === 0, broken.join(" "));
const listHtml = await page.content();
check("Catalogue shows indicative prices + sourcing disclaimer", listHtml.includes("Indicative") && listHtml.includes("Cloud Edge sources eligible software products through external suppliers. Availability, final pricing, licence eligibility, and delivery time must be confirmed before your order is finalised."));
check("No 'Buy online' / 'Add to cart' wording anywhere in the shop", !/Buy online|Add to cart/.test(listHtml));
await page.goto(B + "/products/norton-360-deluxe");
const pdp = await page.content();
check("Product page: indicative price, reference, disclaimer", pdp.includes("Indicative price") && pdp.includes("₦176,612") && pdp.includes("US$124.99") && pdp.includes("must be confirmed before your order is finalised"));
check("Product page: 'Request this software' + 'Check availability'", (await page.locator("button:has-text('Request this software')").count()) === 1 && (await page.locator("a:has-text('Check availability')").count()) === 1);
check("Product page: no purchase offer in structured data", !pdp.includes('"@type":"Offer"'));
check("Product page: no authorised-partner claim", pdp.includes("not an authorised partner"));

// ───────────── C. Unavailable product ─────────────
await admin.goto(B + "/admin/products");
await admin.locator(`input[name=ids][value="${await pid("slack-pro")}"]`).check();
await admin.selectOption("#bulk", "unavailable"); await act(admin, "button:has-text('Apply to selected')");
check("Admin marks a product unavailable (bulk)", (await alertText(admin, "ok")).includes("1 product(s) marked unavailable"));
await page.goto(B + "/products/slack-pro");
check("Unavailable product cannot be requested from its page", (await page.locator("text=Currently unavailable").count()) >= 1 && (await page.locator("button:has-text('Request this software')").count()) === 0);
await page.goto(B + "/products?availability=unavailable");
check("Availability filter: unavailable → 1", (await page.locator(".shop-card").count()) === 1);
const unav = await api("/api/checkout", { customer: customer(), items: [{ slug: "slack-pro", quantity: 1 }], requestId: rid() });
check("Server rejects a request for an unavailable product (409)", unav.status === 409);

// ───────────── D. Request list ─────────────
await page.goto(B + "/products/norton-360-deluxe");
await page.click(".qty-btn[aria-label=Increase]"); await page.click("button:has-text('Request this software')"); await page.waitForSelector(".added-msg");
await page.goto(B + "/products/microsoft-365-business-standard");
await page.fill("#qty", "3"); await page.click("button:has-text('Request this software')"); await page.waitForSelector(".added-msg");
check("Header request-list count shows 5", (await page.locator(".cart-count").textContent()) === "5");
await page.goto(B + "/cart"); await page.waitForSelector(".cart-line"); await page.reload(); await page.waitForSelector(".cart-line");
check("Request list persists after refresh", (await page.locator(".cart-line").count()) === 2);
const totalText = async () => Number((await page.locator("dd.total").textContent()).replace(/[^\d]/g, ""));
check("Indicative total = catalogue prices × quantities", (await totalText()) === 176612 * 2 + 300300 * 3, String(await totalText()));
check("Request list says nothing is charged now", (await page.content()).includes("Payment now"));
await page.locator(".cart-line", { hasText: "Microsoft" }).locator(".qty-btn[aria-label=Decrease]").click();
await page.waitForFunction((v) => Number(document.querySelector("dd.total").textContent.replace(/[^\d]/g, "")) === v, 176612 * 2 + 300300 * 2);
check("Quantity change updates indicative total", true);

// ───────────── E. Request submission (review step) ─────────────
await page.click("a:has-text('Continue to request details')"); await page.waitForSelector("form.form-card");
await page.click("button:has-text('Review request')");
check("Request form validation errors shown", (await page.locator(".err").count()) >= 3, await page.locator(".err").count());
await page.fill("#name", "Ada Buyer"); await page.fill("#email", "buyer@example.com"); await page.fill("#country", "Nigeria"); await page.fill("#notes", "Activate on ada@company.ng"); await page.check("input[name=acceptTerms]");
await page.click("button:has-text('Review request')");
await page.waitForSelector("text=Review your request");
check("Review step shows details before submit", (await txt(page)).includes("buyer@example.com") && (await page.locator("button:has-text('Submit request')").count()) === 1);
const before = Number((await one("SELECT COUNT(*)::int n FROM orders")).n);
await Promise.all([page.waitForURL(/\/orders\/CE.*new=1/), page.click("button:has-text('Submit request')")]);
const orderUrl = page.url();
const A = await one("SELECT * FROM orders WHERE number = $1", [new URL(orderUrl).pathname.split("/").pop()]);
const ack = await txt(page);
check("Acknowledgement with reference shown; not an order confirmation", ack.includes(`Request received — reference ${A.number}`) && ack.includes("not an order confirmation"));
check("Request stored: status Request received, unpaid, indicative total", A.status === "request_received" && A.payment_status === "unpaid" && Number(A.indicative_total_kobo) === (176612 * 2 + 300300 * 2) * 100);
check("No payment record created at request time", Number((await one("SELECT COUNT(*)::int n FROM payments WHERE order_id=$1", [A.id])).n) === 0);
check("Exactly one new request created", Number((await one("SELECT COUNT(*)::int n FROM orders")).n) === before + 1);
await page.goto(B + "/products");
check("Request list cleared after submission", (await page.locator(".cart-count").count()) === 0);
const ackMail = await one("SELECT email_status FROM order_events WHERE order_id=$1 AND message='Request acknowledgement email'", [A.id]);
check("Acknowledgement email recorded honestly (not configured)", ackMail?.email_status === "not_configured", ackMail?.email_status);

// ───────────── F. Duplicate submission & unique references ─────────────
const dupId = rid();
const d1 = await (await api("/api/checkout", { customer: customer(), items: [{ slug: "norton-360-deluxe", quantity: 1 }], requestId: dupId })).json();
const d2 = await (await api("/api/checkout", { customer: customer(), items: [{ slug: "norton-360-deluxe", quantity: 1 }], requestId: dupId })).json();
check("Duplicate submission returns the same reference (no second request)", d1.ok && d2.ok && d1.orderNumber === d2.orderNumber && d2.duplicate === true);
check("Duplicate response does not leak the secret link", d2.orderUrl === null);
check("Only one row for the duplicated request", Number((await one("SELECT COUNT(*)::int n FROM orders WHERE client_request_id=$1", [dupId])).n) === 1);
const refs = [];
for (let i = 0; i < 4; i++) refs.push((await (await api("/api/checkout", { customer: customer({ email: `u${i}@example.com` }), items: [{ slug: "norton-360-deluxe", quantity: 1 }], requestId: rid() })).json()).orderNumber);
check("Every request gets a unique reference", new Set(refs).size === 4 && refs.every((r) => /^CE\d{6}-[A-Z0-9]{5}$/.test(r)), refs.join(","));
const tamper = await (await api("/api/checkout", { customer: customer(), items: [{ slug: "norton-360-deluxe", quantity: 1, price: 1, unitPriceNgn: 1 }], total: 100, requestId: rid() })).json();
check("Browser-supplied prices ignored", Number((await one("SELECT indicative_total_kobo FROM orders WHERE number=$1", [tamper.orderNumber])).indicative_total_kobo) === 17661200);
check("Cross-site request POST blocked (403)", (await api("/api/checkout", {}, { Origin: "https://evil.example" })).status === 403);
const noCountry = await api("/api/checkout", { customer: customer({ country: "" }), items: [{ slug: "norton-360-deluxe", quantity: 1 }] });
check("Server requires country (422)", noCountry.status === 422);

// ───────────── G. No payment before an accepted quotation ─────────────
const token = new URL(orderUrl).searchParams.get("t");
const early = await api(`/api/orders/${A.number}/pay`, { t: token });
check("Payment cannot start before a quotation is accepted (409)", early.status === 409, early.status);
check("Request page shows no Pay button", (await (await fetch(orderUrl)).text()).includes("Pay ₦") === false);
const forged = await webhook(JSON.stringify({ event: "charge.success", data: { reference: `${A.number}-FAKE` } }));
check("Forged webhook for unknown reference does not pay anything", forged.status === 200 && (await one("SELECT payment_status FROM orders WHERE id=$1", [A.id])).payment_status === "unpaid");
const fakeComplete = await (await fetch(`${B}/checkout/complete?reference=${A.number}-FAKE&order=${A.number}`)).text();
check("Visiting the success page with a fake reference does not confirm payment", fakeComplete.includes("could not find") && (await one("SELECT status FROM orders WHERE id=$1", [A.id])).status === "request_received");

// ───────────── H. Admin: queues and guarded status changes ─────────────
await admin.goto(B + "/admin/orders?queue=new");
check("New-requests queue lists the request", (await admin.content()).includes(A.number));
await admin.goto(`${B}/admin/orders/${A.id}`);
const opts = await admin.$$eval("#st option", (els) => els.map((e) => e.value).filter(Boolean));
check("Only valid next statuses offered (no Payment confirmed / Fulfilled / Quote sent)", opts.includes("sourcing") && !opts.some((o) => ["payment_confirmed", "fulfilled", "quote_sent", "awaiting_payment", "supplier_order"].includes(o)), opts.join(","));
async function move(p, to, msg = "") { await p.selectOption("#st", to); if (msg) await p.fill("#msg", msg); await act(p, "button:has-text('Update status')"); }
await move(admin, "sourcing", "We are checking suppliers.");
await move(admin, "supplier_found");
await move(admin, "availability_confirmed");
check("Admin moves request through sourcing statuses", (await one("SELECT status FROM orders WHERE id=$1", [A.id])).status === "availability_confirmed");
check("Status changes logged in history", Number((await one("SELECT COUNT(*)::int n FROM order_events WHERE order_id=$1 AND kind='status'", [A.id])).n) >= 4);

// ───────────── I. Quotation ─────────────
async function fillLine(p, i, v) {
  for (const [k, val] of Object.entries(v)) {
    const sel = `[name=l${i}_${k}]`;
    if (k === "mtype") await p.selectOption(sel, val); else await p.fill(sel, String(val));
  }
}
await fillLine(admin, 1, { qty: 2, supplier: "SupplierCo Internal", currency: "USD", cost: "124.99", fx: "1500", fees: "1000", taxes: "0", delivery: "0", mtype: "percent", margin: "10" });
const names = await admin.$$eval("fieldset.item-block legend strong", (els) => els.map((e) => e.textContent));
// Line 0 = Microsoft 365 (NGN cost), line 1 = Norton (USD cost)
await fillLine(admin, 0, { qty: 2, supplier: "SupplierCo Internal", currency: "NGN", cost: "20000", fx: "1", fees: "0", mtype: "fixed", margin: "6000", note: "SECRET-SUPPLIER-NOTE" });
await admin.fill("#qd", "Usually 1–2 business days after payment (confirmed by supplier)");
await admin.fill("#ql", "12-month subscriptions, valid in Nigeria");
await admin.fill("#qi", "INTERNAL-QUOTE-NOTE");
await act(admin, "button:has-text('Save draft and calculate')");
const draft = await one("SELECT * FROM quotes WHERE order_id=$1 AND status='draft'", [A.id]);
const expected1 = 46000 + 413567; // MS: 20000×2+6000 ; Norton: (124.99×2×1500+1000)×1.10 = 413,567
check("Draft quotation calculated on the server", draft && Number(draft.total_kobo) === expected1 * 100, `${names.join("/")} ${draft?.total_kobo}`);
await admin.check("form:has(input[name=quote_id]) input[name=confirm]");
await act(admin, "button:has-text('Send quotation')");
check("Quotation cannot be sent until price and country are confirmed", (await alertText(admin, "bad")).includes("Confirm that the price has been checked"));
await admin.check("input[name=price_checked]"); await admin.check("input[name=country_suitable]");
await act(admin, "button:has-text('Save draft and calculate')");
await admin.check("form:has(input[name=quote_id]) input[name=confirm]");
await act(admin, "button:has-text('Send quotation')");
let a = await one("SELECT * FROM orders WHERE id=$1", [A.id]);
check("Quotation sent → status Quote sent", a.status === "quote_sent" && Number(a.total_kobo) === expected1 * 100, a.status);
check("Quotation email recorded (not configured)", (await one("SELECT email_status FROM order_events WHERE order_id=$1 AND message='Quotation ready email'", [A.id]))?.email_status === "not_configured");

// ───────────── J. Customer sees quote (no internal data) and accepts ─────────────
await page.goto(orderUrl); await page.waitForSelector("#quote");
const cust = await page.content(); const custT = await txt(page);
check("Customer sees quotation total, delivery estimate, licence terms", custT.includes(`₦${expected1.toLocaleString("en-NG")}`) && custT.includes("confirmed by supplier") && custT.includes("valid in Nigeria"));
check("Customer page hides supplier name, costs, margins and internal notes", !/SupplierCo|SECRET-SUPPLIER-NOTE|INTERNAL-QUOTE-NOTE|374,970|375,970|124\.99 ×/.test(cust));
const pubQuote = await (await api("/api/cart/quote", { items: [{ slug: "norton-360-deluxe", quantity: 1 }] })).text();
check("Public price API exposes no supplier fields", !/supplier|SupplierCo|cost_kobo/i.test(pubQuote));
await act(page, "button:has-text('Accept quotation')");
check("Acceptance requires the confirmation tick", (await alertText(page, "bad")).includes("tick the box"));
await page.check("input[name=confirm]"); await act(page, "button:has-text('Accept quotation')");
a = await one("SELECT * FROM orders WHERE id=$1", [A.id]);
const q1 = await one("SELECT * FROM quotes WHERE order_id=$1 AND version=1", [A.id]);
check("Customer acceptance → Awaiting payment; quote v1 accepted", a.status === "awaiting_payment" && q1.status === "accepted" && a.accepted_quote_id === q1.id);
check("Order-confirmation email recorded separately from acknowledgement", Boolean(await one("SELECT 1 FROM order_events WHERE order_id=$1 AND message='Order confirmation email'", [A.id])));
check("Accepted quotation is no longer offered for acceptance", (await page.locator("button:has-text('Accept quotation')").count()) === 0 && (await q("SELECT 1 FROM order_events WHERE order_id=$1 AND message LIKE 'You accepted%'", [A.id])).length === 1);

// ───────────── K. Revision after acceptance (before payment) ─────────────
await admin.goto(`${B}/admin/orders/${A.id}`);
check("Admin sees accepted quotation is locked", (await admin.content()).includes("An accepted quotation is never edited"));
await fillLine(admin, 0, { margin: "5000" });
await act(admin, "button:has-text('Save draft and calculate')");
await admin.check("input[name=price_checked]"); await admin.check("input[name=country_suitable]");
await act(admin, "button:has-text('Save draft and calculate')");
await admin.check("form:has(input[name=quote_id]) input[name=confirm]"); await act(admin, "button:has-text('Send quotation')");
a = await one("SELECT * FROM orders WHERE id=$1", [A.id]);
const qv = await q("SELECT version, status, total_kobo FROM quotes WHERE order_id=$1 ORDER BY version", [A.id]);
check("Revised quote v2 supersedes accepted v1; accepted v1 unchanged", qv.length === 2 && qv[0].status === "superseded" && Number(qv[0].total_kobo) === expected1 * 100 && qv[1].status === "sent", JSON.stringify(qv));
check("Revision requires re-approval (status back to Quote sent)", a.status === "quote_sent" && a.accepted_quote_id === null);
check("Payment blocked while revision awaits approval", (await api(`/api/orders/${A.number}/pay`, { t: token })).status === 409);
const expected2 = expected1 - 1000;
await page.goto(orderUrl); await page.waitForSelector("#quote");
const v2t = await txt(page);
check("Customer sees revised quotation v2", v2t.includes("version 2") && v2t.includes(`₦${expected2.toLocaleString("en-NG")}`));
await page.check("input[name=confirm]"); await act(page, "button:has-text('Accept quotation')");

// ───────────── L. Paystack payment (test mode, verified server-side) ─────────────
await page.waitForSelector("button:has-text('Pay ₦')");
check("Pay button appears only after acceptance, for the accepted amount", (await page.locator("button:has-text('Pay ₦')").textContent()).includes(expected2.toLocaleString("en-NG")));
await page.click("button:has-text('Pay ₦')"); await page.waitForURL(/127\.0\.0\.1:4010\/pay\//);
const ref1 = await page.locator("#ref").textContent();
const init = await one("SELECT amount_kobo FROM payments WHERE reference=$1", [ref1]);
check("Paystack initialised with the accepted quotation amount", Number(init.amount_kobo) === expected2 * 100);
const earlyRet = await (await fetch(`${B}/checkout/complete?reference=${ref1}`)).text();
check("Returning before paying does NOT mark paid", earlyRet.includes("not been completed") && (await one("SELECT status FROM orders WHERE id=$1", [A.id])).status === "awaiting_payment");
await page.click("#succeed"); await page.waitForURL(/\/checkout\/complete/);
check("Completion page: payment confirmed after verification", (await alertText(page, "ok")).includes("Payment confirmed"));
a = await one("SELECT * FROM orders WHERE id=$1", [A.id]);
check("Order → Payment confirmed (server-verified)", a.status === "payment_confirmed" && a.payment_status === "paid");
const evt = JSON.stringify({ event: "charge.success", data: { reference: ref1 } });
const w1 = await webhook(evt); const w2 = await webhook(evt);
check("Duplicate webhook ignored; payment confirmed exactly once", w1.status === 200 && (await w2.json()).duplicate === true && Number((await one("SELECT COUNT(*)::int n FROM order_events WHERE order_id=$1 AND message LIKE 'Payment of %verified with Paystack%'", [A.id])).n) === 1);
check("Webhook with bad signature rejected (401)", (await webhook(evt, "00".repeat(64))).status === 401);
check("Paid order cannot start another payment", (await api(`/api/orders/${A.number}/pay`, { t: token })).status === 409);

// ───────────── M. Amount mismatch is held for review ─────────────
async function quoteAndAccept(number, opts = {}) {
  const o = await one("SELECT * FROM orders WHERE number=$1", [number]);
  await admin.goto(`${B}/admin/orders/${o.id}`);
  await fillLine(admin, 0, { currency: "NGN", cost: opts.cost ?? "150000", fx: "1", fees: "0", mtype: "fixed", margin: "10000" });
  await admin.check("input[name=price_checked]"); await admin.check("input[name=country_suitable]");
  await act(admin, "button:has-text('Save draft and calculate')");
  await admin.check("form:has(input[name=quote_id]) input[name=confirm]"); await act(admin, "button:has-text('Send quotation')");
  if (opts.accept === false) return o;
  await admin.fill("#dn", "Customer accepted by email (test)"); await act(admin, "button:has-text('Record acceptance')");
  return one("SELECT * FROM orders WHERE id=$1", [o.id]);
}
const C = await quoteAndAccept(refs[0]);
check("Admin can record a decision given outside the website", C.status === "awaiting_payment" && Number(C.total_kobo) === 16000000);
const payC = await (await fetch(B + `/api/orders/${C.number}/pay`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status;
check("Pay endpoint needs the customer's link or login (404 without)", payC === 404);
// Start a payment as Paystack would see it, via the order's secret link: simulate by direct initialise through the API with the token stored for this test.
const tokC = randomBytes(24).toString("base64url");
await q("UPDATE orders SET access_token_hash = encode(sha256($2::bytea), 'hex') WHERE id = $1", [C.id, tokC]);
const startC = await (await api(`/api/orders/${C.number}/pay`, { t: tokC })).json();
const refC = new URL(startC.authorizationUrl).pathname.split("/").pop();
await fetch(MOCK + "/__set", { method: "POST", body: JSON.stringify({ reference: refC, patch: { status: "success", paidAmount: 100 } }) });
const cRes = await (await fetch(`${B}/checkout/complete?reference=${refC}`)).text();
const c2 = await one("SELECT * FROM orders WHERE id=$1", [C.id]);
check("Underpaid 'success' → held for review, NOT paid", c2.payment_status === "amount_mismatch" && c2.status === "awaiting_payment" && cRes.includes("manual check"));
// Further payment-safety cases on the same order (reference refC, accepted total ₦160,000)
const cTotal = Number(C.total_kobo);
await fetch(MOCK + "/__set", { method: "POST", body: JSON.stringify({ reference: refC, patch: { status: "success", paidAmount: cTotal, currency: "USD" } }) });
await fetch(`${B}/checkout/complete?reference=${refC}`);
const cCur = await one("SELECT status, payment_status FROM orders WHERE id=$1", [C.id]);
check("Right amount but WRONG CURRENCY (USD) → held for review, NOT paid", cCur.payment_status === "amount_mismatch" && cCur.status === "awaiting_payment", JSON.stringify(cCur));
await fetch(MOCK + "/__set", { method: "POST", body: JSON.stringify({ reference: refC, patch: { status: "failed", paidAmount: cTotal, currency: "NGN" } }) });
const failPage = await (await fetch(`${B}/checkout/complete?reference=${refC}`)).text();
const cFail = await one("SELECT status, payment_status, paid_at FROM orders WHERE id=$1", [C.id]);
check("Declined/failed payment attempt → NOT paid, customer told to try again", cFail.payment_status !== "paid" && cFail.paid_at === null && cFail.status === "awaiting_payment" && /not successful|try again/i.test(failPage), JSON.stringify(cFail));
const payCount0 = Number((await one("SELECT COUNT(*)::int n FROM orders WHERE payment_status='paid'")).n);
const evtFail = JSON.stringify({ event: "charge.failed", data: { reference: refC } });
check("Validly signed non-success webhook (charge.failed) changes nothing", (await webhook(evtFail)).status === 200 && Number((await one("SELECT COUNT(*)::int n FROM orders WHERE payment_status='paid'")).n) === payCount0);
const evtOk = JSON.stringify({ event: "charge.success", data: { reference: refC } });
await webhook(evtOk);
check("Signed 'charge.success' webhook for a transaction Paystack reports as FAILED does not pay the order", (await one("SELECT payment_status FROM orders WHERE id=$1", [C.id])).payment_status !== "paid");
const badJson = "{not json";
check("Validly signed but malformed webhook body → 400", (await webhook(badJson)).status === 400);
check("Webhook without any signature header → 401", (await fetch(B + "/api/paystack/webhook", { method: "POST", headers: { "Content-Type": "application/json" }, body: evtOk })).status === 401);
const unknownRef = JSON.stringify({ event: "charge.success", data: { reference: "NO-SUCH-REFERENCE-123" } });
const unk = await webhook(unknownRef);
check("Validly signed webhook for an UNKNOWN reference → accepted, nothing paid", unk.status === 200 && Number((await one("SELECT COUNT(*)::int n FROM orders WHERE payment_status='paid'")).n) === payCount0);
// Put the mock transaction back to the underpaid state for the sections below.
await fetch(MOCK + "/__set", { method: "POST", body: JSON.stringify({ reference: refC, patch: { status: "success", paidAmount: 100, currency: "NGN" } }) });

// ───────────── N. Manual (bank transfer) payment ─────────────
const D = await quoteAndAccept(refs[1]);
await admin.goto(`${B}/admin/orders/${D.id}`);
await admin.selectOption("#mpm", "bank_transfer"); await admin.fill("#mpr", "TRF-0001"); await admin.fill("#mpa", "1000"); await admin.fill("#mpd", "2026-10-22"); await admin.check("form:has(#mpm) input[name=confirm]");
await act(admin, "button:has-text('Record payment')");
check("Manual payment with the wrong amount is rejected", (await alertText(admin, "bad")).includes("must equal the accepted quotation total"));
await admin.selectOption("#mpm", "bank_transfer"); await admin.fill("#mpr", "TRF-0001"); await admin.fill("#mpa", "160000"); await admin.fill("#mpd", "2026-10-22");
await act(admin, "button:has-text('Record payment')");
check("Manual payment needs the 'money received' confirmation", (await alertText(admin, "bad")).includes("confirm the money"));
await admin.selectOption("#mpm", "bank_transfer"); await admin.fill("#mpr", "TRF-0001"); await admin.fill("#mpa", "160000"); await admin.fill("#mpd", "2026-10-22"); await admin.check("form:has(#mpm) input[name=confirm]");
await act(admin, "button:has-text('Record payment')");
const d2row = await one("SELECT * FROM orders WHERE id=$1", [D.id]);
check("Recorded manual payment → Payment confirmed with evidence", d2row.status === "payment_confirmed" && Number((await one("SELECT COUNT(*)::int n FROM manual_payments WHERE order_id=$1", [D.id])).n) === 1);
const E = await one("SELECT * FROM orders WHERE number=$1", [refs[2]]);
await admin.goto(`${B}/admin/orders/${E.id}`);
check("No 'record payment' form for an order without an accepted quotation", (await admin.locator("#mpm").count()) === 0);

// ───────────── O. Fulfilment record required ─────────────
await admin.goto(`${B}/admin/orders/${A.id}`);
let st = await admin.$$eval("#st option", (els) => els.map((e) => e.value).filter(Boolean));
check("Paid order: Fulfilled not offered yet; Cancel/Unavailable not offered", !st.includes("fulfilled") && !st.includes("cancelled") && !st.includes("unavailable") && st.includes("supplier_order"), st.join(","));
await move(admin, "supplier_order", "Order placed with our supplier.");
const itemForm = (n) => admin.locator("form:has(select[name=sourcing_status])").nth(n);
await itemForm(0).locator("select[name=sourcing_status]").selectOption("delivered");
await Promise.all([admin.waitForResponse((r) => r.request().method() === "POST"), itemForm(0).locator("button:has-text('Save item')").click()]); await admin.waitForLoadState("networkidle");
check("Item cannot be marked Delivered without the fulfilment record", (await alertText(admin, "bad")).includes("Before marking Delivered"));
for (const n of [0, 1]) {
  const f = itemForm(n);
  await f.locator("select[name=sourcing_status]").selectOption("delivered");
  await f.locator("input[name=supplier_name]").fill("SupplierCo Internal");
  await f.locator("textarea[name=supply_evidence]").fill("Supplier invoice INV-77");
  await f.locator("input[name=licence_type]").fill("12-month subscription");
  await f.locator("select[name=region_eligibility]").selectOption("confirmed");
  await f.locator("input[name=actual_fulfilment_date]").fill("2026-10-22");
  await f.locator("input[name=delivery_method]").fill("Invitation email");
  await f.locator("textarea[name=delivery_details]").fill("Check ada@company.ng for the invitation from the vendor and accept it.");
  await Promise.all([admin.waitForResponse((r) => r.request().method() === "POST"), f.locator("button:has-text('Save item')").click()]); await admin.waitForLoadState("networkidle"); await admin.waitForTimeout(150);
}
check("Fulfilment records saved for both items", Number((await one("SELECT COUNT(*)::int n FROM order_items WHERE order_id=$1 AND sourcing_status='delivered' AND region_eligibility='confirmed'", [A.id])).n) === 2);
st = await admin.$$eval("#st option", (els) => els.map((e) => e.value).filter(Boolean));
check("Fulfilled offered once every item has a complete record", st.includes("fulfilled"), st.join(","));
await move(admin, "fulfilled", "Your subscriptions are active.");
check("Order fulfilled", (await one("SELECT status FROM orders WHERE id=$1", [A.id])).status === "fulfilled");
await page.goto(orderUrl); await page.waitForSelector(".delivery-box");
const fin = await page.content();
check("Customer sees Fulfilled + delivery instructions, still no supplier data", (await txt(page)).includes("Check ada@company.ng") && !/SupplierCo|INV-77/.test(fin));
const notes = (await q("SELECT message FROM order_events WHERE order_id=$1 AND kind='email' ORDER BY created_at", [A.id])).map((r) => r.message);
check("Notifications recorded: acknowledgement, quotation, confirmation, payment, update, fulfilled", ["Request acknowledgement email", "Quotation ready email", "Order confirmation email", "Payment confirmation email", "Supplier order in progress email", "Fulfilled email"].every((m) => notes.includes(m)), notes.join(" | "));

// ───────────── P. Unavailable / cancelled / refunds / expiry ─────────────
await admin.goto(`${B}/admin/orders/${E.id}`);
await move(admin, "unavailable", "The supplier cannot provide this licence for Nigeria.");
check("Unpaid request → Unavailable with message", (await one("SELECT status FROM orders WHERE id=$1", [E.id])).status === "unavailable");
await admin.goto(`${B}/admin/orders/${D.id}`);
st = await admin.$$eval("#st option", (els) => els.map((e) => e.value).filter(Boolean));
check("Paid order offers Refund pending instead of Cancelled", st.includes("refund_pending") && !st.includes("cancelled"));
await move(admin, "refund_pending", "Supplier failed after payment; refunding.");
await admin.fill("#ra", "160000"); await admin.selectOption("#rm", "manual"); await admin.fill("#rr", "Supplier failed"); await admin.check("input[name=confirm][value=yes]");
await act(admin, "button:has-text('Record refund')");
check("Full manual refund → Refunded", (await one("SELECT status, payment_status FROM orders WHERE id=$1", [D.id])).status === "refunded");
const F = await quoteAndAccept(refs[3], { accept: false });
await q("UPDATE quotes SET expires_at = NOW() - INTERVAL '1 hour' WHERE order_id = $1 AND status = 'sent'", [F.id]);
const tokF = randomBytes(24).toString("base64url");
await q("UPDATE orders SET access_token_hash = encode(sha256($2::bytea), 'hex') WHERE id = $1", [F.id, tokF]);
const fp = await browser.newPage(); watch(fp);
await fp.goto(`${B}/orders/${F.number}?t=${tokF}`);
check("Expired quotation is not offered for acceptance", (await fp.locator("button:has-text('Accept quotation')").count()) === 0);
await admin.goto(B + "/admin/orders?queue=quotes"); await act(admin, "button:has-text('Close expired quotations')");
check("Admin closes expired quotations", (await one("SELECT status FROM quotes WHERE order_id=$1 ORDER BY version DESC LIMIT 1", [F.id])).status === "expired" && (await one("SELECT status FROM orders WHERE id=$1", [F.id])).status === "availability_confirmed");

// ───────────── Q. Access control ─────────────
const anon = await (await browser.newContext()).newPage();
await anon.goto(`${B}/orders/${A.number}`);
check("Request page without link/login is not viewable", (await anon.content()).includes("Request not found"));
await anon.goto(`${B}/orders/${A.number}?t=wrongtoken`);
check("Wrong link token rejected", (await anon.content()).includes("Request not found"));
for (const u of ["/admin/orders", "/admin/products", `/admin/orders/${A.id}`]) {
  const r = await fetch(B + u, { redirect: "manual" }); check(`Anonymous ${u} redirected to login`, r.status === 307 && (r.headers.get("location") ?? "").includes("/admin/login"));
}
const ex = await fetch(B + "/admin/orders/export", { redirect: "manual" }); check("Anonymous CSV export blocked", ex.status === 307 || ex.status === 401, ex.status);

// ───────────── R. Customer accounts ─────────────
const acct = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); watch(acct);
await acct.goto(B + "/account/register");
await acct.fill("#name", "Chi Customer"); await acct.fill("#email", "chi@example.com"); await acct.fill("#password", "short"); await acct.fill("#confirm", "short");
await acct.click("button[type=submit]"); await acct.waitForSelector(".alert.bad");
check("Registration rejects weak password", (await acct.content()).includes("at least 10"));
await acct.fill("#password", "a-strong-pass-123"); await acct.fill("#confirm", "a-strong-pass-123"); await acct.click("button[type=submit]"); await acct.waitForURL(B + "/account");
const hash = (await one("SELECT password_hash FROM customers WHERE email='chi@example.com'")).password_hash;
check("Password stored hashed (scrypt)", hash.startsWith("scrypt$") && !hash.includes("a-strong-pass-123"));
await acct.goto(B + "/products/norton-360-deluxe"); await acct.click("button:has-text('Request this software')"); await acct.waitForSelector(".added-msg");
await acct.goto(B + "/checkout"); await acct.waitForSelector("form.form-card");
check("Request form pre-fills signed-in customer", (await acct.inputValue("#email")) === "chi@example.com");
await acct.check("input[name=acceptTerms]"); await acct.click("button:has-text('Review request')");
await Promise.all([acct.waitForURL(/\/orders\/CE/), acct.click("button:has-text('Submit request')")]);
await acct.goto(B + "/account");
check("Request appears in the customer's account", (await acct.locator("tbody tr").count()) === 1);
await acct.locator("tbody tr a").first().click(); await acct.waitForSelector(".status-pill");
check("Signed-in owner opens the request without the link token", (await acct.locator(".status-pill").first().textContent()) === "Request received");
await acct.goto(B + "/account"); await acct.click("button:has-text('Sign out')"); await acct.waitForURL(B + "/");
check("Customer sign-out works", (await (await acct.request.get(B + "/account", { maxRedirects: 0 })).status()) === 307);

// ───────────── S. Image upload ─────────────
await admin.goto(`${B}/admin/products/${await pid("acronis-true-image-essentials")}`);
await admin.setInputFiles("#image", `${SP}/fake.png`); await act(admin, "button:has-text('Save changes')");
check("Upload rejects a non-image file", /Image must be|valid image/.test(await alertText(admin, "bad")));
await admin.goto(`${B}/admin/products/${await pid("acronis-true-image-essentials")}`);
await admin.setInputFiles("#image", `${SP}/test-upload.png`); await act(admin, "button:has-text('Save changes')");
await page.goto(B + "/products/acronis-true-image-essentials");
const src = await page.locator(".pdp-media img").getAttribute("src");
check("Uploaded image stored in DB and served", src.startsWith("/api/images/") && (await fetch(B + src)).headers.get("content-type") === "image/png");

// ───────────── T. FAQ / policies / mobile ─────────────
const faq = await (await fetch(B + "/faq")).text();
check("FAQ covers sourcing, confirmation, when to pay, delivery, can't source, contact", ["How does software sourcing work?", "Why must my request be confirmed before I pay?", "When do I pay?", "How long does delivery take?", "What if you cannot source a product?", "How do I contact you about a request?"].every((x) => faq.includes(x.replace("'", "&#x27;")) || faq.includes(x)));
const terms = await (await fetch(B + "/terms")).text();
check("Terms: a request is not a guarantee", terms.includes("not a guarantee"));
const refund = await (await fetch(B + "/refund-policy")).text();
check("Refund policy has no blanket no-refund rule", !/no refunds?\b/i.test(refund) && refund.includes("Before you pay"));
await page.goto(B + "/quote?product=slack-pro");
check("Inquiry form still pre-selects a product", (await page.locator(".alert.info").textContent()).includes("Slack Pro"));
const m = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage(); watch(m);
await m.goto(B + "/products/norton-360-deluxe"); await m.click("button:has-text('Request this software')"); await m.waitForSelector(".added-msg");
await m.goto(B + "/cart"); await m.waitForSelector(".cart-line");
const ov = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("Mobile request list: no horizontal overflow, continue button visible", ov === 0 && (await m.locator("a:has-text('Continue to request details')").isVisible()));
await m.click("a:has-text('Continue to request details')"); await m.waitForSelector("form.form-card");
await m.fill("#name", "Mo Bile"); await m.fill("#email", "mobile@example.com"); await m.check("input[name=acceptTerms]"); await m.click("button:has-text('Review request')");
const ov2 = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("Mobile review step: no overflow, submit visible", ov2 === 0 && (await m.locator("button:has-text('Submit request')").isVisible()));
await Promise.all([m.waitForURL(/\/orders\/CE/), m.click("button:has-text('Submit request')")]);
check("Mobile request page: no overflow", (await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) === 0);
await m.screenshot({ path: process.env.E2E_SHOT ?? "/tmp/mobile-request.png", fullPage: true });

check("No uncaught browser errors", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close(); await db.end();
for (const [s, n, i] of results) console.log(s, "-", n, i ? `(${String(i).slice(0, 200)})` : "");
console.log(`\n${results.filter((x) => x[0] === "PASS").length}/${results.length} passed`);
