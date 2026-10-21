/**
 * POST /api/checkout — validates the customer details, recalculates the total on the server,
 * creates a pending order and returns the Paystack checkout URL. The browser never sets prices.
 */
import { NextResponse } from "next/server";
import { normalizeCheckout, validateCheckout } from "@/lib/shop/checkout-validate";
import { CheckoutError, createOrder } from "@/lib/shop/orders";
import { currentCustomer } from "@/lib/shop/customers";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: "Request blocked." }, { status: 403 });
  if (rateLimited(`checkout:${clientIp(req.headers)}`, 10, 10 * 60_000)) return NextResponse.json({ ok: false, error: "Too many checkout attempts. Please wait a few minutes." }, { status: 429 });
  let body: { customer?: unknown; items?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 }); }
  const customer = normalizeCheckout(body.customer);
  const errors = validateCheckout(customer);
  if (Object.keys(errors).length) return NextResponse.json({ ok: false, error: "Please correct the highlighted fields.", errors }, { status: 422 });
  const items = Array.isArray(body.items) ? body.items.slice(0, 50).map((x) => ({ slug: String((x as { slug?: unknown }).slug ?? ""), quantity: Number((x as { quantity?: unknown }).quantity ?? 1), option: String((x as { option?: unknown }).option ?? "") })) : [];
  try {
    const me = await currentCustomer();
    const { acceptTerms: _a, ...details } = customer; void _a;
    const r = await createOrder(details, items, me?.id ?? null);
    return NextResponse.json({ ok: true, orderNumber: r.number, authorizationUrl: r.authorizationUrl, orderUrl: `/orders/${r.number}?t=${r.token}`, mode: r.mode });
  } catch (e) {
    if (e instanceof CheckoutError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    console.error("[checkout] failed:", (e as Error).message);
    return NextResponse.json({ ok: false, error: "Something went wrong while creating your order. Nothing was charged. Please try again." }, { status: 500 });
  }
}
