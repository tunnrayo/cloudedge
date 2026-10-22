// Shop business-rule tests. Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { catalogue, sellingPrice, CATEGORIES, FX_RATE_NGN_PER_USD, MARKUP_NGN } from "../src/content/catalogue.ts";
import { verifyPaystackSignature } from "../src/lib/shop/signature.ts";
import { isClientRequestId, normalizeCheckout, validateCheckout } from "../src/lib/shop/checkout-validate.ts";
import { ORDER_STATUSES, allowedNextStatuses, calculateQuoteLine, fulfilmentGaps, isQuoteExpired, quoteLineErrors, transitionError, type OrderStatus } from "../src/lib/shop/workflow.ts";
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
const good = { name: "Ada Obi", email: "ADA@Example.com", phone: "+234 801 234 5678", country: "Nigeria", acceptTerms: true };
test("checkout validation: valid input passes and email is lower-cased", () => {
  const n = normalizeCheckout(good);
  assert.deepEqual(validateCheckout(n), {});
  assert.equal(n.email, "ada@example.com");
});
test("request validation: terms must be accepted; bad fields flagged; country required", () => {
  const e = validateCheckout(normalizeCheckout({ ...good, acceptTerms: false, email: "nope", phone: "abc", country: "" }));
  assert.ok(e.acceptTerms && e.email && e.phone && e.country);
});
test("request validation: phone and company are optional; no address needed", () => {
  assert.deepEqual(validateCheckout(normalizeCheckout({ name: "Ada Obi", email: "a@b.co", country: "Ghana", acceptTerms: true })), {});
});
test("request id format (idempotency key)", () => {
  assert.equal(isClientRequestId("a".repeat(32)), true);
  assert.equal(isClientRequestId("short"), false);
  assert.equal(isClientRequestId("x'; DROP TABLE orders;--xxxxxxxx"), false);
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

/* ---------------- Manual sourcing workflow ---------------- */
const unpaid = { paymentStatus: "unpaid", itemsReadyForFulfilment: false, refundedFully: false };
const paidCtx = { paymentStatus: "paid", itemsReadyForFulfilment: false, refundedFully: false };
test("workflow: 16 statuses", () => { assert.equal(ORDER_STATUSES.length, 16); });
test("workflow: payment confirmed can never be chosen manually", () => {
  for (const from of ORDER_STATUSES) assert.ok(transitionError(from as OrderStatus, "payment_confirmed", paidCtx), from);
});
test("workflow: quote sent / awaiting payment / refunded are automatic only", () => {
  for (const to of ["quote_sent", "awaiting_payment", "refunded"] as OrderStatus[]) assert.ok(transitionError("availability_confirmed", to, unpaid));
});
test("workflow: cannot fulfil or order from supplier without payment", () => {
  assert.ok(transitionError("payment_confirmed", "supplier_order", unpaid));
  assert.equal(transitionError("payment_confirmed", "supplier_order", paidCtx), null);
});
test("workflow: fulfilled requires a complete fulfilment record", () => {
  assert.match(String(transitionError("supplier_order", "fulfilled", paidCtx)), /fulfilment record/);
  assert.equal(transitionError("supplier_order", "fulfilled", { ...paidCtx, itemsReadyForFulfilment: true }), null);
});
test("workflow: paid orders cannot be cancelled/unavailable — refund pending instead", () => {
  assert.ok(transitionError("awaiting_payment", "cancelled", paidCtx));
  assert.equal(transitionError("awaiting_payment", "cancelled", unpaid), null);
  assert.ok(allowedNextStatuses("supplier_order", paidCtx).includes("refund_pending"));
});
test("workflow: invalid jumps rejected", () => {
  assert.ok(transitionError("request_received", "fulfilled", paidCtx));
  assert.ok(transitionError("cancelled", "reviewing", unpaid));
  assert.ok(transitionError("reviewing", "reviewing", unpaid));
  assert.deepEqual(allowedNextStatuses("refunded", paidCtx), []);
});
const line = { quantity: 2, supplierCurrency: "USD", supplierUnitCost: 10, fxRate: 1500, feesNgn: 500, taxesNgn: 0, deliveryNgn: 0, marginType: "percent" as const, marginValue: 10 };
test("quote maths: cost × qty × rate + fees, then % margin, rounded up", () => {
  const r = calculateQuoteLine(line);
  assert.equal(r.costNgn, 30500);
  assert.equal(r.marginNgn, 3050);
  assert.equal(r.priceNgn, 33550);
  assert.equal(r.unitPriceNgn, 16775);
});
test("quote maths: fixed margin and fractional cost round up to the next naira", () => {
  const r = calculateQuoteLine({ ...line, quantity: 1, supplierUnitCost: 9.99, fxRate: 1333.5, feesNgn: 0, marginType: "fixed", marginValue: 5000 });
  assert.equal(r.costNgn, 13321.67);
  assert.equal(r.priceNgn, 18322);
});
test("quote validation", () => {
  assert.deepEqual(quoteLineErrors(line), []);
  assert.ok(quoteLineErrors({ ...line, supplierUnitCost: 0 }).length);
  assert.ok(quoteLineErrors({ ...line, supplierCurrency: "usd" }).length);
  assert.ok(quoteLineErrors({ ...line, supplierCurrency: "NGN", fxRate: 2 }).length);
  assert.ok(quoteLineErrors({ ...line, feesNgn: -1 }).length);
  assert.ok(quoteLineErrors({ ...line, quantity: 1.5 }).length);
});
test("quote expiry", () => {
  const now = new Date("2026-10-22T12:00:00Z");
  assert.equal(isQuoteExpired("2026-10-22T11:59:59Z", now), true);
  assert.equal(isQuoteExpired("2026-10-23T00:00:00Z", now), false);
});
test("fulfilment record gaps", () => {
  const full = { sourcing_status: "delivered", supplier_name: "S", supply_evidence: "Invoice 1", licence_type: "1 year", region_eligibility: "confirmed", actual_fulfilment_date: "2026-10-22", delivery_method: "Email" };
  assert.deepEqual(fulfilmentGaps(full), []);
  assert.equal(fulfilmentGaps({ ...full, region_eligibility: "not_confirmed" }).length, 1);
  assert.equal(fulfilmentGaps({ ...full, sourcing_status: "ordered_from_supplier", supply_evidence: "" }).length, 2);
  assert.deepEqual(fulfilmentGaps({ ...full, sourcing_status: "cancelled_refunded", supplier_name: "" }), []);
});
