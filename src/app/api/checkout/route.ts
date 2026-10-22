/**
 * POST /api/checkout — submits a SOURCING REQUEST. No payment is taken here.
 * Validates the customer details on the server and records the request with indicative prices.
 * A repeated submission with the same requestId returns the original request (no duplicates).
 */
import { NextResponse } from "next/server";
import { isClientRequestId, normalizeCheckout, validateCheckout } from "@/lib/shop/checkout-validate";
import { WorkflowError, createRequest } from "@/lib/shop/orders";
import { currentCustomer } from "@/lib/shop/customers";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: "Request blocked." }, { status: 403 });
  if (rateLimited(`request:${clientIp(req.headers)}`, 10, 10 * 60_000)) return NextResponse.json({ ok: false, error: "Too many requests. Please wait a few minutes." }, { status: 429 });
  let body: { customer?: unknown; items?: unknown; requestId?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 }); }
  const customer = normalizeCheckout(body.customer);
  const errors = validateCheckout(customer);
  if (Object.keys(errors).length) return NextResponse.json({ ok: false, error: "Please correct the highlighted fields.", errors }, { status: 422 });
  const items = Array.isArray(body.items) ? body.items.slice(0, 50).map((x) => ({ slug: String((x as { slug?: unknown }).slug ?? ""), quantity: Number((x as { quantity?: unknown }).quantity ?? 1), option: String((x as { option?: unknown }).option ?? "") })) : [];
  const requestId = isClientRequestId(body.requestId) ? body.requestId : null;
  try {
    const me = await currentCustomer();
    const { acceptTerms: _a, ...details } = customer; void _a;
    const r = await createRequest(details, items, me?.id ?? null, requestId);
    // A duplicate submission does not get the secret link again (it was already returned to the first submission).
    const orderUrl = r.token ? `/orders/${r.number}?t=${r.token}&new=1` : me ? `/orders/${r.number}` : null;
    return NextResponse.json({ ok: true, orderNumber: r.number, orderUrl, duplicate: r.duplicate });
  } catch (e) {
    if (e instanceof WorkflowError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    console.error("[request] failed:", (e as Error).message);
    return NextResponse.json({ ok: false, error: "Something went wrong while sending your request. Nothing was charged. Please try again." }, { status: 500 });
  }
}
