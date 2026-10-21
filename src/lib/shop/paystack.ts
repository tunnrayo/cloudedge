/**
 * PAYSTACK INTEGRATION (server-only) — https://paystack.com/docs
 *
 * Environment variables:
 *   PAYSTACK_SECRET_KEY  sk_test_... (test mode) or sk_live_... (live). Never sent to the browser.
 *   PAYSTACK_BASE_URL    optional; defaults to https://api.paystack.co (only changed for automated tests)
 *
 * Flow: initialize (server) → customer pays on Paystack's checkout page → Paystack redirects back
 * with ?reference=… → server VERIFIES with GET /transaction/verify/:reference. The webhook
 * (charge.success, signed with HMAC-SHA512 of the raw body using the secret key) is a second,
 * independent confirmation. A browser redirect alone never marks an order as paid.
 */
import "server-only";
import { verifyPaystackSignature } from "./signature.ts";

export const paystackConfigured = () => /^sk_(test|live)_/.test(process.env.PAYSTACK_SECRET_KEY ?? "");
export const paystackMode = (): "test" | "live" | "off" => {
  const k = process.env.PAYSTACK_SECRET_KEY ?? "";
  return k.startsWith("sk_live_") ? "live" : k.startsWith("sk_test_") ? "test" : "off";
};
const base = () => (process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co").replace(/\/$/, "");

async function call<T>(method: "GET" | "POST", path: string, body?: object): Promise<T> {
  const res = await fetch(base() + path, {
    method,
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: unknown } | null;
  if (!res.ok || !json || json.status !== true) {
    throw new PaystackError(json?.message ?? `Paystack request failed (HTTP ${res.status})`, res.status);
  }
  return json.data as T;
}
export class PaystackError extends Error {
  constructor(message: string, public httpStatus: number) { super(message); this.name = "PaystackError"; }
}

export type InitResult = { authorization_url: string; access_code: string; reference: string };
export function initializeTransaction(input: { email: string; amountKobo: number; reference: string; callbackUrl: string; metadata: object }) {
  return call<InitResult>("POST", "/transaction/initialize", {
    email: input.email, amount: input.amountKobo, currency: "NGN", reference: input.reference,
    callback_url: input.callbackUrl, metadata: input.metadata,
  });
}

export type VerifyResult = { status: string; reference: string; amount: number; currency: string; paid_at: string | null; gateway_response: string; id: number; domain?: string };
export function verifyTransaction(reference: string) {
  return call<VerifyResult>("GET", `/transaction/verify/${encodeURIComponent(reference)}`);
}

export type RefundResult = { status?: string; id?: number; transaction?: { reference?: string } };
export function createRefund(reference: string, amountKobo: number) {
  return call<RefundResult>("POST", "/refund", { transaction: reference, amount: amountKobo });
}

/** Checks the x-paystack-signature header: HMAC-SHA512 of the raw body with the secret key. */
export function validWebhookSignature(rawBody: string, signature: string | null): boolean {
  return verifyPaystackSignature(rawBody, signature, process.env.PAYSTACK_SECRET_KEY);
}
