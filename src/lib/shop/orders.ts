/**
 * SOURCING REQUESTS, QUOTATIONS, PAYMENTS AND FULFILMENT (server-only)
 *
 * Rules enforced here:
 *  - A customer REQUEST never takes payment. Catalogue prices are indicative only.
 *  - The admin records real supplier costs and a margin; the quotation price is calculated from them.
 *  - Payment is possible only after the customer accepts a quotation. An accepted quotation is never edited;
 *    a revision creates a new version that the customer must accept again.
 *  - An order becomes "paid" ONLY after Paystack's verify API confirms the exact amount/currency/reference,
 *    or an admin records a manual payment with evidence. Updates are conditional (idempotent).
 *  - Every change is written to order_events (history / communication log). Supplier details stay internal.
 */
import "server-only";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { getDb, type Row } from "@/lib/db";
import { company } from "@/lib/site";
import { getProductsBySlugs, imageUrl, isRequestable, priceSuffix, requestBlockers } from "@/lib/shop/products";
import { initializeTransaction, paystackMode, verifyTransaction, createRefund, PaystackError } from "@/lib/shop/paystack";
import { mails, sendEmail, type EmailResult, type QuoteView } from "@/lib/shop/mail";
import { SOURCING_STATUSES } from "@/lib/shop/format";
import {
  ORDER_STATUS_LABEL, ORDER_STATUSES, PAID_STATUSES, calculateQuoteLine, fulfilmentGaps, isQuoteExpired, quoteLineErrors, transitionError,
  type OrderStatus, type QuoteLineInput,
} from "@/lib/shop/workflow";

/** Public address of the site, read at runtime (SITE_URL), falling back to the build-time NEXT_PUBLIC_SITE_URL. */
export const siteUrl = () => (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const ALPHA = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const randomCode = (n: number) => Array.from(randomBytes(n), (b) => ALPHA[b % ALPHA.length]).join("");
const staffEmail = () => process.env.SHOP_NOTIFY_EMAIL || process.env.INQUIRY_TO_EMAIL || company.email;

export class WorkflowError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
/** @deprecated name kept for older imports */
export const CheckoutError = WorkflowError;

/* ------------------------------ Payments switch ------------------------------ */
/**
 * Online payment is available when a Paystack key is set. LIVE keys additionally require
 * PAYMENTS_LIVE_ENABLED=true, so real charging stays off until the live flow has been verified.
 */
export function paymentsAvailability(): { ok: boolean; mode: "test" | "live" | "off"; reason: string } {
  const mode = paystackMode();
  if (mode === "off") return { ok: false, mode, reason: "Online payment is not set up yet. We will send you payment instructions." };
  if (mode === "live" && process.env.PAYMENTS_LIVE_ENABLED !== "true") return { ok: false, mode, reason: "Online payment is temporarily switched off. We will send you payment instructions." };
  return { ok: true, mode, reason: "" };
}

/* ------------------------------ Request list ------------------------------ */
export type CartLine = { slug: string; quantity: number; option?: string };
export type RequestCustomer = { name: string; email: string; phone: string; company: string; country: string; notes: string };
export type RequestLine = {
  slug: string; name: string; sku: string; image: string; quantity: number; maxQuantity: number; quantityLabel: string;
  unitPriceNgn: number; lineTotalNgn: number; billingLabel: string; optionLabel: string; optionRequired: boolean; option: string;
  requestable: boolean; blockers: string[]; priceVerification: string;
};
/** Indicative prices for a request list, from the database. Unknown/unpublished products are dropped. */
export async function quoteCart(lines: CartLine[]): Promise<{ lines: RequestLine[]; indicativeTotalNgn: number; allRequestable: boolean; removed: string[] }> {
  const clean = lines.filter((l) => typeof l.slug === "string" && /^[a-z0-9-]{1,100}$/.test(l.slug)).slice(0, 50);
  const products = await getProductsBySlugs([...new Set(clean.map((l) => l.slug))]);
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const out: RequestLine[] = []; const removed: string[] = []; const seen = new Set<string>();
  for (const l of clean) {
    const p = bySlug.get(l.slug);
    if (!p || seen.has(l.slug)) { if (!p) removed.push(l.slug); continue; }
    seen.add(l.slug);
    const quantity = Math.min(Math.max(1, Math.floor(Number(l.quantity) || 1)), p.maxQuantity);
    out.push({
      slug: p.slug, name: p.name, sku: p.sku, image: imageUrl(p), quantity, maxQuantity: p.maxQuantity, quantityLabel: p.quantityLabel,
      unitPriceNgn: p.priceNgn, lineTotalNgn: p.priceNgn * quantity, billingLabel: priceSuffix(p),
      optionLabel: p.optionLabel, optionRequired: p.optionRequired, option: String(l.option ?? "").trim().slice(0, 200),
      requestable: isRequestable(p), blockers: requestBlockers(p), priceVerification: p.priceVerification,
    });
  }
  const indicativeTotalNgn = out.reduce((a, l) => a + l.lineTotalNgn, 0);
  return { lines: out, indicativeTotalNgn, allRequestable: out.length > 0 && out.every((l) => l.requestable), removed };
}

type Q = (s: string, p?: unknown[]) => Promise<unknown>;
export async function logEvent(orderId: string, kind: string, message: string, opts: { visible?: boolean; email?: EmailResult | null; actor?: string } = {}, q?: Q) {
  const run = q ?? (async (s: string, p?: unknown[]) => (await getDb()).query(s, p));
  await run("INSERT INTO order_events (id, order_id, kind, message, customer_visible, email_status, actor) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [randomUUID(), orderId, kind, message, opts.visible ?? false, opts.email ?? null, opts.actor ?? "system"]);
}
export const orderLink = (number: string, token?: string) => `${siteUrl()}/orders/${number}${token ? `?t=${token}` : ""}`;
async function notifyCustomer(o: { id: string; email: string }, mail: { subject: string; html: string; text: string }, label: string, visibleMessage?: string, actor = "system") {
  const r = await sendEmail(o.email, mail.subject, mail.html, mail.text);
  await logEvent(o.id, "email", `${label} email`, { email: r, actor });
  if (visibleMessage) await logEvent(o.id, "message", visibleMessage, { visible: true, actor });
  return r;
}
async function notifyStaff(orderId: string, subject: string, lines: string[]) {
  const m = mails.staff(subject, lines);
  const r = await sendEmail(staffEmail(), m.subject, m.html, m.text);
  await logEvent(orderId, "email", `Staff notification: ${subject}`, { email: r });
}

/**
 * Creates a sourcing REQUEST (no payment). Duplicate submissions with the same clientRequestId
 * return the original request instead of creating a second one.
 */
export async function createRequest(customer: RequestCustomer, lines: CartLine[], customerId: string | null, clientRequestId: string | null) {
  const db = await getDb();
  if (clientRequestId) {
    const dup = (await db.query<{ number: string }>("SELECT number FROM orders WHERE client_request_id = $1", [clientRequestId])).rows[0];
    if (dup) return { number: dup.number, token: null as string | null, duplicate: true };
  }
  const list = await quoteCart(lines);
  if (!list.lines.length) throw new WorkflowError("Your request list is empty or its products are no longer listed.");
  const blocked = list.lines.filter((l) => !l.requestable);
  if (blocked.length) throw new WorkflowError(`These products are currently unavailable: ${blocked.map((b) => b.name).join(", ")}. Please remove them.`, 409);
  const missing = list.lines.filter((l) => l.optionRequired && !l.option);
  if (missing.length) throw new WorkflowError(`Please complete: ${missing.map((m) => `${m.optionLabel} (${m.name})`).join("; ")}.`, 422);

  const id = randomUUID();
  const token = randomBytes(24).toString("base64url");
  const number = `CE${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${randomCode(5)}`;
  const indicativeKobo = list.indicativeTotalNgn * 100;
  const products = await getProductsBySlugs(list.lines.map((l) => l.slug));
  try {
    await db.tx(async (q) => {
      await q(`INSERT INTO orders (id, number, access_token_hash, customer_id, email, name, phone, company, country, notes,
                status, payment_status, subtotal_kobo, total_kobo, indicative_total_kobo, payment_mode, terms_accepted_at, client_request_id)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'request_received','unpaid',$11,$11,$11,$12,NOW(),$13)`,
        [id, number, sha256(token), customerId, customer.email, customer.name, customer.phone, customer.company, customer.country, customer.notes, indicativeKobo, paystackMode() === "live" ? "live" : "test", clientRequestId]);
      for (const l of list.lines) {
        const p = products.find((x) => x.slug === l.slug)!;
        await q(`INSERT INTO order_items (id, order_id, product_id, sku, product_slug, product_name, image_url, billing_label, unit_price_kobo, quantity, line_total_kobo,
                  option_label, option_value, fulfilment_type)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [randomUUID(), id, p.id, p.sku, p.slug, p.name, l.image, l.billingLabel, l.unitPriceNgn * 100, l.quantity, l.lineTotalNgn * 100, l.optionLabel, l.option, p.fulfilmentType]);
      }
      await logEvent(id, "status", "Request received. We will check availability and send you a quotation. This is not an order confirmation and nothing has been charged.", { visible: true, actor: "customer" }, q);
    });
  } catch (e) {
    if ((e as { code?: string }).code === "23505" && clientRequestId) {
      const dup = (await db.query<{ number: string }>("SELECT number FROM orders WHERE client_request_id = $1", [clientRequestId])).rows[0];
      if (dup) return { number: dup.number, token: null, duplicate: true };
    }
    throw e;
  }
  const items = await orderItems(id);
  await notifyCustomer({ id, email: customer.email }, mails.requestReceived({ number, name: customer.name }, items, orderLink(number, token)), "Request acknowledgement");
  await notifyStaff(id, `New sourcing request ${number}`, [`${customer.name} (${customer.email}, ${customer.country})`, ...items.map((i) => `${i.product_name} × ${i.quantity}${i.option_value ? ` — ${i.option_label}: ${i.option_value}` : ""}`)]);
  return { number, token: token as string | null, duplicate: false };
}

/* ------------------------------ Reading ------------------------------ */
export type OrderItemRow = {
  id: string; order_id: string; product_id: string | null; sku: string; product_slug: string; product_name: string; image_url: string; billing_label: string;
  unit_price_kobo: string; quantity: number; line_total_kobo: string; option_label: string; option_value: string; fulfilment_type: string;
  sourcing_status: string; supplier_name: string; supplier_url: string; supplier_availability: string; supplier_price_text: string;
  sourcing_cost_kobo: string | null; supplier_eta: string; tracking: string; expected_delivery: string | null; fulfilment_notes: string; delivery_details: string;
  supply_evidence: string; licence_type: string; region_eligibility: string; region_notes: string; actual_fulfilment_date: string | null; delivery_method: string;
};
export type OrderRow = Record<string, unknown> & {
  id: string; number: string; email: string; name: string; status: OrderStatus; payment_status: string; total_kobo: string; subtotal_kobo: string; indicative_total_kobo: string | null;
  refunded_kobo: string; payment_reference: string | null; payment_mode: string; created_at: string; paid_at: string | null; customer_id: string | null; access_token_hash: string;
  accepted_quote_id: string | null; country: string; next_action: string;
};
export type QuoteLineRow = { id: string; quote_id: string; order_item_id: string | null; product_name: string; quantity: number; supplier_name: string; supplier_currency: string; supplier_unit_cost: string; fx_rate: string; fees_kobo: string; taxes_kobo: string; delivery_kobo: string; margin_type: "percent" | "fixed"; margin_value: string; cost_kobo: string; price_kobo: string; internal_note: string };
export type QuoteRow = { id: string; order_id: string; version: number; status: string; total_kobo: string; expires_at: string | null; price_checked: boolean; country_suitable: boolean; delivery_estimate: string; licence_terms: string; customer_note: string; internal_note: string; created_at: string; sent_at: string | null; decided_at: string | null; decided_by: string | null; decision_note: string; lines: QuoteLineRow[] };

export async function orderItems(orderId: string) {
  return (await (await getDb()).query("SELECT * FROM order_items WHERE order_id = $1 ORDER BY product_name", [orderId])).rows as never[] as OrderItemRow[];
}
export async function getOrderByNumber(number: string): Promise<OrderRow | null> {
  if (!/^[A-Z0-9-]{6,30}$/.test(number)) return null;
  return ((await (await getDb()).query("SELECT * FROM orders WHERE number = $1", [number])).rows[0] as OrderRow) ?? null;
}
export async function getOrderById(id: string): Promise<OrderRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return ((await (await getDb()).query("SELECT * FROM orders WHERE id = $1", [id])).rows[0] as OrderRow) ?? null;
}
/** Customer access: the secret link token, or the logged-in owner. */
export function canView(order: OrderRow, token: string | undefined, customerId: string | null): boolean {
  if (customerId && order.customer_id === customerId) return true;
  if (!token) return false;
  const a = Buffer.from(sha256(token)), b = Buffer.from(order.access_token_hash);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function orderEvents(orderId: string, customerOnly: boolean) {
  return (await (await getDb()).query(`SELECT * FROM order_events WHERE order_id = $1 ${customerOnly ? "AND customer_visible" : ""} ORDER BY created_at ASC`, [orderId])).rows;
}
export async function orderPayments(orderId: string) {
  return (await (await getDb()).query("SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at ASC", [orderId])).rows;
}
export async function manualPayments(orderId: string) {
  return (await (await getDb()).query("SELECT * FROM manual_payments WHERE order_id = $1 ORDER BY recorded_at ASC", [orderId])).rows;
}
export async function orderRefunds(orderId: string) {
  return (await (await getDb()).query("SELECT * FROM refunds WHERE order_id = $1 ORDER BY created_at ASC", [orderId])).rows;
}
export async function customerOrders(customerId: string) {
  return (await (await getDb()).query("SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 100", [customerId])).rows as OrderRow[];
}
export async function getQuotes(orderId: string): Promise<QuoteRow[]> {
  const db = await getDb();
  const iso = (v: unknown) => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));
  const quotes = ((await db.query("SELECT * FROM quotes WHERE order_id = $1 ORDER BY version DESC", [orderId])).rows as never[] as QuoteRow[])
    .map((q) => ({ ...q, expires_at: iso(q.expires_at), created_at: iso(q.created_at)!, sent_at: iso(q.sent_at), decided_at: iso(q.decided_at) }));
  if (!quotes.length) return [];
  const lines = (await db.query("SELECT * FROM quote_lines WHERE quote_id = ANY($1::uuid[]) ORDER BY product_name", [quotes.map((q) => q.id)])).rows as never[] as QuoteLineRow[];
  return quotes.map((q) => ({ ...q, lines: lines.filter((l) => l.quote_id === q.id) }));
}
/** Customer-safe view of a quote (no supplier names, costs, fees or margins). */
export function publicQuote(q: QuoteRow): QuoteView & { id: string; status: string; sent_at: string | null; decided_at: string | null } {
  return { id: q.id, version: q.version, status: q.status, total_kobo: q.total_kobo, expires_at: q.expires_at, delivery_estimate: q.delivery_estimate, licence_terms: q.licence_terms,
    customer_note: q.customer_note, sent_at: q.sent_at, decided_at: q.decided_at, lines: q.lines.map((l) => ({ product_name: l.product_name, quantity: l.quantity, price_kobo: l.price_kobo })) };
}

/* ------------------------------ Quotations (admin) ------------------------------ */
export type DraftQuoteInput = {
  lines: (QuoteLineInput & { orderItemId: string; supplierName: string; internalNote: string })[];
  expiresAt: string; priceChecked: boolean; countrySuitable: boolean; deliveryEstimate: string; licenceTerms: string; customerNote: string; internalNote: string;
};

/** Saves (creates or updates) the draft quotation for an order, calculating prices from the recorded costs. */
export async function saveDraftQuote(orderId: string, input: DraftQuoteInput): Promise<string> {
  const order = await getOrderById(orderId);
  if (!order) throw new WorkflowError("Order not found", 404);
  if ((PAID_STATUSES as string[]).includes(order.status) || ["cancelled"].includes(order.status)) throw new WorkflowError("This order is paid or closed; its accepted quotation can no longer be changed.");
  const items = await orderItems(orderId);
  if (!input.lines.length) throw new WorkflowError("Add at least one quotation line.");
  const errors: string[] = [];
  input.lines.forEach((l, i) => {
    if (!items.some((it) => it.id === l.orderItemId)) errors.push(`Line ${i + 1}: unknown item.`);
    quoteLineErrors(l).forEach((e) => errors.push(`Line ${i + 1}: ${e}`));
  });
  // A date-only value means "valid until the end of that day" (Lagos time, UTC+1).
  const exp = /^\d{4}-\d{2}-\d{2}$/.test(input.expiresAt) ? new Date(`${input.expiresAt}T23:59:59+01:00`) : new Date(input.expiresAt);
  if (!input.expiresAt || Number.isNaN(exp.getTime())) errors.push("Set the quotation expiry date.");
  else if (exp.getTime() < Date.now()) errors.push("The expiry date must be in the future.");
  if (errors.length) throw new WorkflowError(errors.join(" "));

  const db = await getDb();
  return db.tx(async (q) => {
    const draft = (await q("SELECT id FROM quotes WHERE order_id = $1 AND status = 'draft' ORDER BY version DESC LIMIT 1", [orderId])) as { rows: { id: string }[] };
    let quoteId = draft.rows[0]?.id;
    if (!quoteId) {
      const v = (await q("SELECT COALESCE(MAX(version), 0) + 1 AS v FROM quotes WHERE order_id = $1", [orderId])) as { rows: { v: number }[] };
      quoteId = randomUUID();
      await q("INSERT INTO quotes (id, order_id, version, status) VALUES ($1,$2,$3,'draft')", [quoteId, orderId, Number(v.rows[0].v)]);
    }
    await q("DELETE FROM quote_lines WHERE quote_id = $1", [quoteId]);
    let total = 0;
    for (const l of input.lines) {
      const r = calculateQuoteLine(l);
      const item = items.find((it) => it.id === l.orderItemId)!;
      total += r.priceNgn * 100;
      await q(`INSERT INTO quote_lines (id, quote_id, order_item_id, product_name, quantity, supplier_name, supplier_currency, supplier_unit_cost, fx_rate,
                 fees_kobo, taxes_kobo, delivery_kobo, margin_type, margin_value, cost_kobo, price_kobo, internal_note)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [randomUUID(), quoteId, item.id, item.product_name, l.quantity, l.supplierName.slice(0, 200), l.supplierCurrency, l.supplierUnitCost, l.fxRate,
          Math.round(l.feesNgn * 100), Math.round(l.taxesNgn * 100), Math.round(l.deliveryNgn * 100), l.marginType, l.marginValue, Math.round(r.costNgn * 100), r.priceNgn * 100, l.internalNote.slice(0, 1000)]);
    }
    await q(`UPDATE quotes SET total_kobo = $2, expires_at = $3, price_checked = $4, country_suitable = $5, delivery_estimate = $6, licence_terms = $7, customer_note = $8, internal_note = $9 WHERE id = $1`,
      [quoteId, total, exp.toISOString(), input.priceChecked, input.countrySuitable, input.deliveryEstimate.slice(0, 300), input.licenceTerms.slice(0, 500), input.customerNote.slice(0, 2000), input.internalNote.slice(0, 2000)]);
    await logEvent(orderId, "quote", `Draft quotation saved (total ₦${(total / 100).toLocaleString("en-NG")}).`, { actor: "admin" }, q);
    return quoteId!;
  });
}

/** Sends a draft quotation to the customer. Earlier open (or accepted-but-unpaid) quotations are superseded. */
export async function sendQuote(quoteId: string, notify: boolean) {
  const db = await getDb();
  const quote = (await db.query("SELECT * FROM quotes WHERE id = $1", [quoteId])).rows[0] as QuoteRow | undefined;
  if (!quote) throw new WorkflowError("Quotation not found", 404);
  if (quote.status !== "draft") throw new WorkflowError("Only a draft quotation can be sent.");
  const order = (await getOrderById(quote.order_id))!;
  if ((PAID_STATUSES as string[]).includes(order.status) || order.status === "cancelled") throw new WorkflowError("This order is paid or closed.");
  const lines = (await db.query("SELECT * FROM quote_lines WHERE quote_id = $1", [quoteId])).rows;
  if (!lines.length || Number(quote.total_kobo) <= 0) throw new WorkflowError("The quotation has no priced lines.");
  if (!quote.expires_at || isQuoteExpired(quote.expires_at)) throw new WorkflowError("Set an expiry date in the future before sending.");
  if (!quote.price_checked) throw new WorkflowError("Confirm that the price has been checked before sending.");
  if (!quote.country_suitable) throw new WorkflowError(`Confirm the product and price are suitable for the customer's country (${order.country || "not given"}) before sending.`);
  const hadAccepted = Boolean(order.accepted_quote_id);
  await db.tx(async (q) => {
    await q("UPDATE quotes SET status = 'superseded' WHERE order_id = $1 AND id <> $2 AND status IN ('sent','accepted','draft')", [order.id, quoteId]);
    await q("UPDATE quotes SET status = 'sent', sent_at = NOW() WHERE id = $1", [quoteId]);
    await q("UPDATE orders SET status = 'quote_sent', accepted_quote_id = NULL, total_kobo = $2, updated_at = NOW() WHERE id = $1", [order.id, quote.total_kobo]);
    await logEvent(order.id, "quote", `${hadAccepted ? "Revised quotation" : "Quotation"} v${quote.version} sent: ₦${(Number(quote.total_kobo) / 100).toLocaleString("en-NG")}. ${hadAccepted ? "The previously accepted quotation is no longer valid; your approval is needed again." : "Please accept or decline it."}`, { visible: true, actor: "admin" }, q);
  });
  if (notify) {
    const full = (await getQuotes(order.id)).find((x) => x.id === quoteId)!;
    await notifyCustomer(order, mails.quoteReady(order, publicQuote(full), orderLink(order.number), hadAccepted), "Quotation ready", undefined, "admin");
  }
}

/** Customer (or admin on the customer's behalf) accepts or declines the current sent quotation. */
export async function decideQuote(order: OrderRow, quoteId: string, decision: "accept" | "decline", by: "customer" | "admin", note: string) {
  const db = await getDb();
  const quote = (await db.query("SELECT * FROM quotes WHERE id = $1 AND order_id = $2", [quoteId, order.id])).rows[0] as QuoteRow | undefined;
  if (!quote) throw new WorkflowError("Quotation not found.", 404);
  if (quote.status !== "sent") throw new WorkflowError(quote.status === "accepted" ? "This quotation has already been accepted." : "This quotation is no longer open.", 409);
  if (quote.expires_at && isQuoteExpired(quote.expires_at)) {
    await db.query("UPDATE quotes SET status = 'expired' WHERE id = $1 AND status = 'sent'", [quoteId]);
    await logEvent(order.id, "quote", `Quotation v${quote.version} expired before a decision. We will send an updated quotation if supply is still available.`, { visible: true });
    throw new WorkflowError("This quotation has expired. Please contact us for an updated quotation.", 409);
  }
  const who = by === "customer" ? "You" : "Cloud Edge (on your instruction)";
  if (decision === "accept") {
    const upd = await db.query("UPDATE quotes SET status = 'accepted', decided_at = NOW(), decided_by = $2, decision_note = $3 WHERE id = $1 AND status = 'sent' RETURNING id", [quoteId, by, note.slice(0, 1000)]);
    if (!upd.rowCount) throw new WorkflowError("This quotation was already decided.", 409);
    await db.query("UPDATE orders SET status = 'awaiting_payment', accepted_quote_id = $2, total_kobo = $3, payment_status = 'unpaid', updated_at = NOW() WHERE id = $1", [order.id, quoteId, quote.total_kobo]);
    await logEvent(order.id, "quote", `${who} accepted quotation v${quote.version} (₦${(Number(quote.total_kobo) / 100).toLocaleString("en-NG")}). Order confirmed — awaiting payment.${note ? ` Note: ${note.slice(0, 500)}` : ""}`, { visible: true, actor: by });
    const full = (await getQuotes(order.id)).find((x) => x.id === quoteId)!;
    await notifyCustomer(order, mails.quoteAccepted(order, publicQuote(full), orderLink(order.number), paymentsAvailability().ok), "Order confirmation");
    await notifyStaff(order.id, `Quotation accepted: ${order.number}`, [`${order.name} accepted v${quote.version} for ₦${(Number(quote.total_kobo) / 100).toLocaleString("en-NG")}.`, note]);
  } else {
    const upd = await db.query("UPDATE quotes SET status = 'declined', decided_at = NOW(), decided_by = $2, decision_note = $3 WHERE id = $1 AND status = 'sent' RETURNING id", [quoteId, by, note.slice(0, 1000)]);
    if (!upd.rowCount) throw new WorkflowError("This quotation was already decided.", 409);
    await db.query("UPDATE orders SET status = 'reviewing', updated_at = NOW() WHERE id = $1", [order.id]);
    await logEvent(order.id, "quote", `${who} declined quotation v${quote.version}.${note ? ` Note: ${note.slice(0, 500)}` : ""} We will contact you about alternatives.`, { visible: true, actor: by });
    await notifyStaff(order.id, `Quotation declined: ${order.number}`, [`${order.name} declined v${quote.version}.`, note]);
  }
}

/** Marks sent quotations past their expiry as expired (run from the admin). */
export async function expireQuotes() {
  const db = await getDb();
  const r = await db.query<{ id: string; order_id: string; version: number }>("UPDATE quotes SET status = 'expired' WHERE status = 'sent' AND expires_at < NOW() RETURNING id, order_id, version");
  for (const q of r.rows) {
    await db.query("UPDATE orders SET status = 'availability_confirmed', updated_at = NOW() WHERE id = $1 AND status IN ('quote_sent','awaiting_approval')", [q.order_id]);
    await logEvent(q.order_id, "quote", `Quotation v${q.version} expired without a decision.`, { visible: true });
  }
  return r.rowCount;
}

/* ------------------------------ Payments ------------------------------ */
async function assertPayable(order: OrderRow) {
  if (order.status !== "awaiting_payment") throw new WorkflowError("Payment is only possible after you accept a quotation.", 409);
  if (!order.accepted_quote_id) throw new WorkflowError("There is no accepted quotation for this order.", 409);
  const q = (await (await getDb()).query("SELECT status, total_kobo FROM quotes WHERE id = $1", [order.accepted_quote_id])).rows[0];
  if (!q || q.status !== "accepted" || Number(q.total_kobo) !== Number(order.total_kobo)) throw new WorkflowError("The accepted quotation does not match this order. Please contact us.", 409);
}

/** Starts a Paystack payment for the ACCEPTED quotation amount (fresh reference each attempt). */
export async function startPayment(order: OrderRow, token: string) {
  const pay = paymentsAvailability();
  if (!pay.ok) throw new WorkflowError(pay.reason, 503);
  await assertPayable(order);
  const db = await getDb();
  const reference = `${order.number}-${randomCode(4)}`;
  const callbackUrl = `${siteUrl()}/checkout/complete?order=${encodeURIComponent(order.number)}&t=${encodeURIComponent(token)}`;
  try {
    const r = await initializeTransaction({ email: order.email, amountKobo: Number(order.total_kobo), reference, callbackUrl, metadata: { order_number: order.number, quote_id: order.accepted_quote_id, cancel_action: orderLink(order.number, token || undefined) } });
    await db.query("INSERT INTO payments (id, order_id, reference, kind, status, amount_kobo, currency) VALUES ($1,$2,$3,'initialize','initialized',$4,'NGN')", [randomUUID(), order.id, reference, order.total_kobo]);
    await db.query("UPDATE orders SET payment_reference = $2, payment_status = 'pending', payment_mode = $3, updated_at = NOW() WHERE id = $1 AND payment_status <> 'paid'", [order.id, reference, pay.mode]);
    return { authorizationUrl: r.authorization_url, reference };
  } catch (e) {
    const msg = e instanceof PaystackError ? e.message : "Payment provider unreachable";
    console.error("[paystack] initialize failed:", msg);
    await logEvent(order.id, "payment", `Could not start payment: ${msg}`);
    throw new WorkflowError("We could not connect to the payment provider. Please try again in a few minutes.", 502);
  }
}

export type ConfirmOutcome = { state: "paid" | "already_paid" | "failed" | "pending" | "mismatch" | "unknown_reference" | "error"; orderNumber?: string; message: string };

/** Confirms a Paystack payment by asking Paystack directly. Idempotent: only the first success counts. */
export async function confirmPayment(reference: string, source: "callback" | "webhook" | "admin"): Promise<ConfirmOutcome> {
  if (!/^[A-Za-z0-9._=-]{6,100}$/.test(reference)) return { state: "unknown_reference", message: "Invalid payment reference." };
  const db = await getDb();
  const init = await db.query<{ order_id: string; amount_kobo: string }>("SELECT order_id, amount_kobo FROM payments WHERE reference = $1 AND kind = 'initialize'", [reference]);
  if (!init.rows[0]) return { state: "unknown_reference", message: "We could not find an order for this payment reference." };
  const orderId = init.rows[0].order_id;
  const ord = (await db.query("SELECT * FROM orders WHERE id = $1", [orderId])).rows[0] as OrderRow | undefined;
  if (!ord) return { state: "unknown_reference", message: "Order not found." };
  if (["paid", "refunded", "partially_refunded"].includes(ord.payment_status)) return { state: "already_paid", orderNumber: ord.number, message: "Payment already confirmed." };

  let v;
  try { v = await verifyTransaction(reference); }
  catch (e) {
    await logEvent(orderId, "payment", `Payment verification could not run (${source}): ${(e as Error).message}`);
    return { state: "error", orderNumber: ord.number, message: "We could not verify the payment with Paystack right now. It will be checked again automatically." };
  }
  await db.query("INSERT INTO payments (id, order_id, reference, kind, status, amount_kobo, currency, detail) VALUES ($1,$2,$3,'verify',$4,$5,$6,$7)",
    [randomUUID(), orderId, reference, v.status, v.amount, v.currency, `${source}: ${v.gateway_response ?? ""}`.slice(0, 300)]);

  if (v.status === "success") {
    const expected = Number(init.rows[0].amount_kobo);
    if (v.reference !== reference || v.currency !== "NGN" || Number(v.amount) !== expected || expected !== Number(ord.total_kobo)) {
      const upd = await db.query("UPDATE orders SET payment_status = 'amount_mismatch', updated_at = NOW() WHERE id = $1 AND payment_status NOT IN ('paid','refunded','partially_refunded') RETURNING id", [orderId]);
      if (upd.rowCount) await logEvent(orderId, "payment", `Paystack reported a payment that does NOT match the accepted quotation (expected ${expected} kobo NGN, got ${v.amount} ${v.currency}). Held for review.`);
      return { state: "mismatch", orderNumber: ord.number, message: "Your payment needs a manual check by our team. We will contact you." };
    }
    // Paid while still awaiting payment → Payment confirmed. Paid after cancellation → refund needed.
    const upd = await db.query(
      `UPDATE orders SET payment_status = 'paid', status = CASE WHEN status = 'awaiting_payment' THEN 'payment_confirmed' ELSE 'refund_pending' END,
         paid_at = COALESCE($2::timestamptz, NOW()), payment_reference = $3, updated_at = NOW()
       WHERE id = $1 AND payment_status NOT IN ('paid','refunded','partially_refunded') RETURNING *`, [orderId, v.paid_at, reference]);
    if (!upd.rowCount) return { state: "already_paid", orderNumber: ord.number, message: "Payment already confirmed." };
    const o = upd.rows[0] as OrderRow;
    await logEvent(orderId, "payment", `Payment of ₦${(Number(v.amount) / 100).toLocaleString("en-NG")} verified with Paystack (${source}, ${o.payment_mode} mode).${o.status === "refund_pending" ? " The order had been closed, so a refund is required." : ""}`, { visible: true });
    await notifyCustomer(o, mails.paymentConfirmed(o, o.total_kobo, "Paystack", orderLink(o.number)), "Payment confirmation");
    await notifyStaff(o.id, `Payment confirmed: ${o.number}`, [`₦${(Number(v.amount) / 100).toLocaleString("en-NG")} via Paystack (${o.payment_mode}).`, o.status === "refund_pending" ? "ORDER WAS CLOSED — REFUND REQUIRED." : "Ready for supplier order."]);
    return { state: "paid", orderNumber: o.number, message: "Payment confirmed." };
  }
  if (v.status === "failed" || v.status === "reversed") {
    const upd = await db.query("UPDATE orders SET payment_status = 'failed', updated_at = NOW() WHERE id = $1 AND payment_status NOT IN ('paid','refunded','partially_refunded') AND payment_reference = $2 RETURNING id", [orderId, reference]);
    if (upd.rowCount) await logEvent(orderId, "payment", `Online payment attempt ${v.status} (${v.gateway_response || "no details"}). You can try again.`, { visible: true });
    return { state: "failed", orderNumber: ord.number, message: "The payment was not successful. You can try again from your order page." };
  }
  return { state: "pending", orderNumber: ord.number, message: "Payment has not been completed yet." };
}

export const MANUAL_METHODS = ["bank_transfer", "pos", "cash", "other"] as const;
/** Admin records a payment received outside Paystack. Requires an accepted quote and the exact amount. */
export async function recordManualPayment(orderId: string, i: { method: string; reference: string; amountNaira: number; paidOn: string; note: string }) {
  const order = await getOrderById(orderId);
  if (!order) throw new WorkflowError("Order not found", 404);
  await assertPayable(order);
  if (!(MANUAL_METHODS as readonly string[]).includes(i.method)) throw new WorkflowError("Choose the payment method.");
  if (i.reference.trim().length < 3) throw new WorkflowError("Enter the payment reference (e.g. bank transfer reference).");
  if (Math.round(i.amountNaira * 100) !== Number(order.total_kobo)) throw new WorkflowError(`The amount must equal the accepted quotation total (₦${(Number(order.total_kobo) / 100).toLocaleString("en-NG")}). Record partial payments as a note and wait for the full amount.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(i.paidOn) || new Date(i.paidOn).getTime() > Date.now() + 86_400_000) throw new WorkflowError("Enter a valid payment date (not in the future).");
  const db = await getDb();
  const upd = await db.query("UPDATE orders SET payment_status = 'paid', status = 'payment_confirmed', paid_at = $2::date, payment_mode = 'live', updated_at = NOW() WHERE id = $1 AND status = 'awaiting_payment' AND payment_status NOT IN ('paid','refunded','partially_refunded') RETURNING id", [orderId, i.paidOn]);
  if (!upd.rowCount) throw new WorkflowError("This order was already marked as paid.", 409);
  await db.query("INSERT INTO manual_payments (id, order_id, quote_id, method, reference, amount_kobo, paid_on, note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
    [randomUUID(), orderId, order.accepted_quote_id, i.method, i.reference.trim().slice(0, 200), order.total_kobo, i.paidOn, i.note.slice(0, 1000)]);
  await logEvent(orderId, "payment", `Payment of ₦${(Number(order.total_kobo) / 100).toLocaleString("en-NG")} received by ${i.method.replace("_", " ")} and verified by Cloud Edge.`, { visible: true, actor: "admin" });
  await notifyCustomer(order, mails.paymentConfirmed(order, order.total_kobo, i.method.replace("_", " "), orderLink(order.number)), "Payment confirmation", undefined, "admin");
}

export async function sendPaymentInstructions(orderId: string, instructions: string) {
  const order = await getOrderById(orderId);
  if (!order) throw new WorkflowError("Order not found", 404);
  await assertPayable(order);
  if (instructions.trim().length < 10) throw new WorkflowError("Write the payment instructions (e.g. bank account details and the reference to use).");
  return notifyCustomer(order, mails.paymentInstructions(order, order.total_kobo, instructions, orderLink(order.number)), "Payment instructions", `Payment instructions:\n${instructions.slice(0, 3000)}`, "admin");
}

/* ------------------------------ Admin operations ------------------------------ */
export type OrderFilter = { status?: string; q?: string; queue?: string; limit?: number; offset?: number };
export const QUEUES: Record<string, { label: string; where: string }> = {
  new: { label: "New requests", where: "o.status IN ('request_received','reviewing')" },
  sourcing: { label: "Sourcing", where: "o.status IN ('sourcing','supplier_found','availability_confirmed')" },
  quotes: { label: "Quotes with customer", where: "o.status IN ('quote_sent','awaiting_approval')" },
  payment: { label: "Awaiting payment", where: "o.status = 'awaiting_payment'" },
  fulfil: { label: "To fulfil", where: "o.status IN ('payment_confirmed','supplier_order','licence_ready')" },
  refunds: { label: "Refunds", where: "o.status = 'refund_pending'" },
  review: { label: "Payment review", where: "o.payment_status = 'amount_mismatch'" },
};
export async function listOrders(f: OrderFilter) {
  const db = await getDb();
  const where: string[] = []; const params: unknown[] = [];
  if (f.status && (ORDER_STATUSES as readonly string[]).includes(f.status)) { params.push(f.status); where.push(`o.status = $${params.length}`); }
  if (f.queue && QUEUES[f.queue]) where.push(QUEUES[f.queue].where);
  if (f.q) {
    params.push(`%${f.q.toLowerCase().replace(/[\\%_]/g, (m) => "\\" + m)}%`);
    where.push(`(LOWER(o.number) LIKE $${params.length} OR LOWER(o.email) LIKE $${params.length} OR LOWER(o.name) LIKE $${params.length})`);
  }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = Number((await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM orders o ${w}`, params)).rows[0].n);
  params.push(f.limit ?? 25, f.offset ?? 0);
  const rows = (await db.query(`SELECT o.*, (SELECT STRING_AGG(i.product_name, ', ') FROM order_items i WHERE i.order_id = o.id) AS item_names
    FROM orders o ${w} ORDER BY o.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params)).rows;
  return { rows, total };
}
export async function orderCounts() {
  const r = await (await getDb()).query<{ status: string; n: number }>("SELECT status, COUNT(*)::int AS n FROM orders GROUP BY status");
  return Object.fromEntries(r.rows.map((x) => [x.status, Number(x.n)])) as Record<string, number>;
}

export async function transitionContext(order: OrderRow) {
  const items = await orderItems(order.id);
  return {
    paymentStatus: order.payment_status,
    itemsReadyForFulfilment: items.length > 0 && items.every((i) => fulfilmentGaps({ ...i, actual_fulfilment_date: i.actual_fulfilment_date }).length === 0),
    refundedFully: Number(order.refunded_kobo) >= Number(order.total_kobo) && Number(order.total_kobo) > 0,
  };
}

export async function setOrderStatus(orderId: string, to: OrderStatus, message: string, notify: boolean) {
  const db = await getDb();
  const o = await getOrderById(orderId);
  if (!o) throw new WorkflowError("Order not found", 404);
  const err = transitionError(o.status, to, await transitionContext(o));
  if (err) throw new WorkflowError(err);
  const upd = await db.query("UPDATE orders SET status = $2, updated_at = NOW() WHERE id = $1 AND status = $3", [orderId, to, o.status]);
  if (!upd.rowCount) throw new WorkflowError("The order changed while you were editing. Reload and try again.", 409);
  if (["unavailable", "cancelled"].includes(to)) await db.query("UPDATE quotes SET status = 'superseded' WHERE order_id = $1 AND status IN ('draft','sent')", [orderId]);
  await logEvent(orderId, "status", `Status changed to “${ORDER_STATUS_LABEL[to]}”.${message ? ` ${message}` : ""}`, { visible: true, actor: "admin" });
  if (!notify) return null;
  const paid = o.payment_status === "paid";
  const link = orderLink(o.number);
  const m = to === "unavailable" ? mails.unavailable(o, message, link, paid)
    : to === "cancelled" ? mails.cancelled(o, message, link, paid)
    : to === "fulfilled" ? mails.fulfilled(o, message, link)
    : mails.sourcingUpdate(o, ORDER_STATUS_LABEL[to], message, link);
  return notifyCustomer(o, m, ORDER_STATUS_LABEL[to], undefined, "admin");
}

export async function sendCustomerMessage(orderId: string, message: string) {
  const o = await getOrderById(orderId);
  if (!o) throw new WorkflowError("Order not found", 404);
  return notifyCustomer(o, mails.sourcingUpdate(o, ORDER_STATUS_LABEL[o.status], message, orderLink(o.number)), "Sourcing update", message, "admin");
}
export async function addInternalNote(orderId: string, note: string) {
  await logEvent(orderId, "note", note, { visible: false, actor: "admin" });
}
export async function setNextAction(orderId: string, nextAction: string) {
  await (await getDb()).query("UPDATE orders SET next_action = $2, updated_at = NOW() WHERE id = $1", [orderId, nextAction.slice(0, 300)]);
}

export type SourcingUpdate = {
  sourcing_status: string; supplier_name: string; supplier_url: string; supplier_availability: string; supplier_price_text: string;
  sourcing_cost_naira: string; supplier_eta: string; tracking: string; expected_delivery: string; fulfilment_notes: string; delivery_details: string;
  supply_evidence: string; licence_type: string; region_eligibility: string; region_notes: string; actual_fulfilment_date: string; delivery_method: string;
};
export async function updateItemSourcing(itemId: string, u: SourcingUpdate) {
  if (!(SOURCING_STATUSES as readonly string[]).includes(u.sourcing_status)) throw new WorkflowError("Invalid sourcing status");
  const cost = u.sourcing_cost_naira.trim() === "" ? null : Math.round(Number(u.sourcing_cost_naira.replace(/[,₦\s]/g, "")) * 100);
  if (cost !== null && (!Number.isFinite(cost) || cost < 0)) throw new WorkflowError("Sourcing cost must be a number");
  const date = (v: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const url = u.supplier_url && !/^https?:\/\//i.test(u.supplier_url) ? "" : u.supplier_url;
  const db = await getDb();
  const before = (await db.query("SELECT i.*, o.payment_status FROM order_items i JOIN orders o ON o.id = i.order_id WHERE i.id = $1", [itemId])).rows[0];
  if (!before) throw new WorkflowError("Item not found", 404);
  const paid = ["paid", "partially_refunded"].includes(String(before.payment_status));
  if (["ordered_from_supplier", "shipped", "delivered"].includes(u.sourcing_status) && !paid) throw new WorkflowError("Place the supplier order only after the customer's payment is confirmed.");
  if (u.sourcing_status === "delivered") {
    const gaps = fulfilmentGaps({ sourcing_status: "delivered", supplier_name: u.supplier_name, supply_evidence: u.supply_evidence, licence_type: u.licence_type, region_eligibility: u.region_eligibility, actual_fulfilment_date: date(u.actual_fulfilment_date), delivery_method: u.delivery_method });
    if (gaps.length) throw new WorkflowError(`Before marking Delivered, record: ${gaps.join(", ")}.`);
  }
  await db.query(`UPDATE order_items SET sourcing_status=$2, supplier_name=$3, supplier_url=$4, supplier_availability=$5, supplier_price_text=$6, sourcing_cost_kobo=$7,
      supplier_eta=$8, tracking=$9, expected_delivery=$10, fulfilment_notes=$11, delivery_details=$12, supply_evidence=$13, licence_type=$14, region_eligibility=$15,
      region_notes=$16, actual_fulfilment_date=$17, delivery_method=$18, updated_at=NOW() WHERE id=$1`,
    [itemId, u.sourcing_status, u.supplier_name.slice(0, 200), url.slice(0, 500), u.supplier_availability.slice(0, 200), u.supplier_price_text.slice(0, 200), cost,
      u.supplier_eta.slice(0, 100), u.tracking.slice(0, 300), date(u.expected_delivery), u.fulfilment_notes.slice(0, 4000), u.delivery_details.slice(0, 4000),
      u.supply_evidence.slice(0, 2000), u.licence_type.slice(0, 200), u.region_eligibility === "confirmed" ? "confirmed" : "not_confirmed", u.region_notes.slice(0, 500),
      date(u.actual_fulfilment_date), u.delivery_method.slice(0, 200)]);
  if (before.sourcing_status !== u.sourcing_status) {
    await logEvent(String(before.order_id), "sourcing", `${before.product_name}: ${u.sourcing_status.replace(/_/g, " ")}.`, { visible: ["ordered_from_supplier", "shipped", "delivered"].includes(u.sourcing_status), actor: "admin" });
  }
  return String(before.order_id);
}

export async function recordRefund(orderId: string, amountNaira: number, method: "paystack" | "manual", reason: string, notify: boolean) {
  const db = await getDb();
  const o = await getOrderById(orderId);
  if (!o) throw new WorkflowError("Order not found", 404);
  if (!["paid", "partially_refunded"].includes(o.payment_status)) throw new WorkflowError("Only paid orders can be refunded.");
  const amountKobo = Math.round(amountNaira * 100);
  const remaining = Number(o.total_kobo) - Number(o.refunded_kobo);
  if (!(amountKobo > 0) || amountKobo > remaining) throw new WorkflowError(`Refund must be between ₦1 and the remaining ₦${(remaining / 100).toLocaleString("en-NG")}.`);
  let status = "completed", providerRef = "";
  if (method === "paystack") {
    if (!o.payment_reference) throw new WorkflowError("This order was not paid through Paystack. Record a manual refund instead.");
    const r = await createRefund(o.payment_reference, amountKobo);
    status = r.status ?? "pending"; providerRef = String(r.id ?? "");
  }
  const newRefunded = Number(o.refunded_kobo) + amountKobo;
  const full = newRefunded >= Number(o.total_kobo);
  const nextStatus = full ? (status === "completed" || status === "processed" ? "refunded" : "refund_pending") : o.status;
  await db.tx(async (q) => {
    await q("INSERT INTO refunds (id, order_id, amount_kobo, reason, method, status, provider_ref) VALUES ($1,$2,$3,$4,$5,$6,$7)", [randomUUID(), orderId, amountKobo, reason.slice(0, 500), method, status, providerRef]);
    await q("UPDATE orders SET refunded_kobo = $2, payment_status = $3, status = $4, updated_at = NOW() WHERE id = $1", [orderId, newRefunded, full ? "refunded" : "partially_refunded", nextStatus]);
  });
  await logEvent(orderId, "refund", `Refund of ₦${amountNaira.toLocaleString("en-NG")} ${method === "paystack" ? `requested via Paystack (status: ${status})` : "completed (recorded by Cloud Edge)"}.${reason ? ` Reason: ${reason}` : ""}`, { visible: true, actor: "admin" });
  if (notify) await notifyCustomer(o, mails.refund(o, amountKobo, method === "paystack" ? `requested (${status})` : "completed", reason, orderLink(o.number)), "Refund update", undefined, "admin");
}

/** Marks a refund-pending order as refunded once the full amount has been refunded. */
export async function completeRefund(orderId: string, notify: boolean) {
  const o = await getOrderById(orderId);
  if (!o) throw new WorkflowError("Order not found", 404);
  if (o.status !== "refund_pending") throw new WorkflowError("Order is not waiting for a refund.");
  if (Number(o.refunded_kobo) < Number(o.total_kobo)) throw new WorkflowError("Record the full refund first.");
  await (await getDb()).query("UPDATE orders SET status = 'refunded', updated_at = NOW() WHERE id = $1", [orderId]);
  await logEvent(orderId, "refund", "Refund completed.", { visible: true, actor: "admin" });
  if (notify) await notifyCustomer(o, mails.refund(o, Number(o.refunded_kobo), "completed", "", orderLink(o.number)), "Refund update", undefined, "admin");
}

export type { Row };
