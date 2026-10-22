/** Shared formatting and labels (safe for browser and server). */

export { ORDER_STATUSES, ORDER_STATUS_LABEL, ORDER_STATUS_HELP, type OrderStatus } from "./workflow.ts";

export const SOURCING_STATUSES = ["sourcing_required", "supplier_confirmed", "ordered_from_supplier", "shipped", "delivered", "cancelled_refunded"] as const;
export type SourcingStatus = (typeof SOURCING_STATUSES)[number];
export const SOURCING_LABEL: Record<SourcingStatus, string> = {
  sourcing_required: "Not yet sourced",
  supplier_confirmed: "Supplier confirmed",
  ordered_from_supplier: "Ordered from supplier",
  shipped: "Sent / shipped",
  delivered: "Delivered",
  cancelled_refunded: "Cancelled / refunded",
};

export const FULFILMENT_LABEL: Record<string, string> = {
  manual_sourcing: "Sourced manually after your request",
  manual_activation: "Manual activation by our team",
  supplier_api: "Supplier API (automatic)",
  digital_file: "Digital download",
  unavailable: "Unavailable",
};
export const RESALE_LABEL: Record<string, string> = {
  unconfirmed: "Authorised-partner status not confirmed",
  authorised: "Authorised reseller/partner (verified by admin)",
  affiliate: "Affiliate / referral only",
  not_permitted: "Resale not permitted",
};
export const VERIFICATION_LABEL: Record<string, string> = {
  verified: "Vendor reference price re-checked against the official page — matches (indicative only)",
  catalogue: "Indicative — from our catalogue research, not a supplier quotation",
  needs_verification: "Indicative — price needs verification",
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
