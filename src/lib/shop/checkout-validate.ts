/** Checkout form validation — shared by the browser (instant feedback) and the server (authoritative). */
export type CheckoutInput = {
  name: string; email: string; phone: string; company: string; country: string; state: string; city: string; address: string; notes: string; acceptTerms: boolean;
};
export type CheckoutErrors = Partial<Record<keyof CheckoutInput, string>>;

const LIMITS: Record<Exclude<keyof CheckoutInput, "acceptTerms">, number> = { name: 100, email: 200, phone: 30, company: 150, country: 80, state: 80, city: 80, address: 300, notes: 1000 };
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
  if (!/^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/.test(i.email)) e.email = "Please enter a valid email address — activation details are sent here.";
  if (!/^\+?[0-9][0-9\s()-]{6,24}$/.test(i.phone)) e.phone = "Please enter a phone number we can reach you on.";
  if (i.country.length < 2) e.country = "Please enter your country.";
  if (i.city.length < 2) e.city = "Please enter your city.";
  if (i.address.length < 5) e.address = "Please enter your billing address.";
  if (!i.acceptTerms) e.acceptTerms = "Please accept the Terms, Refund & Delivery Policy to continue.";
  return e;
}
