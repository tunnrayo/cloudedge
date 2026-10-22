/**
 * Sourcing-request form validation — shared by the browser (instant feedback) and the server (authoritative).
 * Only what we need to source and quote: name, email and country are required; phone and company are optional.
 */
export type CheckoutInput = {
  name: string; email: string; phone: string; company: string; country: string; notes: string; acceptTerms: boolean;
};
export type CheckoutErrors = Partial<Record<keyof CheckoutInput, string>>;

const LIMITS: Record<Exclude<keyof CheckoutInput, "acceptTerms">, number> = { name: 100, email: 200, phone: 30, company: 150, country: 80, notes: 1000 };
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max) : "");

export function normalizeCheckout(raw: unknown): CheckoutInput {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = {} as CheckoutInput;
  (Object.keys(LIMITS) as (keyof typeof LIMITS)[]).forEach((k) => { out[k] = clean(r[k], LIMITS[k]); });
  out.email = out.email.toLowerCase();
  out.acceptTerms = r.acceptTerms === true || r.acceptTerms === "on" || r.acceptTerms === "true";
  return out;
}

export function validateCheckout(i: CheckoutInput): CheckoutErrors {
  const e: CheckoutErrors = {};
  if (i.name.length < 2) e.name = "Please enter your full name.";
  if (!/^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/.test(i.email)) e.email = "Please enter a valid email address — your quotation is sent here.";
  if (i.phone && !/^\+?[0-9][0-9\s()-]{6,24}$/.test(i.phone)) e.phone = "Please enter a valid phone number, or leave it empty.";
  if (i.country.length < 2) e.country = "Please enter your country — licence eligibility and pricing depend on it.";
  if (!i.acceptTerms) e.acceptTerms = "Please confirm you understand that a request is not an order and accept the Terms.";
  return e;
}

/** Client-generated id that makes repeated submissions of the same form idempotent. */
export const isClientRequestId = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(v);
