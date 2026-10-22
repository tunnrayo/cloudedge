import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui";
import PayButton from "@/components/shop/PayButton";
import ProductImage from "@/components/shop/ProductImage";
import { canView, getOrderByNumber, getQuotes, orderEvents, orderItems, orderRefunds, paymentsAvailability, publicQuote } from "@/lib/shop/orders";
import { currentCustomer } from "@/lib/shop/customers";
import { ORDER_STATUS_HELP, ORDER_STATUS_LABEL, SOURCING_LABEL, formatDate, nairaFromKobo, type OrderStatus, type SourcingStatus } from "@/lib/shop/format";
import { PAID_STATUSES, isQuoteExpired } from "@/lib/shop/workflow";
import { company } from "@/lib/site";
import { decide } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your request", robots: { index: false, follow: false } };

const whatsapp = () => (process.env.CONTACT_WHATSAPP || "").replace(/[^0-9]/g, "");

export default async function OrderPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string; new?: string; done?: string; err?: string }> }) {
  const [{ number }, sp] = await Promise.all([params, searchParams]);
  const order = await getOrderByNumber(number);
  const me = await currentCustomer();
  if (!order || !canView(order, sp.t, me?.id ?? null)) {
    return (
      <>
        <PageHero title="Request not found" />
        <section className="section"><div className="container narrow">
          <p>We could not open this request. Use the link from your acknowledgement email, or <Link href="/account/login">sign in</Link> if you sent it with an account.</p>
          <p>Need help? Email <a href={`mailto:${company.email}`}>{company.email}</a>.</p>
        </div></section>
      </>
    );
  }
  const [items, events, refunds, quotes] = await Promise.all([orderItems(order.id), orderEvents(order.id, true), orderRefunds(order.id), getQuotes(order.id)]);
  const status = order.status as OrderStatus;
  const shownQuotes = quotes.filter((q) => q.status !== "draft").map(publicQuote);
  const openQuote = shownQuotes.find((q) => q.status === "sent" && !(q.expires_at && isQuoteExpired(q.expires_at)));
  const accepted = shownQuotes.find((q) => q.id === order.accepted_quote_id);
  const pay = paymentsAvailability();
  const canPay = status === "awaiting_payment" && Boolean(accepted) && order.payment_status !== "paid";
  const paid = (PAID_STATUSES as string[]).includes(status);
  const wa = whatsapp();
  const t = sp.t ?? "";
  return (
    <>
      <PageHero eyebrow="Sourcing request" title={`Reference ${order.number}`} intro={`Sent ${formatDate(order.created_at, true)}`} />
      <section className="section tight"><div className="container cart-layout">
        <div className="stack">
          {sp.new && (
            <div className="alert ok" role="status">
              <p><strong>Request received — reference {order.number}.</strong> This is an acknowledgement, not an order confirmation. Nothing has been secured or charged.
                We will check availability, licence eligibility for {order.country || "your country"} and the final price, then send you a quotation. Keep this page&apos;s link (it is also in your email) to follow your request.</p>
            </div>
          )}
          {sp.done === "accept" && <div className="alert ok" role="status"><p>Thank you — you accepted the quotation. Your order is now confirmed and awaiting payment.</p></div>}
          {sp.done === "decline" && <div className="alert ok" role="status"><p>Thank you — we have recorded that you declined the quotation. We will contact you about alternatives.</p></div>}
          {sp.err && <div className="alert bad" role="alert"><p>{sp.err.slice(0, 300)}</p></div>}
          {order.payment_mode === "test" && paid && <div className="note" role="note"><p><strong>Test payment.</strong> Paid with Paystack test keys — no real money was charged.</p></div>}

          <div className="card">
            <p className="muted small mb-0">Status</p>
            <h2 style={{ margin: "4px 0 6px" }}><span className={`status-pill ${status}`}>{ORDER_STATUS_LABEL[status] ?? status}</span></h2>
            <p className="mb-0">{ORDER_STATUS_HELP[status]}</p>
          </div>

          {openQuote && (
            <div className="card" id="quote">
              <h2 className="h-small">Your quotation (version {openQuote.version})</h2>
              <QuoteTable q={openQuote} />
              <QuoteFacts q={openQuote} />
              <form action={decide} className="stack" style={{ marginTop: 14 }}>
                <input type="hidden" name="number" value={order.number} /><input type="hidden" name="t" value={t} /><input type="hidden" name="quote" value={openQuote.id} />
                <div className="field"><label htmlFor="note">Comment <span className="opt">(optional)</span></label><textarea id="note" name="note" maxLength={1000} style={{ minHeight: 70 }} /></div>
                <label className="check"><input type="checkbox" name="confirm" /> <span>I accept this quotation of <strong>{nairaFromKobo(openQuote.total_kobo)}</strong> and the licence terms above. I understand I pay only after accepting, using the payment method Cloud Edge provides.</span></label>
                <div className="actions" style={{ marginTop: 0 }}>
                  <button type="submit" className="btn btn-primary btn-sm" name="decision" value="accept">Accept quotation</button>
                  <button type="submit" className="btn btn-outline btn-sm" name="decision" value="decline">Decline</button>
                </div>
              </form>
            </div>
          )}

          {accepted && (
            <div className="card">
              <h2 className="h-small">Accepted quotation (version {accepted.version})</h2>
              <QuoteTable q={accepted} />
              <QuoteFacts q={accepted} hideExpiry />
              {canPay && (
                <div style={{ marginTop: 16 }}>
                  {pay.ok ? (
                    <>
                      <PayButton number={order.number} token={t} label={`Pay ${nairaFromKobo(order.total_kobo)} with Paystack`} />
                      {pay.mode === "test" && <p className="muted small">Test mode: Paystack test keys are in use, so no real money will be charged.</p>}
                    </>
                  ) : <p className="note">{pay.reason}</p>}
                  <p className="muted small">Your payment is confirmed only after we verify it with the payment provider — not when a page says “success”.</p>
                </div>
              )}
            </div>
          )}

          <div className="card">
            <h2 className="h-small">Requested software</h2>
            <ul className="order-items">
              {items.map((i) => (
                <li key={i.id}>
                  <div className="cart-thumb"><ProductImage src={i.image_url} alt="" /></div>
                  <div>
                    <strong>{i.product_name}</strong>{i.quantity > 1 ? ` × ${i.quantity}` : ""}
                    <div className="muted small">{i.billing_label}{i.option_value ? ` · ${i.option_label.replace(/\?$/, "")}: ${i.option_value}` : ""}</div>
                    {paid && <div className="small">Progress: {SOURCING_LABEL[i.sourcing_status as SourcingStatus] ?? i.sourcing_status}{i.expected_delivery ? ` · expected ${formatDate(i.expected_delivery)}` : ""}</div>}
                    {i.sourcing_status === "delivered" && i.delivery_details && <div className="delivery-box"><strong>Activation / delivery instructions</strong><p>{i.delivery_details}</p></div>}
                  </div>
                  {!accepted && !openQuote && <span className="muted small" style={{ textAlign: "right" }}>Indicative<br /><strong>{nairaFromKobo(i.line_total_kobo)}</strong></span>}
                </li>
              ))}
            </ul>
            {!accepted && !openQuote && <p className="muted small mb-0">Indicative prices are estimates from our catalogue. The final price is set in your quotation.</p>}
          </div>

          <div className="card">
            <h2 className="h-small">Updates</h2>
            <ol className="timeline">
              {events.map((e) => <li key={String(e.id)}><time>{formatDate(String(e.created_at), true)}</time><p style={{ whiteSpace: "pre-line" }}>{String(e.message)}</p></li>)}
            </ol>
          </div>
        </div>
        <aside className="card cart-summary" aria-label="Summary">
          <h2 className="h-small">Summary</h2>
          <dl className="sum">
            <dt>{accepted ? "Accepted total" : openQuote ? "Quoted total" : "Indicative total"}</dt><dd>{nairaFromKobo(accepted ? order.total_kobo : openQuote ? openQuote.total_kobo : (order.indicative_total_kobo ?? order.subtotal_kobo))}</dd>
            <dt>Payment</dt><dd>{order.payment_status === "paid" ? `Paid ${order.paid_at ? formatDate(order.paid_at) : ""}` : accepted ? order.payment_status.replace(/_/g, " ") : "Not requested yet"}</dd>
            {Number(order.refunded_kobo) > 0 && (<><dt>Refunded</dt><dd>{nairaFromKobo(order.refunded_kobo)}</dd></>)}
          </dl>
          {refunds.length > 0 && <p className="muted small">Refunds to cards usually take several business days to appear.</p>}
          <p className="muted small">Questions about this request? Email <a href={`mailto:${company.email}?subject=${encodeURIComponent(`Request ${order.number}`)}`} style={{ wordBreak: "break-all" }}>{company.email}</a> quoting {order.number}.</p>
          {wa && <p className="small"><a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hello Cloud Edge, about request ${order.number}`)}`} rel="noopener noreferrer" target="_blank">Message us on WhatsApp</a></p>}
          <p className="small"><Link href="/faq#sourcing">How sourcing works</Link> · <Link href="/refund-policy">Refund &amp; Delivery Policy</Link></p>
        </aside>
      </div></section>
    </>
  );
}

type PQ = ReturnType<typeof publicQuote>;
function QuoteTable({ q }: { q: PQ }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="quote-table">
        <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Price</th></tr></thead>
        <tbody>{q.lines.map((l, i) => <tr key={i}><td>{l.product_name}</td><td className="num">{l.quantity}</td><td className="num">{nairaFromKobo(l.price_kobo)}</td></tr>)}</tbody>
        <tfoot><tr><td colSpan={2}>Total (NGN)</td><td className="num">{nairaFromKobo(q.total_kobo)}</td></tr></tfoot>
      </table>
    </div>
  );
}
function QuoteFacts({ q, hideExpiry }: { q: PQ; hideExpiry?: boolean }) {
  return (
    <dl className="sum" style={{ marginTop: 12 }}>
      {q.delivery_estimate && (<><dt>Delivery estimate</dt><dd>{q.delivery_estimate}</dd></>)}
      {q.licence_terms && (<><dt>Licence / subscription</dt><dd>{q.licence_terms}</dd></>)}
      {!hideExpiry && q.expires_at && (<><dt>Valid until</dt><dd>{formatDate(q.expires_at, true)}</dd></>)}
      {q.customer_note && (<><dt>Note</dt><dd style={{ whiteSpace: "pre-line" }}>{q.customer_note}</dd></>)}
    </dl>
  );
}
