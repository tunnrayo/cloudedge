/**
 * POST /api/orders/:number/pay — start (or retry) Paystack payment.
 * Only allowed when the customer has ACCEPTED a quotation and the order is awaiting payment.
 * The amount is the accepted quotation total from the database, never from the browser.
 */
import { NextResponse } from "next/server";
import { canView, getOrderByNumber, startPayment, WorkflowError } from "@/lib/shop/orders";
import { currentCustomer } from "@/lib/shop/customers";
import { sameOrigin } from "@/lib/request-guard";
import { clientIp, rateLimited } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ number: string }> }) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: "Request blocked." }, { status: 403 });
  if (rateLimited(`pay:${clientIp(req.headers)}`, 10, 10 * 60_000)) return NextResponse.json({ ok: false, error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  const { number } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { t?: string };
  const order = await getOrderByNumber(number);
  const me = await currentCustomer();
  if (!order || !canView(order, body.t, me?.id ?? null)) return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
  if (order.payment_status === "paid") return NextResponse.json({ ok: false, error: "This order is already paid." }, { status: 409 });
  try {
    const r = await startPayment(order, body.t ?? "");
    return NextResponse.json({ ok: true, authorizationUrl: r.authorizationUrl });
  } catch (e) {
    if (e instanceof WorkflowError) return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    return NextResponse.json({ ok: false, error: "Could not start payment." }, { status: 502 });
  }
}
