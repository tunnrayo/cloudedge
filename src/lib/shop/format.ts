/** Shared formatting and labels (safe for browser and server). */

export const ORDER_STATUSES = ["pending_payment", "payment_review", "paid", "processing", "awaiting_activation", "on_hold", "fulfilled", "cancelled", "failed", "refunded", "partially_refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Pending payment",
  payment_review: "Payment under review",
  paid: "Paid",
  processing: "Processing",
  awaiting_activation: "Awaiting activation",
  on_hold: "On hold — your approval needed",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
  failed: "Payment failed",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};
export const ORDER_STATUS_HELP: Record<OrderStatus, string> = {
  pending_payment: "We have not received a confirmed payment for this order yet.",
  payment_review: "Your payment needs a manual check by our team. We will contact you.",
  paid: "Payment confirmed. Our team will start sourcing your product.",
  processing: "We are sourcing or provisioning your product with the vendor or an authorised supplier.",
  awaiting_activation: "Your product has been ordered and is waiting for activation by the vendor.",
  on_hold: "We need your decision (for example, the supplier price or availability changed). Please read the latest message below.",
  fulfilled: "Your order is complete. Activation details are shown below and were sent by email.",
  cancelled: "This order was cancelled.",
  failed: "The payment did not go through. You can try again.",
  refunded: "This order has been refunded.",
  partially_refunded: "Part of this order has been refunded.",
};

export const SOURCING_STATUSES = ["sourcing_required", "supplier_confirmed", "ordered_from_supplier", "shipped", "delivered", "cancelled_refunded"] as const;
export type SourcingStatus = (typeof SOURCING_STATUSES)[number];
export const SOURCING_LABEL: Record<SourcingStatus, string> = {
  sourcing_required: "Sourcing required",
  supplier_confirmed: "Supplier confirmed",
  ordered_from_supplier: "Ordered from supplier",
  shipped: "Sent / shipped",
  delivered: "Delivered",
  cancelled_refunded: "Cancelled / refunded",
};

export const FULFILMENT_LABEL: Record<string, string> = {
  manual_sourcing: "Manual sourcing after order",
  manual_activation: "Manual activation by our team",
  supplier_api: "Supplier API (automatic)",
  digital_file: "Digital download",
  unavailable: "Unavailable",
};
export const RESALE_LABEL: Record<string, string> = {
  unconfirmed: "Resale permission not confirmed",
  authorised: "Resale authorised (confirmed by admin)",
  affiliate: "Affiliate / referral only",
  not_permitted: "Resale not permitted",
};
export const VERIFICATION_LABEL: Record<string, string> = {
  verified: "Reference price re-checked against the official page — matches",
  catalogue: "As listed in the supplied catalogue",
  needs_verification: "Price needs verification",
};
export const REF_TYPE_LABEL: Record<string, string> = {
  standard: "Standard price",
  renewal: "Renewal price",
  promotional: "Promotional / first-term price",
  introductory: "Introductory term price",
  starting_from: "Starting price",
  annual_billing_monthly_equivalent: "Monthly equivalent of annual billing",
};

const UNIT: Record<string, string> = { user: "user", seat: "seat", licence: "licence", site: "site", computer: "computer", editor: "editor", domain: "domain" };

/** e.g. "/ user / month", "/ year", "one-time", "for 27 months" */
export function billingSuffix(period: string, unit: string, note = ""): string {
  const u = UNIT[unit] ? ` / ${UNIT[unit]}` : "";
  if (period === "one_time") return `one-time${u ? ` (${UNIT[unit]})` : ""}`;
  if (period === "term") return `${u.replace(/^ \/ /, "/ ")} ${note || "per term"}`.trim();
  return `${u} / ${period}`.replace(/^ \/ /, "/ ");
}

export function naira(amountNaira: number): string {
  return "₦" + Math.round(amountNaira).toLocaleString("en-NG");
}
export function nairaFromKobo(kobo: number | bigint | string): string {
  const n = Number(kobo) / 100;
  return "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
export function formatDate(iso: string | Date, withTime = false): string {
  return new Date(iso).toLocaleString("en-NG", withTime ? { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" } : { dateStyle: "medium", timeZone: "Africa/Lagos" });
}
