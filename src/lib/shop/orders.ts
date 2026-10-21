/**
 * ORDERS, PAYMENTS AND FULFILMENT (server-only)
 *
 * Rules enforced here:
 *  - Prices and totals always come from the database, never from the browser.
 *  - An order becomes "paid" ONLY after Paystack's verify API confirms status=success, the same
 *    reference, currency NGN and the exact expected amount. The UPDATE is conditional, so repeated
 *    callbacks/webhooks cannot pay or notify twice (idempotent).
 *  - Every change is written to order_events (the order's history / communication log).
 */
import "server-only";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { getDb, type Row } from "@/lib/db";
import { company } from "@/lib/site";
import { getProductsBySlugs, imageUrl, isPurchasable, priceSuffix, purchaseBlockers } from "@/lib/shop/products";
import { initializeTransaction, paystackConfigured, paystackMode, verifyTransaction, createRefund, PaystackError } from "@/lib/shop/paystack";
import { orderReceivedEmail, paymentConfirmedEmail, refundEmail, sendEmail, staffNewOrderEmail, statusUpdateEmail, type EmailResult } from "@/lib/shop/mail";
import { ORDER_STATUS_LABEL, ORDER_STATUSES, SOURCING_STATUSES, type OrderStatus } from "@/lib/shop/format";

/** Public address of the site, read at runtime (SITE_URL), falling back to the build-time NEXT_PUBLIC_SITE_URL. */
export const siteUrl = () => (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const ALPHA = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const randomCode = (n: number) => Array.from(randomBytes(n), (b) => ALPHA[b % ALPHA.length]).join("");

export type CartLine = { slug: string; quantity: number; option?: string };
export type CheckoutCustomer = { name: string; email: string; phone: string; company: string; country: string; state: string; city: string; address: string; notes: string };

export type QuoteLine = {
  slug: string; name: string; sku: string; image: string; quantity: number; maxQuantity: number; quantityLabel: string;
  unitPriceNgn: number; lineTotalNgn: number; billingLabel: string; optionLabel: string; optionRequired: boolean; option: string;
  purchasable: boolean; blockers: string[]; fulfilmentNote: string;
};
/** Server-side price calculation for a cart. Unknown/unpublished products are dropped. */
export async function quoteCart(lines: CartLine[]): Promise<{ lines: QuoteLine[]; subtotalNgn: number; totalNgn: number; allPurchasable: boolean; removed: string[] }> {
  const clean = lines.filter((l) => typeof l.slug === "string" && /^[a-z0-9-]{1,100}$/.test(l.slug)).slice(0, 50);
  const products = await getProductsBySlugs([...new Set(clean.map((l) => l.slug))]);
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const out: QuoteLine[] = []; const removed: string[] = [];
  const seen = new Set<string>();
  for (const l of clean) {
    const p = bySlug.get(l.slug);
    if (!p || seen.has(l.slug)) { if (!p) removed.push(l.slug); continue; }
    seen.add(l.slug);
    const quantity = Math.min(Math.max(1, Math.floor(Number(l.quantity) || 1)), p.maxQuantity);
    out.push({
      slug: p.slug, name: p.name, sku: p.sku, image: imageUrl(p), quantity, maxQuantity: p.maxQuantity, quantityLabel: p.quantityLabel,
      unitPriceNgn: p.priceNgn, lineTotalNgn: p.priceNgn * quantity, billingLabel: priceSuffix(p),
      optionLabel: p.optionLabel, optionRequired: p.optionRequired, option: String(l.option ?? "").trim().slice(0, 200),
      purchasable: isPurchasable(p), blockers: purchaseBlockers(p), fulfilmentNote: p.fulfilmentNote,
    });
  }
  const subtotalNgn = out.reduce((a, l) => a + l.lineTotalNgn, 0);
  return { lines: out, subtotalNgn, totalNgn: subtotalNgn, allPurchasable: out.length > 0 && out.every((l) => l.purchasable), removed };
}

export async function logEvent(orderId: string, kind: string, message: string, opts: { visible?: boolean; email?: EmailResult | null; actor?: string } = {}, q?: (s: string, p?: unknown[]) => Promise<unknown>) {
  const run = q ?? (async (s: string, p?: unknown[]) => (await getDb()).query(s, p));
  await run("INSERT INTO order_events (id, order_id, kind, message, customer_visible, email_status, actor) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [randomUUID(), orderId, kind, message, opts.visible ?? false, opts.email ?? null, opts.actor ?? "system"]);
}

export const orderLink = (number: string, token?: string) => `${siteUrl()}/orders/${number}${token ? `?t=${token}` : ""}`;

export class CheckoutError extends Error {
  constructor(message: string, public status = 400, public fields?: Record<string, string>) { super(message); }
}

/** Creates a pending order with server-calculated totals and starts a Paystack payment. */
export async function createOrder(customer: CheckoutCustomer, lines: CartLine[], customerId: string | null) {
  if (!paystackConfigured()) throw new CheckoutError(`Online payment is not set up yet, so no order was created. Please email ${company.email} to buy these products.`, 503);
  const quote = await quoteCart(lines);
  if (!quote.lines.length) throw new CheckoutError("Your cart is empty or its products are no longer available.");
  const blocked = quote.lines.filter((l) => !l.purchasable);
  if (blocked.length) throw new CheckoutError(`These products cannot be bought online yet: ${blocked.map((b) => b.name).join(", ")}. Please remove them or request them by enquiry.`, 409);
  const missing = quote.lines.filter((l) => l.optionRequired && !l.option);
  if (missing.length) throw new CheckoutError(`Please complete: ${missing.map((m) => `${m.optionLabel} (${m.name})`).join("; ")}.`, 422);
  if (quote.totalNgn <= 0 || quote.totalNgn > 50_000_000) throw new CheckoutError("Order total is outside the allowed range. Please contact us.", 422);

  const db = await getDb();
  const id = randomUUID();
  const token = randomBytes(24).toString("base64url");
  const number = `CE${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${randomCode(5)}`;
  const totalKobo = quote.totalNgn * 100;
  const mode = paystackMode();

  await db.tx(async (q) => {
    await q(`INSERT INTO orders (id, number, access_token_hash, customer_id, email, name, phone, company, country, state, city, address, notes,
              status, payment_status, subtotal_kobo, total_kobo, payment_mode, terms_accepted_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending_payment','unpaid',$14,$15,$16,NOW())`,
      [id, number, sha256(token), customerId, customer.email, customer.name, customer.phone, customer.company, customer.country, customer.state, customer.city, customer.address, customer.notes,
        quote.subtotalNgn * 100, totalKobo, mode]);
    const products = await getProductsBySlugs(quote.lines.map((l) => l.slug));
    for (const l of quote.lines) {
      const p = products.find((x) => x.slug === l.slug)!;
      await q(`INSERT INTO order_items (id, order_id, product_id, sku, product_slug, product_name, image_url, billing_label, unit_price_kobo, quantity, line_total_kobo,
                option_label, option_value, fulfilment_type, supplier_name, supplier_url)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [randomUUID(), id, p.id, p.sku, p.slug, p.name, l.image, l.billingLabel, l.unitPriceNgn * 100, l.quantity, l.lineTotalNgn * 100, l.optionLabel, l.option, p.fulfilmentType, p.supplierName, p.supplierUrl]);
    }
    await logEvent(id, "status", "Order created. Awaiting payment.", { visible: true, actor: "customer" }, q);
  });

  const pay = await startPayment(id, number, customer.email, totalKobo, token);
  const items = await orderItems(id);
  const mail = orderReceivedEmail({ number, name: customer.name, total_kobo: totalKobo, payment_mode: mode }, items, orderLink(number, token));
  const sent = await sendEmail(customer.email, mail.subject, mail.html, mail.text);
  await logEvent(id, "email", "Order received email", { visible: false, email: sent });
  return { number, token, authorizationUrl: pay.authorizationUrl, totalNgn: quote.totalNgn, mode };
}

/** Initializes (or re-initializes, for retries) a Paystack transaction with a fresh unique reference. */
export async function startPayment(orderId: string, number: string, email: string, totalKobo: number, token: string) {
  const db = await getDb();
  const reference = `${number}-${randomCode(4)}`;
  const callbackUrl = `${siteUrl()}/checkout/complete?order=${encodeURIComponent(number)}&t=${encodeURIComponent(token)}`;
  try {
    const r = await initializeTransaction({ email, amountKobo: totalKobo, reference, callbackUrl, metadata: { order_number: number, cancel_action: orderLink(number, token) } });
    await db.query("INSERT INTO payments (id, order_id, reference, kind, status, amount_kobo, currency) VALUES ($1,$2,$3,'initialize','initialized',$4,'NGN')", [randomUUID(), orderId, reference, totalKobo]);
    await db.query("UPDATE orders SET payment_reference = $2, updated_at = NOW() WHERE id = $1", [orderId, reference]);
    return { authorizationUrl: r.authorization_url, reference };
  } catch (e) {
    const msg = e instanceof PaystackError ? e.message : "Payment provider unreachable";
    console.error("[paystack] initialize failed:", msg);
    await logEvent(orderId, "payment", `Could not start payment: ${msg}`, { visible: false });
    throw new CheckoutError("We could not connect to the payment provider. Your order was saved; please try paying again from your order page in a few minutes.", 502);
  }
}

export type ConfirmOutcome = { state: "paid" | "already_paid" | "failed" | "pending" | "mismatch" | "unknown_reference" | "error"; orderNumber?: string; message: string };

/**
 * Confirms a payment by asking Paystack directly. Safe to call any number of times
 * (callback page, webhook, admin "re-check"): only the first successful call marks the order paid.
 */
export async function confirmPayment(reference: string, source: "callback" | "webhook" | "admin"): Promise<ConfirmOutcome> {
  if (!/^[A-Za-z0-9._=-]{6,100}$/.test(reference)) return { state: "unknown_reference", message: "Invalid payment reference." };
  const db = await getDb();
  const init = await db.query<{ order_id: string }>("SELECT order_id FROM payments WHERE reference = $1 AND kind = 'initialize'", [reference]);
  if (!init.rows[0]) return { state: "unknown_reference", message: "We could not find an order for this payment reference." };
  const orderId = init.rows[0].order_id;
  const ord = (await db.query("SELECT * FROM orders WHERE id = $1", [orderId])).rows[0];
  if (!ord) return { state: "unknown_reference", message: "Order not found." };
  if (ord.payment_status === "paid" || ord.payment_status === "refunded" || ord.payment_status === "partially_refunded") return { state: "already_paid", orderNumber: String(ord.number), message: "Payment already confirmed." };

  let v;
  try { v = await verifyTransaction(reference); }
  catch (e) {
    await logEvent(orderId, "payment", `Payment verification failed to run (${source}): ${(e as Error).message}`);
    return { state: "error", orderNumber: String(ord.number), message: "We could not verify the payment with Paystack right now. It will be checked again automatically." };
  }
  await db.query("INSERT INTO payments (id, order_id, reference, kind, status, amount_kobo, currency, detail) VALUES ($1,$2,$3,'verify',$4,$5,$6,$7)",
    [randomUUID(), orderId, reference, v.status, v.amount, v.currency, `${source}: ${v.gateway_response ?? ""}`.slice(0, 300)]);

  if (v.status === "success") {
    if (v.reference !== reference || v.currency !== "NGN" || Number(v.amount) !== Number(ord.total_kobo)) {
      const upd = await db.query("UPDATE orders SET payment_status = 'amount_mismatch', status = 'payment_review', updated_at = NOW() WHERE id = $1 AND payment_status <> 'paid' RETURNING id", [orderId]);
      if (upd.rowCount) await logEvent(orderId, "payment", `Paystack reported a successful payment that does NOT match the order (expected ${ord.total_kobo} kobo NGN, got ${v.amount} ${v.currency}). Order held for review.`, { visible: false });
      return { state: "mismatch", orderNumber: String(ord.number), message: "Your payment needs a manual check by our team. We will contact you." };
    }
    const upd = await db.query(
      "UPDATE orders SET payment_status = 'paid', status = 'paid', paid_at = COALESCE($2::timestamptz, NOW()), payment_reference = $3, updated_at = NOW() WHERE id = $1 AND payment_status NOT IN ('paid','refunded','partially_refunded') RETURNING *",
      [orderId, v.paid_at, reference]);
    if (!upd.rowCount) return { state: "already_paid", orderNumber: String(ord.number), message: "Payment already confirmed." };
    const o = upd.rows[0];
    await logEvent(orderId, "payment", `Payment of ${(Number(v.amount) / 100).toLocaleString("en-NG")} NGN verified with Paystack (${source}, ${o.payment_mode} mode).`, { visible: true });
    await afterPaid(o);
    return { state: "paid", orderNumber: String(o.number), message: "Payment confirmed." };
  }
  if (v.status === "failed" || v.status === "reversed") {
    const upd = await db.query("UPDATE orders SET payment_status = 'failed', status = 'failed', updated_at = NOW() WHERE id = $1 AND payment_status NOT IN ('paid','refunded','partially_refunded') AND payment_reference = $2 RETURNING id", [orderId, reference]);
    if (upd.rowCount) await logEvent(orderId, "payment", `Payment ${v.status} (${v.gateway_response || "no details"}).`, { visible: true });
    return { state: "failed", orderNumber: String(ord.number), message: "The payment was not successful. You can try again from your order page." };
  }
  return { state: "pending", orderNumber: String(ord.number), message: "Payment has not been completed yet." };
}

async function afterPaid(o: Row) {
  const items = await orderItems(String(o.id));
  const link = orderLink(String(o.number));
  const m = paymentConfirmedEmail(o as never, items, link);
  const r = await sendEmail(String(o.email), m.subject, m.html, m.text);
  await logEvent(String(o.id), "email", "Payment confirmation email", { email: r });
  const staffTo = process.env.SHOP_NOTIFY_EMAIL || process.env.INQUIRY_TO_EMAIL || company.email;
  const s = staffNewOrderEmail(o as never, items);
  const r2 = await sendEmail(staffTo, s.subject, s.html, s.text);
  await logEvent(String(o.id), "email", "Staff new-order notification", { email: r2 });
}

/* ---------------------------- Reading orders ---------------------------- */
export async function orderItems(orderId: string) {
  return (await (await getDb()).query("SELECT * FROM order_items WHERE order_id = $1 ORDER BY product_name", [orderId])).rows as never[] as OrderItemRow[];
}
export type OrderItemRow = {
  id: string; order_id: string; product_id: string | null; sku: string; product_slug: string; product_name: string; image_url: string; billing_label: string;
  unit_price_kobo: string; quantity: number; line_total_kobo: string; option_label: string; option_value: string; fulfilment_type: string;
  sourcing_status: string; supplier_name: string; supplier_url: string; supplier_availability: string; supplier_price_text: string;
  sourcing_cost_kobo: string | null; supplier_eta: string; tracking: string; expected_delivery: string | null; fulfilment_notes: string; delivery_details: string;
};
export type OrderRow = Record<string, unknown> & {
  id: string; number: string; email: string; name: string; status: OrderStatus; payment_status: string; total_kobo: string; subtotal_kobo: string;
  refunded_kobo: string; payment_reference: string | null; payment_mode: string; created_at: string; paid_at: string | null; customer_id: string | null; access_token_hash: string;
};

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
export async function orderRefunds(orderId: string) {
  return (await (await getDb()).query("SELECT * FROM refunds WHERE order_id = $1 ORDER BY created_at ASC", [orderId])).rows;
}
export async function customerOrders(customerId: string) {
  return (await (await getDb()).query("SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 100", [customerId])).rows as OrderRow[];
}

/* ---------------------------- Admin operations ---------------------------- */
export type OrderFilter = { status?: string; q?: string; queue?: "sourcing" | "abandoned" | "review"; limit?: number; offset?: number };
export async function listOrders(f: OrderFilter) {
  const db = await getDb();
  const where: string[] = []; const params: unknown[] = [];
  if (f.status && (ORDER_STATUSES as readonly string[]).includes(f.status)) { params.push(f.status); where.push(`o.status = $${params.length}`); }
  if (f.queue === "sourcing") where.push(`o.status IN ('paid','processing','awaiting_activation','on_hold') AND EXISTS (SELECT 1 FROM order_items i WHERE i.order_id = o.id AND i.sourcing_status NOT IN ('delivered','cancelled_refunded'))`);
  if (f.queue === "abandoned") where.push(`o.status = 'pending_payment' AND o.created_at < NOW() - INTERVAL '24 hours'`);
  if (f.queue === "review") where.push(`o.status = 'payment_review'`);
  if (f.q) {
    params.push(`%${f.q.toLowerCase().replace(/[\\%_]/g, (m) => "\\" + m)}%`);
    where.push(`(LOWER(o.number) LIKE $${params.length} OR LOWER(o.email) LIKE $${params.length} OR LOWER(o.name) LIKE $${params.length})`);
  }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = Number((await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM orders o ${w}`, params)).rows[0].n);
  params.push(f.limit ?? 25, f.offset ?? 0);
  const rows = (await db.query(`SELECT o.*, (SELECT COUNT(*)::int FROM order_items i WHERE i.order_id = o.id) AS item_count,
      (SELECT STRING_AGG(i.product_name, ', ') FROM order_items i WHERE i.order_id = o.id) AS item_names
    FROM orders o ${w} ORDER BY o.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params)).rows;
  return { rows, total };
}
export async function orderCounts() {
  const r = await (await getDb()).query<{ status: string; n: number }>("SELECT status, COUNT(*)::int AS n FROM orders GROUP BY status");
  return Object.fromEntries(r.rows.map((x) => [x.status, Number(x.n)])) as Record<string, number>;
}

export async function setOrderStatus(orderId: string, status: OrderStatus, message: string, notify: boolean) {
  const db = await getDb();
  const o = await getOrderById(orderId);
  if (!o) throw new Error("Order not found");
  if (status === "paid" && o.payment_status !== "paid") throw new Error("An order can only be marked paid by a verified Paystack payment. Use “Re-check payment”.");
  if (status === "fulfilled") {
    const open = (await orderItems(orderId)).filter((i) => !["delivered", "cancelled_refunded"].includes(i.sourcing_status));
    if (open.length) throw new Error(`Mark every item as Delivered (or Cancelled/refunded) before fulfilling. Open: ${open.map((i) => i.product_name).join(", ")}`);
  }
  await db.query("UPDATE orders SET status = $2, updated_at = NOW() WHERE id = $1", [orderId, status]);
  let email: EmailResult | null = null;
  if (notify) {
    const m = statusUpdateEmail(o as never, ORDER_STATUS_LABEL[status], message, orderLink(o.number));
    email = await sendEmail(o.email, m.subject, m.html, m.text);
  }
  await logEvent(orderId, "status", `Status changed to “${ORDER_STATUS_LABEL[status]}”.${message ? ` ${message}` : ""}`, { visible: true, email, actor: "admin" });
  return email;
}

export async function sendCustomerMessage(orderId: string, message: string) {
  const o = await getOrderById(orderId);
  if (!o) throw new Error("Order not found");
  const m = statusUpdateEmail(o as never, ORDER_STATUS_LABEL[o.status], message, orderLink(o.number));
  const email = await sendEmail(o.email, m.subject, m.html, m.text);
  await logEvent(orderId, "message", message, { visible: true, email, actor: "admin" });
  return email;
}
export async function addInternalNote(orderId: string, note: string) {
  await logEvent(orderId, "note", note, { visible: false, actor: "admin" });
}

export type SourcingUpdate = {
  sourcing_status: string; supplier_name: string; supplier_url: string; supplier_availability: string; supplier_price_text: string;
  sourcing_cost_naira: string; supplier_eta: string; tracking: string; expected_delivery: string; fulfilment_notes: string; delivery_details: string;
};
export async function updateItemSourcing(itemId: string, u: SourcingUpdate) {
  if (!(SOURCING_STATUSES as readonly string[]).includes(u.sourcing_status)) throw new Error("Invalid sourcing status");
  const cost = u.sourcing_cost_naira.trim() === "" ? null : Math.round(Number(u.sourcing_cost_naira.replace(/[,₦\s]/g, "")) * 100);
  if (cost !== null && (!Number.isFinite(cost) || cost < 0)) throw new Error("Sourcing cost must be a number");
  const date = u.expected_delivery && /^\d{4}-\d{2}-\d{2}$/.test(u.expected_delivery) ? u.expected_delivery : null;
  const url = u.supplier_url && !/^https?:\/\//i.test(u.supplier_url) ? "" : u.supplier_url;
  const db = await getDb();
  const before = (await db.query("SELECT * FROM order_items WHERE id = $1", [itemId])).rows[0];
  if (!before) throw new Error("Item not found");
  await db.query(`UPDATE order_items SET sourcing_status=$2, supplier_name=$3, supplier_url=$4, supplier_availability=$5, supplier_price_text=$6, sourcing_cost_kobo=$7,
      supplier_eta=$8, tracking=$9, expected_delivery=$10, fulfilment_notes=$11, delivery_details=$12, updated_at=NOW() WHERE id=$1`,
    [itemId, u.sourcing_status, u.supplier_name.slice(0, 200), url.slice(0, 500), u.supplier_availability.slice(0, 200), u.supplier_price_text.slice(0, 200), cost,
      u.supplier_eta.slice(0, 100), u.tracking.slice(0, 300), date, u.fulfilment_notes.slice(0, 4000), u.delivery_details.slice(0, 4000)]);
  if (before.sourcing_status !== u.sourcing_status) {
    await logEvent(String(before.order_id), "sourcing", `${before.product_name}: ${u.sourcing_status.replace(/_/g, " ")}.`, { visible: ["ordered_from_supplier", "shipped", "delivered"].includes(u.sourcing_status), actor: "admin" });
  }
  return String(before.order_id);
}

export async function recordRefund(orderId: string, amountNaira: number, method: "paystack" | "manual", reason: string, notify: boolean) {
  const db = await getDb();
  const o = await getOrderById(orderId);
  if (!o) throw new Error("Order not found");
  if (!["paid", "refunded", "partially_refunded"].includes(o.payment_status)) throw new Error("Only paid orders can be refunded.");
  const amountKobo = Math.round(amountNaira * 100);
  const remaining = Number(o.total_kobo) - Number(o.refunded_kobo);
  if (!(amountKobo > 0) || amountKobo > remaining) throw new Error(`Refund must be between ₦1 and the remaining ₦${(remaining / 100).toLocaleString("en-NG")}.`);
  let status = "recorded", providerRef = "";
  if (method === "paystack") {
    if (!o.payment_reference) throw new Error("No Paystack reference on this order.");
    const r = await createRefund(o.payment_reference, amountKobo);
    status = r.status ?? "pending"; providerRef = String(r.id ?? "");
  }
  const newRefunded = Number(o.refunded_kobo) + amountKobo;
  const full = newRefunded >= Number(o.total_kobo);
  await db.tx(async (q) => {
    await q("INSERT INTO refunds (id, order_id, amount_kobo, reason, method, status, provider_ref) VALUES ($1,$2,$3,$4,$5,$6,$7)", [randomUUID(), orderId, amountKobo, reason.slice(0, 500), method, status, providerRef]);
    await q("UPDATE orders SET refunded_kobo = $2, payment_status = $3, status = $4, updated_at = NOW() WHERE id = $1",
      [orderId, newRefunded, full ? "refunded" : "partially_refunded", full ? "refunded" : o.status === "refunded" ? "partially_refunded" : o.status === "fulfilled" ? "fulfilled" : "partially_refunded"]);
  });
  let email: EmailResult | null = null;
  if (notify) { const m = refundEmail(o as never, amountKobo, reason, orderLink(o.number)); email = await sendEmail(o.email, m.subject, m.html, m.text); }
  await logEvent(orderId, "refund", `Refund of ₦${amountNaira.toLocaleString("en-NG")} ${method === "paystack" ? `requested via Paystack (status: ${status})` : "recorded as a manual refund"}.${reason ? ` Reason: ${reason}` : ""}`, { visible: true, email, actor: "admin" });
}

/** Customer response to an on-hold order (e.g. supplier price changed). */
export async function customerDecision(order: OrderRow, decision: "approve" | "cancel", note: string) {
  if (order.status !== "on_hold") throw new Error("This order is not waiting for your decision.");
  const msg = decision === "approve" ? "Customer approved the proposed change and asked us to continue." : "Customer asked to cancel and be refunded.";
  await logEvent(order.id, "customer", `${msg}${note ? ` Note: ${note.slice(0, 1000)}` : ""}`, { visible: true, actor: "customer" });
  const staffTo = process.env.SHOP_NOTIFY_EMAIL || process.env.INQUIRY_TO_EMAIL || company.email;
  const r = await sendEmail(staffTo, `[Shop] Customer decision on ${order.number}: ${decision}`, `<p>${msg}</p><p>${note.replace(/[<>&]/g, "")}</p>`, `${msg} ${note}`);
  await logEvent(order.id, "email", "Staff notified of customer decision", { email: r });
}

/** Cancels unpaid orders older than the given hours (abandoned checkouts). */
export async function cancelAbandoned(hours = 48) {
  const db = await getDb();
  const r = await db.query<{ id: string }>(`UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE status IN ('pending_payment','failed') AND payment_status <> 'paid' AND created_at < NOW() - ($1 || ' hours')::interval RETURNING id`, [String(hours)]);
  for (const row of r.rows) await logEvent(row.id, "status", `Cancelled automatically: no confirmed payment within ${hours} hours.`, { visible: true });
  return r.rowCount;
}
