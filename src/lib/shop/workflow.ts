/**
 * MANUAL SOURCING WORKFLOW — the rules in one place (no database code, safe for browser and tests).
 *
 *   Request received → reviewing → sourcing → supplier option found → availability confirmed
 *   → quote sent → (awaiting approval) → customer accepts → awaiting payment
 *   → payment confirmed (ONLY by a verified Paystack payment or a recorded manual payment)
 *   → supplier order in progress → licence ready → fulfilled
 *   Side exits: unavailable, cancelled, refund pending → refunded.
 */

export const ORDER_STATUSES = [
  "request_received", "reviewing", "sourcing", "supplier_found", "availability_confirmed",
  "quote_sent", "awaiting_approval", "awaiting_payment", "payment_confirmed",
  "supplier_order", "licence_ready", "fulfilled", "unavailable", "cancelled", "refund_pending", "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  request_received: "Request received",
  reviewing: "Reviewing request",
  sourcing: "Sourcing in progress",
  supplier_found: "Supplier option found",
  availability_confirmed: "Availability confirmed",
  quote_sent: "Quote sent to customer",
  awaiting_approval: "Awaiting customer approval",
  awaiting_payment: "Awaiting payment",
  payment_confirmed: "Payment confirmed",
  supplier_order: "Supplier order in progress",
  licence_ready: "Licence ready for delivery",
  fulfilled: "Fulfilled",
  unavailable: "Unavailable",
  cancelled: "Cancelled",
  refund_pending: "Refund pending",
  refunded: "Refunded",
};

/** What the customer sees for each status (never claims more than is true). */
export const ORDER_STATUS_HELP: Record<OrderStatus, string> = {
  request_received: "We have received your request. This is not an order confirmation — nothing has been secured or charged yet.",
  reviewing: "We are reviewing your request and the product details.",
  sourcing: "We are checking legitimate supply options for your request.",
  supplier_found: "We have found a possible supply option and are confirming the details.",
  availability_confirmed: "Availability is confirmed. We are preparing your quotation.",
  quote_sent: "Your quotation is ready. Please review it below and accept or decline it.",
  awaiting_approval: "Your quotation is waiting for your decision. Please review it below.",
  awaiting_payment: "You accepted the quotation. Please pay using the instructions below. We source the product only after your payment is confirmed.",
  payment_confirmed: "Your payment has been confirmed. We will now place the order with our supplier.",
  supplier_order: "We have placed or are placing the order with our supplier.",
  licence_ready: "Your licence or subscription is ready and will be delivered shortly.",
  fulfilled: "Your order is complete. Delivery details are shown below.",
  unavailable: "We could not source this request. You have not been charged unless stated below.",
  cancelled: "This request was cancelled.",
  refund_pending: "Your refund is being processed.",
  refunded: "Your refund has been completed.",
};

/** Allowed manual (admin) moves. Payment-related statuses are set by the system, not chosen freely. */
const MANUAL: Record<OrderStatus, OrderStatus[]> = {
  request_received: ["reviewing", "sourcing", "unavailable", "cancelled"],
  reviewing: ["sourcing", "supplier_found", "availability_confirmed", "unavailable", "cancelled"],
  sourcing: ["reviewing", "supplier_found", "availability_confirmed", "unavailable", "cancelled"],
  supplier_found: ["sourcing", "availability_confirmed", "unavailable", "cancelled"],
  availability_confirmed: ["sourcing", "unavailable", "cancelled"],
  quote_sent: ["awaiting_approval", "unavailable", "cancelled"],
  awaiting_approval: ["unavailable", "cancelled"],
  awaiting_payment: ["unavailable", "cancelled"],
  payment_confirmed: ["supplier_order", "refund_pending"],
  supplier_order: ["licence_ready", "fulfilled", "refund_pending"],
  licence_ready: ["fulfilled", "supplier_order", "refund_pending"],
  fulfilled: ["refund_pending"],
  unavailable: ["reviewing", "sourcing"],
  cancelled: [],
  refund_pending: [],
  refunded: [],
};
export const PRE_PAYMENT: OrderStatus[] = ["request_received", "reviewing", "sourcing", "supplier_found", "availability_confirmed", "quote_sent", "awaiting_approval", "awaiting_payment", "unavailable"];
export const PAID_STATUSES: OrderStatus[] = ["payment_confirmed", "supplier_order", "licence_ready", "fulfilled", "refund_pending", "refunded"];

export type TransitionContext = {
  paymentStatus: string;               // unpaid | pending | paid | failed | amount_mismatch | refunded | partially_refunded
  itemsReadyForFulfilment: boolean;    // every item has the required fulfilment record (or is cancelled)
  refundedFully: boolean;
};

export function allowedNextStatuses(from: OrderStatus, ctx: TransitionContext): OrderStatus[] {
  return MANUAL[from].filter((to) => transitionError(from, to, ctx) === null);
}

/** Returns null when the move is allowed, otherwise a plain-English reason. */
export function transitionError(from: OrderStatus, to: OrderStatus, ctx: TransitionContext): string | null {
  if (from === to) return "The order already has this status.";
  if (to === "payment_confirmed") return "Payment can only be confirmed by a verified Paystack payment or a recorded manual payment.";
  if (to === "quote_sent" || to === "awaiting_payment") return "This status is set automatically when a quotation is sent or accepted.";
  if (to === "refunded") return "Record the refund; the order becomes Refunded automatically.";
  if (!MANUAL[from].includes(to)) return `An order cannot move from “${ORDER_STATUS_LABEL[from]}” to “${ORDER_STATUS_LABEL[to]}”.`;
  const paid = ctx.paymentStatus === "paid" || ctx.paymentStatus === "partially_refunded";
  if (["supplier_order", "licence_ready", "fulfilled", "refund_pending"].includes(to) && !paid) return "This needs a confirmed payment first.";
  if (to === "fulfilled" && !ctx.itemsReadyForFulfilment) return "Complete the fulfilment record for every item (supplier, supply evidence, licence type, region eligibility, actual fulfilment date, delivery method) and mark it Delivered first.";
  if ((to === "unavailable" || to === "cancelled") && paid) return "This order is paid — move it to Refund pending instead.";
  return null;
}

/* ------------------------------- Quotations ------------------------------- */
export type QuoteLineInput = {
  quantity: number;
  supplierCurrency: string;        // e.g. NGN, USD, GBP, EUR
  supplierUnitCost: number;        // in supplierCurrency, per unit
  fxRate: number;                  // ₦ per 1 unit of supplierCurrency (1 for NGN)
  feesNgn: number;                 // payment/processing fees for the whole line
  taxesNgn: number;
  deliveryNgn: number;
  marginType: "percent" | "fixed";
  marginValue: number;             // percent (e.g. 15) or fixed naira for the whole line
};
export type QuoteLineResult = { costNgn: number; marginNgn: number; priceNgn: number; unitPriceNgn: number };

export function quoteLineErrors(l: QuoteLineInput): string[] {
  const e: string[] = [];
  if (!Number.isInteger(l.quantity) || l.quantity < 1) e.push("Quantity must be a whole number of at least 1.");
  if (!/^[A-Z]{3}$/.test(l.supplierCurrency)) e.push("Supplier currency must be a 3-letter code such as NGN or USD.");
  if (!(l.supplierUnitCost > 0)) e.push("Supplier cost must be greater than zero.");
  if (!(l.fxRate > 0)) e.push("Exchange rate must be greater than zero.");
  if (l.supplierCurrency === "NGN" && l.fxRate !== 1) e.push("Exchange rate must be 1 when the supplier currency is NGN.");
  for (const [k, v] of [["Fees", l.feesNgn], ["Taxes", l.taxesNgn], ["Delivery", l.deliveryNgn], ["Margin", l.marginValue]] as const) if (!(v >= 0) || !Number.isFinite(v)) e.push(`${k} must be zero or more.`);
  if (l.marginType === "percent" && l.marginValue > 500) e.push("Margin percentage looks too high (max 500%).");
  return e;
}

/** Transparent price: (cost × qty × rate) + fees + taxes + delivery, then margin; rounded UP to the next naira. */
export function calculateQuoteLine(l: QuoteLineInput): QuoteLineResult {
  const costNgn = Math.round((l.supplierUnitCost * l.quantity * l.fxRate + l.feesNgn + l.taxesNgn + l.deliveryNgn) * 100) / 100;
  const marginNgn = l.marginType === "percent" ? Math.round(costNgn * l.marginValue) / 100 : l.marginValue;
  const priceNgn = Math.ceil(costNgn + marginNgn);
  return { costNgn, marginNgn, priceNgn, unitPriceNgn: Math.round((priceNgn / l.quantity) * 100) / 100 };
}

export const QUOTE_STATUS_LABEL: Record<string, string> = {
  draft: "Draft (not sent)", sent: "Sent — awaiting customer", accepted: "Accepted by customer", declined: "Declined by customer", expired: "Expired", superseded: "Replaced by a newer quote",
};
export const isQuoteExpired = (expiresAt: string | Date, now = new Date()) => new Date(expiresAt).getTime() < now.getTime();

/* ---------------------------- Fulfilment record ---------------------------- */
export type FulfilmentRecord = { sourcing_status: string; supplier_name: string; supply_evidence: string; licence_type: string; region_eligibility: string; actual_fulfilment_date: string | null; delivery_method: string };
export function fulfilmentGaps(i: FulfilmentRecord): string[] {
  if (i.sourcing_status === "cancelled_refunded") return [];
  const gaps: string[] = [];
  if (i.sourcing_status !== "delivered") gaps.push("mark item Delivered");
  if (!i.supplier_name.trim()) gaps.push("supplier / sourcing channel");
  if (!i.supply_evidence.trim()) gaps.push("supply arrangement evidence/notes");
  if (!i.licence_type.trim()) gaps.push("licence or subscription type");
  if (i.region_eligibility !== "confirmed") gaps.push("customer region eligibility confirmed");
  if (!i.actual_fulfilment_date) gaps.push("actual fulfilment date");
  if (!i.delivery_method.trim()) gaps.push("delivery method");
  return gaps;
}
