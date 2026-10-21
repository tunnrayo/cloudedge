import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui";
import PayButton from "@/components/shop/PayButton";
import ProductImage from "@/components/shop/ProductImage";
import { canView, getOrderByNumber, orderEvents, orderItems, orderRefunds } from "@/lib/shop/orders";
import { currentCustomer } from "@/lib/shop/customers";
import { ORDER_STATUS_HELP, ORDER_STATUS_LABEL, SOURCING_LABEL, formatDate, nairaFromKobo, type OrderStatus, type SourcingStatus } from "@/lib/shop/format";
import { company } from "@/lib/site";
import { decide } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string; sent?: string }> }) {
  const [{ number }, sp] = await Promise.all([params, searchParams]);
  const order = await getOrderByNumber(number);
  const me = await currentCustomer();
  if (!order || !canView(order, sp.t, me?.id ?? null)) {
    return (
      <>
        <PageHero title="Order not found" />
        <section className="section"><div className="container narrow">
          <p>We could not open this order. Use the link from your order email, or <Link href="/account/login">sign in</Link> if you ordered with an account.</p>
          <p>Need help? Email <a href={`mailto:${company.email}`}>{company.email}</a>.</p>
        </div></section>
      </>
    );
  }
  const [items, events, refunds] = await Promise.all([orderItems(order.id), orderEvents(order.id, true), orderRefunds(order.id)]);
  const status = order.status as OrderStatus;
  const canPay = ["pending_payment", "failed"].includes(status) && order.payment_status !== "paid";
  return (
    <>
      <PageHero eyebrow="Order" title={`Order ${order.number}`} intro={`Placed ${formatDate(order.created_at, true)}`} />
      <section className="section tight"><div className="container cart-layout">
        <div className="stack">
          {sp.sent && <div className="alert ok" role="status"><p>Thank you — your decision was sent to our team.</p></div>}
          {order.payment_mode === "test" && <div className="note" role="note"><p><strong>Test order.</strong> Placed with Paystack test keys — no real money was charged.</p></div>}
          <div className="card">
            <p className="muted small mb-0">Status</p>
            <h2 style={{ margin: "4px 0 6px" }}><span className={`status-pill ${status}`}>{ORDER_STATUS_LABEL[status] ?? status}</span></h2>
            <p className="mb-0">{ORDER_STATUS_HELP[status]}</p>
            {canPay && <div style={{ marginTop: 16 }}><PayButton number={order.number} token={sp.t ?? ""} label={`Pay ${nairaFromKobo(order.total_kobo)} with Paystack`} /></div>}
          </div>

          {status === "on_hold" && (
            <form action={decide} className="card">
              <h2 className="h-small">Your decision</h2>
              <p className="small">Read the latest message in the history below, then tell us how you would like to proceed. Nothing extra is charged without your agreement.</p>
              <input type="hidden" name="number" value={order.number} /><input type="hidden" name="t" value={sp.t ?? ""} />
              <div className="field"><label htmlFor="note">Comment <span className="opt">(optional)</span></label><textarea id="note" name="note" maxLength={1000} style={{ minHeight: 80 }} /></div>
              <div className="actions" style={{ marginTop: 0 }}>
                <button type="submit" className="btn btn-primary btn-sm" name="decision" value="approve">Approve and continue</button>
                <button type="submit" className="btn btn-outline btn-sm" name="decision" value="cancel">Cancel and refund me</button>
              </div>
            </form>
          )}

          <div className="card">
            <h2 className="h-small">Items</h2>
            <ul className="order-items">
              {items.map((i) => (
                <li key={i.id}>
                  <div className="cart-thumb"><ProductImage src={i.image_url} alt="" /></div>
                  <div>
                    <strong>{i.product_name}</strong>{i.quantity > 1 ? ` × ${i.quantity}` : ""}
                    <div className="muted small">{i.billing_label}{i.option_value ? ` · ${i.option_label.replace(/\?$/, "")}: ${i.option_value}` : ""}</div>
                    {order.payment_status !== "unpaid" && <div className="small">Progress: {SOURCING_LABEL[i.sourcing_status as SourcingStatus] ?? i.sourcing_status}{i.expected_delivery ? ` · expected ${formatDate(i.expected_delivery)}` : ""}</div>}
                    {i.sourcing_status === "delivered" && i.delivery_details && <div className="delivery-box"><strong>Activation / delivery details</strong><p>{i.delivery_details}</p></div>}
                  </div>
                  <strong>{nairaFromKobo(i.line_total_kobo)}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2 className="h-small">History</h2>
            <ol className="timeline">
              {events.map((e) => <li key={String(e.id)}><time>{formatDate(String(e.created_at), true)}</time><p>{String(e.message)}</p></li>)}
            </ol>
          </div>
        </div>
        <aside className="card cart-summary" aria-label="Payment summary">
          <h2 className="h-small">Payment</h2>
          <dl className="sum">
            <dt>Total</dt><dd>{nairaFromKobo(order.total_kobo)}</dd>
            <dt>Payment</dt><dd>{order.payment_status === "paid" ? `Paid ${order.paid_at ? formatDate(order.paid_at) : ""}` : order.payment_status.replace(/_/g, " ")}</dd>
            {Number(order.refunded_kobo) > 0 && (<><dt>Refunded</dt><dd>{nairaFromKobo(order.refunded_kobo)}</dd></>)}
          </dl>
          {refunds.length > 0 && <p className="muted small">Refunds to cards usually take several business days to appear.</p>}
          <p className="muted small">Questions? Email <a href={`mailto:${company.email}`} style={{ wordBreak: "break-all" }}>{company.email}</a> quoting {order.number}.</p>
          <Link href="/refund-policy" className="small">Refund &amp; Delivery Policy</Link>
        </aside>
      </div></section>
    </>
  );
}
