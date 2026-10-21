/** POST /api/orders/:number/pay — start (or retry) Paystack payment for an unpaid order. */
import { NextResponse } from "next/server";
import { canView, CheckoutError, getOrderByNumber, startPayment } from "@/lib/shop/orders";
import { currentCustomer } from "@/lib/shop/customers";
import { paystackConfigured } from "@/lib/shop/paystack";
import { getDb } from "@/lib/db";
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
  if (!["pending_payment", "failed"].includes(order.status) || order.payment_status === "paid") return NextResponse.json({ ok: false, error: "This order does not need payment." }, { status: 409 });
  if (!paystackConfigured()) return NextResponse.json({ ok: false, error: "Online payment is not set up yet." }, { status: 503 });
  // Prices are fixed when the order is created; re-check that every product can still be bought.
  const blocked = (await (await getDb()).query("SELECT p.name FROM order_items i JOIN products p ON p.id = i.product_id WHERE i.order_id = $1 AND NOT (p.status = 'published' AND p.sale_mode = 'purchase' AND p.resale_status = 'authorised' AND p.price_verification <> 'needs_verification' AND p.fulfilment_type <> 'unavailable')", [order.id])).rows;
  if (blocked.length) return NextResponse.json({ ok: false, error: `Some products are no longer available to buy online (${blocked.map((b) => b.name).join(", ")}). Please contact us.` }, { status: 409 });
  try {
    await (await getDb()).query("UPDATE orders SET status = 'pending_payment', payment_status = 'unpaid', updated_at = NOW() WHERE id = $1 AND payment_status <> 'paid'", [order.id]);
    const token = body.t ?? "";
    const r = await startPayment(order.id, order.number, order.email, Number(order.total_kobo), token);
    return NextResponse.json({ ok: true, authorizationUrl: r.authorizationUrl });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof CheckoutError ? e.message : "Could not start payment." }, { status: 502 });
  }
}
