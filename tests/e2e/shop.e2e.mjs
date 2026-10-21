// End-to-end test — see tests/e2e/README.md for how to run it.
import { chromium } from "playwright";
import pg from "pg";
import { createHmac } from "node:crypto";

const B = process.env.E2E_BASE_URL ?? "http://localhost:3100", MOCK = "http://127.0.0.1:4010", KEY = "sk_test_mock_123456";
const SP = new URL("./fixtures", import.meta.url).pathname;
const db = new pg.Client(process.env.E2E_DATABASE_URL ?? "postgres://cloudedge:localtest@127.0.0.1:5433/shoptest"); await db.connect();
const q = async (s, p = []) => (await db.query(s, p)).rows;
const results = [];
const check = (name, cond, info = "") => results.push([cond ? "PASS" : "FAIL", name, info]);
const sign = (body) => createHmac("sha512", KEY).update(body).digest("hex");
const webhook = (body, sig = sign(body)) => fetch(B + "/api/paystack/webhook", { method: "POST", headers: { "Content-Type": "application/json", "x-paystack-signature": sig }, body });

const act = async (p, sel) => { await Promise.all([p.waitForResponse((r) => r.request().method() === "POST" && r.url().startsWith(B)), p.click(sel)]); await p.waitForLoadState("networkidle"); await p.waitForTimeout(150); };
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
const watch = (p) => { p.on("pageerror", (e) => errors.push(e.message)); p.on("console", (m) => m.type() === "error" && !/404|status of 4/.test(m.text()) && errors.push(m.text())); };

// ───────────── A. Admin enables products ─────────────
const admin = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage(); watch(admin);
await admin.goto(B + "/admin/login"); await admin.fill("#password", "test-admin-password-123"); await admin.click("button[type=submit]"); await admin.waitForURL(B + "/admin");
check("Admin dashboard shows setup status (test payments)", (await admin.content()).includes("test mode"));
const pid = async (slug) => (await q("SELECT id FROM products WHERE slug = $1", [slug]))[0].id;
async function enable(slug) {
  await admin.goto(`${B}/admin/products/${await pid(slug)}`);
  await admin.selectOption("#resale_status", "authorised"); await admin.selectOption("#sale_mode", "purchase");
  await act(admin, "button:has-text('Save changes')");
  return admin.locator(".alert.ok").first().textContent();
}
check("Admin enables Norton 360 Deluxe for purchase", /Saved\.$/.test((await enable("norton-360-deluxe")).trim()));
check("Admin enables Microsoft 365 Business Standard", /Saved\.$/.test((await enable("microsoft-365-business-standard")).trim()));
const blockedMsg = await enable("namecheap-com-domain");
check("Guardrail: price-needs-verification product cannot be enabled", blockedMsg.includes("NOT enabled") && blockedMsg.includes("verification"), blockedMsg.trim().slice(0, 120));
await admin.goto(B + "/admin/products?flag=resale");
await admin.locator(`input[name=ids][value="${await pid("slack-pro")}"]`).check();
await admin.selectOption("#bulk", "purchase"); await act(admin, "button:has-text('Apply to selected')");
check("Bulk enable skips unauthorised product", (await admin.locator(".alert").first().textContent()).includes("Skipped 1"));
const buyable = await q("SELECT slug FROM products WHERE sale_mode='purchase' ORDER BY slug");
check("Exactly the 2 authorised products are purchasable", buyable.map((r) => r.slug).join(",") === "microsoft-365-business-standard,norton-360-deluxe", buyable.map((r) => r.slug).join(","));

// ───────────── B. Storefront browse / search / filter / sort ─────────────
const shop = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await shop.newPage(); watch(page);
await page.goto(B + "/products?q=norton");
check("Search 'norton' returns 5 Norton products", (await page.locator(".shop-card").count()) === 5, await page.locator(".shop-card").count());
await page.goto(B + "/products/category/cybersecurity?sort=price-asc");
const prices = await page.$$eval(".shop-card .price strong", (els) => els.map((e) => Number(e.textContent.replace(/[^\d]/g, ""))));
check("Category page + price sort ascending", prices.length === 12 && prices.every((v, i) => i === 0 || prices[i - 1] <= v), prices.join(","));
await page.goto(B + "/products?billing=one_time");
check("Billing filter: one-time → 2 Office products", (await page.locator(".shop-card").count()) === 2);
await page.goto(B + "/products?availability=purchase");
check("Availability filter shows purchasable only", (await page.locator(".shop-card").count()) === 2);
await page.goto(B + "/products?q=zzzznotaproduct");
check("Empty search state", (await page.locator(".empty").count()) === 1);
const imgs = await page.goto(B + "/products").then(() => page.$$eval(".shop-card img", (els) => els.map((e) => e.getAttribute("src"))));
check("Every product card has a distinct image", imgs.length === 61 && new Set(imgs).size === 61, `${imgs.length} cards, ${new Set(imgs).size} distinct`);
const broken = [];
for (const s of new Set(imgs)) { const r = await fetch(B + s); if (r.status !== 200 || !/svg|image/.test(r.headers.get("content-type") ?? "")) broken.push(s); }
check("No broken product images", broken.length === 0, broken.join(" "));
await page.goto(B + "/products/norton-360-deluxe");
const pdp = await page.content();
check("PDP shows price, billing, reference & conversion", pdp.includes("₦176,612") && pdp.includes("/ year") && pdp.includes("US$124.99") && pdp.includes("1,333"));
await page.goto(B + "/products/slack-pro");
check("Enquiry product shows 'Request this product', no add to cart", (await page.locator("text=Request this product").count()) === 1 && (await page.locator("button:has-text('Add to cart')").count()) === 0);

// ───────────── C. Cart ─────────────
await page.goto(B + "/products/norton-360-deluxe");
await page.click(".qty-btn[aria-label=Increase]"); await page.click("button:has-text('Add to cart')");
await page.waitForSelector(".added-msg");
await page.goto(B + "/products/microsoft-365-business-standard");
await page.fill("#qty", "3"); await page.click("button:has-text('Add to cart')"); await page.waitForSelector(".added-msg");
check("Cart icon shows item count 5", (await page.locator(".cart-count").textContent()) === "5");
await page.goto(B + "/cart"); await page.waitForSelector(".cart-line");
await page.reload(); await page.waitForSelector(".cart-line");
check("Cart persists after refresh", (await page.locator(".cart-line").count()) === 2);
const expected = 176612 * 2 + 300300 * 3;
const totalText = async () => Number((await page.locator("dd.total").textContent()).replace(/[^\d]/g, ""));
check("Cart total = server prices × quantities", (await totalText()) === expected, `${await totalText()} vs ${expected}`);
await page.locator(".cart-line", { hasText: "Microsoft" }).locator(".qty-btn[aria-label=Decrease]").click();
await page.waitForFunction((v) => Number(document.querySelector("dd.total").textContent.replace(/[^\d]/g, "")) === v, 176612 * 2 + 300300 * 2);
check("Changing quantity updates total", true);
await page.locator(".cart-line", { hasText: "Microsoft" }).locator("button:has-text('Remove')").click();
await page.waitForFunction(() => document.querySelectorAll(".cart-line").length === 1);
check("Remove item works; total updates", (await totalText()) === 176612 * 2);

// ───────────── D. Checkout validation & tamper attempts ─────────────
await page.goto(B + "/checkout"); await page.waitForSelector("form.form-card");
await page.click("button[type=submit]");
check("Checkout validation shows errors", (await page.locator(".err").count()) >= 5);
const tamper = await fetch(B + "/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", "x-real-ip": "10.5.0.1" }, body: JSON.stringify({ customer: { name: "Tess Tester", email: "x@y.com", phone: "08012345678", country: "Nigeria", city: "Abuja", address: "1 Test Street", acceptTerms: true }, items: [{ slug: "norton-360-deluxe", quantity: 1, price: 1, unitPriceNgn: 1 }], total: 100 }) });
const tj = await tamper.json();
const tOrder = (await q("SELECT total_kobo FROM orders WHERE number = $1", [tj.orderNumber]))[0];
check("Browser-supplied prices are ignored (server total used)", tamper.status === 200 && Number(tOrder.total_kobo) === 17661200, `${tamper.status} ${tOrder?.total_kobo}`);
const enq = await fetch(B + "/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", "x-real-ip": "10.5.0.2" }, body: JSON.stringify({ customer: { name: "Tess Tester", email: "x@y.com", phone: "08012345678", country: "Nigeria", city: "Abuja", address: "1 Test Street", acceptTerms: true }, items: [{ slug: "slack-pro", quantity: 1 }] }) });
check("Enquiry-only product rejected at checkout (409)", enq.status === 409);
const over = await fetch(B + "/api/cart/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [{ slug: "norton-360-deluxe", quantity: 999 }] }) }).then((r) => r.json());
check("Quantity clamped to product maximum", over.lines[0].quantity === 10);
const xo = await fetch(B + "/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://evil.example" }, body: "{}" });
check("Cross-site checkout POST blocked (403)", xo.status === 403);

// ───────────── E. Successful payment ─────────────
const fill = async (p, email = "buyer@example.com") => {
  await p.fill("#name", "Ada Buyer"); await p.fill("#email", email); await p.fill("#phone", "+234 801 234 5678");
  await p.fill("#address", "Suite 1, Test Plaza"); await p.fill("#city", "Abuja"); await p.check("input[name=acceptTerms]");
};
await fill(page);
await page.click("button[type=submit]");
await page.waitForURL(/127\.0\.0\.1:4010\/pay\//);
check("Checkout redirects to Paystack (mock) checkout", true);
const ref1 = await page.locator("#ref").textContent();
const o1 = (await q("SELECT o.* FROM orders o JOIN payments p ON p.order_id = o.id WHERE p.reference = $1", [ref1]))[0];
check("Pending order created with server total", o1.status === "pending_payment" && Number(o1.total_kobo) === 176612 * 2 * 100);
const early = await page.request.get(`${B}/checkout/complete?reference=${ref1}`);
check("Redirect before payment does NOT mark paid", (await early.text()).includes("not been completed") && (await q("SELECT status FROM orders WHERE id=$1", [o1.id]))[0].status === "pending_payment");
await page.click("#succeed");
await page.waitForURL(/\/checkout\/complete/);
check("Completion page: payment confirmed", (await page.locator(".alert.ok").textContent()).includes("Payment confirmed"));
await page.waitForFunction(() => !document.querySelector(".cart-count"));
check("Cart cleared after confirmed payment", true);
const o1b = (await q("SELECT * FROM orders WHERE id=$1", [o1.id]))[0];
check("Order marked paid after server verification", o1b.status === "paid" && o1b.payment_status === "paid");
await page.click("text=View your order"); await page.waitForSelector(".status-pill");
check("Customer order page shows Paid + test notice", (await page.locator(".status-pill").first().textContent()) === "Paid" && (await page.content()).includes("Test order"));
const orderUrl = page.url();

// ───────────── F. Webhooks: valid, duplicate, invalid signature ─────────────
const evt = JSON.stringify({ event: "charge.success", data: { reference: ref1, amount: Number(o1.total_kobo), currency: "NGN", status: "success" } });
const w1 = await webhook(evt); const w2 = await webhook(evt);
check("Webhook accepted (200) for already-paid order", w1.status === 200);
check("Duplicate webhook ignored", (await w2.json()).duplicate === true);
const paidEvents = await q("SELECT COUNT(*)::int n FROM order_events WHERE order_id=$1 AND message LIKE 'Payment of %verified%'", [o1.id]);
check("Payment confirmed exactly once (idempotent)", paidEvents[0].n === 1, paidEvents[0].n);
check("Webhook with bad signature rejected (401)", (await webhook(evt, "00".repeat(64))).status === 401);

// ───────────── G. Failed payment, retry, webhook-only confirmation ─────────────
await page.goto(B + "/products/norton-360-deluxe"); await page.click("button:has-text('Add to cart')"); await page.waitForSelector(".added-msg");
await page.goto(B + "/checkout"); await page.waitForSelector("form.form-card"); await fill(page, "second@example.com");
await page.click("button[type=submit]"); await page.waitForURL(/4010\/pay\//);
const ref2 = await page.locator("#ref").textContent();
await page.click("#fail"); await page.waitForURL(/checkout\/complete/);
const o2 = (await q("SELECT o.* FROM orders o JOIN payments p ON p.order_id=o.id WHERE p.reference=$1", [ref2]))[0];
check("Failed payment → order 'failed', not paid", o2.status === "failed" && o2.payment_status === "failed");
await page.click("text=View your order"); await page.waitForSelector("button:has-text('Pay')");
await page.click("button:has-text('Pay')"); await page.waitForURL(/4010\/pay\//);
const ref2b = await page.locator("#ref").textContent();
check("Retry creates a new payment reference", ref2b !== ref2);
await fetch(MOCK + "/__set", { method: "POST", body: JSON.stringify({ reference: ref2b, patch: { status: "success" } }) });
const wh = await webhook(JSON.stringify({ event: "charge.success", data: { reference: ref2b } }));
check("Webhook alone (customer never returned) confirms payment", wh.status === 200 && (await q("SELECT status FROM orders WHERE id=$1", [o2.id]))[0].status === "paid");

// ───────────── H. Amount mismatch ─────────────
const r3 = await fetch(B + "/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", "x-real-ip": "10.6.0.1" }, body: JSON.stringify({ customer: { name: "Mismatch", email: "m@example.com", phone: "08012345678", country: "Nigeria", city: "Abuja", address: "1 Test Street", acceptTerms: true }, items: [{ slug: "norton-360-deluxe", quantity: 1 }] }) }).then((r) => r.json());
const ref3 = new URL(r3.authorizationUrl).pathname.split("/").pop();
await fetch(MOCK + "/__set", { method: "POST", body: JSON.stringify({ reference: ref3, patch: { status: "success", paidAmount: 100 } }) });
const c3 = await (await fetch(`${B}/checkout/complete?reference=${ref3}`)).text();
const o3 = (await q("SELECT * FROM orders WHERE number=$1", [r3.orderNumber]))[0];
check("Underpaid 'success' → payment_review, not paid", o3.status === "payment_review" && o3.payment_status === "amount_mismatch" && c3.includes("manual check"));
check("Unknown reference does not create or pay anything", (await (await fetch(`${B}/checkout/complete?reference=FAKE-REF-123`)).text()).includes("could not find"));

// ───────────── I. Access control on customer order ─────────────
const anon = await (await browser.newContext()).newPage();
await anon.goto(`${B}/orders/${o1.number}`);
check("Order page without token/login is not viewable", (await anon.content()).includes("Order not found"));
await anon.goto(`${B}/orders/${o1.number}?t=wrongtoken`);
check("Wrong token rejected", (await anon.content()).includes("Order not found"));
for (const u of ["/admin/orders", "/admin/products", `/admin/orders/${o1.id}`]) {
  const r = await fetch(B + u, { redirect: "manual" }); check(`Anonymous ${u} redirected to login`, r.status === 307 && (r.headers.get("location") ?? "").includes("/admin/login"));
}
const ex = await fetch(B + "/admin/orders/export", { redirect: "manual" }); check("Anonymous orders CSV blocked", ex.status === 307 || ex.status === 401, ex.status);

// ───────────── J. Sourcing workflow ─────────────
await admin.goto(B + "/admin/orders?queue=sourcing");
check("Sourcing queue lists paid orders", (await admin.content()).includes(o1.number) && (await admin.content()).includes(o2.number));
await admin.goto(`${B}/admin/orders/${o1.id}`);
const item = admin.locator("form.item-block").first();
await item.locator("select[name=sourcing_status]").selectOption("supplier_confirmed");
await item.locator("input[name=supplier_name]").fill("Norton (official store)");
await item.locator("input[name=supplier_url]").fill("https://us.norton.com/");
await item.locator("input[name=supplier_availability]").fill("Available");
await item.locator("input[name=supplier_price_text]").fill("US$124.99 x2");
await item.locator("input[name=sourcing_cost_naira]").fill("335000");
await item.locator("input[name=supplier_eta]").fill("1 business day");
await item.locator("input[name=expected_delivery]").fill("2026-10-23");
await Promise.all([admin.waitForResponse((r) => r.request().method() === "POST"), item.locator("button:has-text(\'Save item\')").click()]); await admin.waitForLoadState("networkidle"); await admin.waitForTimeout(150);
const it = (await q("SELECT sourcing_status, sourcing_cost_kobo, to_char(expected_delivery, 'YYYY-MM-DD') AS d, supplier_name, supplier_url FROM order_items WHERE order_id=$1", [o1.id]))[0];
check("Sourcing details, cost and dates saved", it.sourcing_status === "supplier_confirmed" && Number(it.sourcing_cost_kobo) === 33500000 && it.d === "2026-10-23" && it.supplier_url === "https://us.norton.com/", JSON.stringify(it));
check("Margin shown (₦353,224 − ₦335,000 = ₦18,224)", (await admin.content()).includes("₦18,224"));
await admin.selectOption("#st", "fulfilled"); await act(admin, "button:has-text('Update status')");
check("Cannot fulfil before items are delivered", (await admin.locator(".alert.bad").count()) === 1);
await admin.selectOption("#st", "on_hold"); await admin.fill("#msg", "The supplier price rose by ₦5,000. Approve to continue, or we will refund you in full.");
await act(admin, "button:has-text('Update status')");
check("On hold + customer message (email recorded as not configured)", (await admin.locator(".alert.ok").textContent()).includes("not configured"));
await page.goto(orderUrl); await page.waitForSelector(".status-pill");
check("Customer sees on-hold status and the message", (await page.content()).includes("supplier price rose") && (await page.locator("button:has-text('Approve and continue')").count()) === 1);
await page.fill("#note", "Yes, please continue."); await act(page, "button:has-text('Approve and continue')");
check("Customer approval recorded", (await q("SELECT COUNT(*)::int n FROM order_events WHERE order_id=$1 AND kind='customer'", [o1.id]))[0].n === 1);
await admin.goto(`${B}/admin/orders/${o1.id}`);
const item2 = admin.locator("form.item-block").first();
await item2.locator("select[name=sourcing_status]").selectOption("delivered");
await item2.locator("textarea[name=delivery_details]").fill("Activation link sent to buyer@example.com by Norton. Sign in at my.norton.com to activate.");
await Promise.all([admin.waitForResponse((r) => r.request().method() === "POST"), item2.locator("button:has-text(\'Save item\')").click()]); await admin.waitForLoadState("networkidle"); await admin.waitForTimeout(150);
await admin.selectOption("#st", "fulfilled"); await act(admin, "button:has-text('Update status')");
check("Order fulfilled after delivery", (await q("SELECT status FROM orders WHERE id=$1", [o1.id]))[0].status === "fulfilled");
await page.goto(orderUrl); await page.waitForSelector(".delivery-box");
check("Customer sees fulfilled status and delivery details", (await page.content()).includes("my.norton.com") && (await page.locator(".status-pill").first().textContent()) === "Fulfilled");

// ───────────── K. Refunds ─────────────
await admin.goto(`${B}/admin/orders/${o2.id}`);
await admin.fill("#ra", "50000"); await admin.fill("#rr", "Goodwill partial refund"); await admin.check("input[name=confirm]");
await act(admin, "button:has-text('Record refund')");
let r = (await q("SELECT * FROM orders WHERE id=$1", [o2.id]))[0];
check("Partial Paystack refund recorded", r.payment_status === "partially_refunded" && Number(r.refunded_kobo) === 5000000);
await admin.fill("#ra", "999999999"); await admin.check("input[name=confirm]"); await act(admin, "button:has-text('Record refund')");
check("Over-refund rejected", (await admin.locator(".alert.bad").textContent()).includes("Refund must be"));
await admin.fill("#ra", String((Number(r.total_kobo) - 5000000) / 100)); await admin.selectOption("#rm", "manual"); await admin.check("input[name=confirm]");
await act(admin, "button:has-text('Record refund')");
r = (await q("SELECT * FROM orders WHERE id=$1", [o2.id]))[0];
check("Full refund → order refunded", r.status === "refunded" && r.payment_status === "refunded");
const ve = await admin.request.post(`${B}/admin/orders/${o3.id}`, { maxRedirects: 0 }).catch(() => null); void ve;

// ───────────── L. Customer accounts ─────────────
const acct = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); watch(acct);
await acct.goto(B + "/account/register");
await acct.fill("#name", "Chi Customer"); await acct.fill("#email", "chi@example.com"); await acct.fill("#password", "short"); await acct.fill("#confirm", "short");
await acct.click("button[type=submit]"); await acct.waitForSelector(".alert.bad");
check("Registration rejects weak password", (await acct.content()).includes("at least 10"));
await acct.fill("#password", "a-strong-pass-123"); await acct.fill("#confirm", "a-strong-pass-123"); await acct.click("button[type=submit]");
await acct.waitForURL(B + "/account");
const hash = (await q("SELECT password_hash FROM customers WHERE email='chi@example.com'"))[0].password_hash;
check("Account created; password stored hashed (scrypt)", hash.startsWith("scrypt$") && !hash.includes("a-strong-pass-123"));
await acct.goto(B + "/products/norton-360-deluxe"); await acct.click("button:has-text('Add to cart')"); await acct.waitForSelector(".added-msg");
await acct.goto(B + "/checkout"); await acct.waitForSelector("form.form-card");
check("Checkout pre-fills signed-in customer", (await acct.inputValue("#email")) === "chi@example.com");
await acct.fill("#phone", "08011112222"); await acct.fill("#address", "2 Test Close"); await acct.fill("#city", "Lagos"); await acct.check("input[name=acceptTerms]");
await acct.click("button[type=submit]"); await acct.waitForURL(/4010\/pay\//); await acct.click("#succeed"); await acct.waitForURL(/checkout\/complete/);
await acct.goto(B + "/account");
const accountOrders = await acct.locator("tbody tr").count();
check("Order appears in customer's account history", accountOrders === 1);
await acct.locator("tbody tr a").first().click(); await acct.waitForSelector(".status-pill");
check("Signed-in owner can open order without token", (await acct.locator(".status-pill").first().textContent()) === "Paid");
await acct.goto(B + "/account"); await acct.click("button:has-text('Sign out')"); await acct.waitForURL(B + "/");
check("Customer sign-out works", (await (await acct.request.get(B + "/account", { maxRedirects: 0 })).status()) === 307);
await acct.goto(B + "/account/login"); await acct.fill("#email", "chi@example.com"); await acct.fill("#password", "wrong-password-x"); await acct.click("button[type=submit]"); await acct.waitForSelector(".alert.bad");
check("Wrong customer password rejected", (await acct.content()).includes("incorrect"));

// ───────────── M. Image upload ─────────────
await admin.goto(`${B}/admin/products/${await pid("acronis-true-image-essentials")}`);
await admin.setInputFiles("#image", `${SP}/fake.png`); await act(admin, "button:has-text('Save changes')");
check("Upload rejects a non-image file", (await admin.locator(".alert.bad").textContent()).includes("Image must be") || (await admin.locator(".alert.bad").textContent()).includes("valid image"));
await admin.goto(`${B}/admin/products/${await pid("acronis-true-image-essentials")}`);
await admin.setInputFiles("#image", `${SP}/test-upload.png`); await act(admin, "button:has-text('Save changes')");
await page.goto(B + "/products/acronis-true-image-essentials");
const src = await page.locator(".pdp-media img").getAttribute("src");
const ir = await fetch(B + src);
check("Uploaded image stored in DB and served", src.startsWith("/api/images/") && ir.status === 200 && ir.headers.get("content-type") === "image/png");

// ───────────── N. Inquiry for enquiry product still works ─────────────
await page.goto(B + "/quote?product=slack-pro");
check("Request form pre-selects the product", (await page.locator(".alert.info").textContent()).includes("Slack Pro"));

// ───────────── O. Mobile cart flow ─────────────
const m = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage(); watch(m);
await m.goto(B + "/products/norton-360-deluxe"); await m.click("button:has-text('Add to cart')"); await m.waitForSelector(".added-msg");
await m.goto(B + "/cart"); await m.waitForSelector(".cart-line");
const ov = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("Mobile cart: no horizontal overflow, checkout button visible", ov === 0 && (await m.locator("a:has-text('Proceed to checkout')").isVisible()));

check("No uncaught browser errors", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close(); await db.end();
for (const [s, n, i] of results) console.log(s, "-", n, i ? `(${String(i).slice(0, 160)})` : "");
console.log(`\n${results.filter((x) => x[0] === "PASS").length}/${results.length} passed`);
