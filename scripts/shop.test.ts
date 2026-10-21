// Shop business-rule tests. Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { catalogue, sellingPrice, CATEGORIES, FX_RATE_NGN_PER_USD, MARKUP_NGN } from "../src/content/catalogue.ts";
import { verifyPaystackSignature } from "../src/lib/shop/signature.ts";
import { normalizeCheckout, validateCheckout } from "../src/lib/shop/checkout-validate.ts";
import { billingSuffix, naira, nairaFromKobo } from "../src/lib/shop/format.ts";

test("pricing formula: USD × ₦1,333 + ₦10,000, rounded", () => {
  assert.equal(FX_RATE_NGN_PER_USD, 1333);
  assert.equal(MARKUP_NGN, 10000);
  assert.equal(sellingPrice({ amount: 10, currency: "USD" }), 23330); // document example
  assert.equal(sellingPrice({ amount: 7, currency: "USD" }), 19331);
  assert.equal(sellingPrice({ amount: 99.99, currency: "USD" }), 143287);
});
test("pricing formula: NGN reference + ₦10,000 (not added twice)", () => {
  assert.equal(sellingPrice({ amount: 67900, currency: "NGN" }), 77900); // document example
  assert.equal(sellingPrice({ amount: 88999, currency: "NGN" }), 98999);
});
test("catalogue: 61 products, unique SKUs and slugs, valid categories", () => {
  assert.equal(catalogue.length, 61);
  assert.equal(new Set(catalogue.map((p) => p.sku)).size, 61);
  assert.equal(new Set(catalogue.map((p) => p.slug)).size, 61);
  for (const p of catalogue) assert.ok((CATEGORIES as readonly string[]).includes(p.category), p.slug);
});
test("catalogue: every document price matches the formula within ₦1, or is flagged for verification", () => {
  for (const p of catalogue) {
    const diff = Math.abs(sellingPrice(p.ref) - p.listedPrice);
    assert.ok(diff <= 1 || p.verification === "needs_verification", `${p.sku} ${p.name}: listed ${p.listedPrice} vs formula ${sellingPrice(p.ref)}`);
  }
});
test("catalogue: every product has a source URL and a billing period", () => {
  for (const p of catalogue) {
    assert.match(p.ref.sourceUrl, /^https:\/\//, p.slug);
    assert.ok(["month", "year", "one_time", "term"].includes(p.billing), p.slug);
  }
});
test("webhook signature: valid accepted, tampered/missing rejected", () => {
  const key = "sk_test_abc", body = JSON.stringify({ event: "charge.success", data: { reference: "X" } });
  const sig = createHmac("sha512", key).update(body).digest("hex");
  assert.equal(verifyPaystackSignature(body, sig, key), true);
  assert.equal(verifyPaystackSignature(body + " ", sig, key), false);
  assert.equal(verifyPaystackSignature(body, sig, "sk_test_other"), false);
  assert.equal(verifyPaystackSignature(body, null, key), false);
  assert.equal(verifyPaystackSignature(body, "zz", key), false);
  assert.equal(verifyPaystackSignature(body, sig, undefined), false);
});
const good = { name: "Ada Obi", email: "ADA@Example.com", phone: "+234 801 234 5678", country: "Nigeria", city: "Abuja", address: "Suite 1, Test Plaza", acceptTerms: true };
test("checkout validation: valid input passes and email is lower-cased", () => {
  const n = normalizeCheckout(good);
  assert.deepEqual(validateCheckout(n), {});
  assert.equal(n.email, "ada@example.com");
});
test("checkout validation: terms must be accepted; bad fields flagged", () => {
  const e = validateCheckout(normalizeCheckout({ ...good, acceptTerms: false, email: "nope", phone: "abc", address: "x" }));
  assert.ok(e.acceptTerms && e.email && e.phone && e.address);
});
test("checkout validation: ignores unknown fields such as prices", () => {
  const n = normalizeCheckout({ ...good, price: 1, total: 1 }) as Record<string, unknown>;
  assert.equal("price" in n || "total" in n, false);
});
test("billing labels", () => {
  assert.equal(billingSuffix("month", "user"), "/ user / month");
  assert.equal(billingSuffix("year", "subscription"), "/ year");
  assert.equal(billingSuffix("one_time", "licence"), "one-time (licence)");
  assert.equal(billingSuffix("term", "subscription", "for the first 27 months (introductory)"), "for the first 27 months (introductory)");
});
test("naira formatting", () => {
  assert.equal(naira(1315007), "₦1,315,007");
  assert.equal(nairaFromKobo(17661200), "₦176,612");
});
