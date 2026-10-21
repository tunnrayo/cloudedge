import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-session";
import ProductImage from "@/components/shop/ProductImage";
import { getOrderById, orderEvents, orderItems, orderPayments, orderRefunds } from "@/lib/shop/orders";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, SOURCING_LABEL, SOURCING_STATUSES, formatDate, nairaFromKobo, type OrderStatus } from "@/lib/shop/format";
import { itemSourcingAction, orderMessageAction, orderNoteAction, orderStatusAction, recheckPaymentAction, refundAction } from "../../shop-actions";

export const metadata = { title: "Order" };

export default async function AdminOrder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const o = await getOrderById(id);
  if (!o) notFound();
  const [items, events, payments, refunds] = await Promise.all([orderItems(id), orderEvents(id, false), orderPayments(id), orderRefunds(id)]);
  const cost = items.reduce((a, i) => a + (i.sourcing_cost_kobo == null ? 0 : Number(i.sourcing_cost_kobo)), 0);
  const allCosted = items.every((i) => i.sourcing_cost_kobo != null);
  const paid = Number(o.total_kobo) - Number(o.refunded_kobo);
  const status = o.status as OrderStatus;
  return (
    <>
      <p><Link href="/admin/orders">← Orders</Link> · <Link href="/admin/orders?queue=sourcing">Sourcing queue</Link></p>
      <h1 style={{ fontSize: "1.7rem" }}>Order {o.number} <span className={`status-pill ${status}`} style={{ verticalAlign: "middle" }}>{ORDER_STATUS_LABEL[status] ?? status}</span>
        {o.payment_mode === "test" && <span className="flag warn" style={{ marginLeft: 8, verticalAlign: "middle" }}>TEST MODE</span>}</h1>
      {sp.ok && <div className="alert ok" role="status"><p>{sp.ok}</p></div>}
      {sp.err && <div className="alert bad" role="alert"><p>{sp.err}</p></div>}

      <div className="split wide-left" style={{ alignItems: "start", gap: 24 }}>
        <div>
          <section className="card" aria-labelledby="cust-h" style={{ marginBottom: 16 }}>
            <h2 id="cust-h" className="h-small">Customer &amp; delivery</h2>
            <dl className="details">
              <dt>Name</dt><dd>{String(o.name)}{o.company ? ` — ${String(o.company)}` : ""}</dd>
              <dt>Email</dt><dd><a href={`mailto:${o.email}?subject=${encodeURIComponent(`Your order ${o.number}`)}`}>{o.email}</a></dd>
              <dt>Phone</dt><dd>{String(o.phone)}</dd>
              <dt>Billing address</dt><dd>{[o.address, o.city, o.state, o.country].filter(Boolean).map(String).join(", ")}</dd>
              <dt>Customer notes</dt><dd>{String(o.notes || "—")}</dd>
              <dt>Account</dt><dd>{o.customer_id ? "Registered customer" : "Guest checkout"}</dd>
            </dl>
          </section>

          <h2 className="h-small">Items — sourcing &amp; fulfilment</h2>
          {items.map((i) => {
            const margin = i.sourcing_cost_kobo == null ? null : Number(i.line_total_kobo) - Number(i.sourcing_cost_kobo);
            return (
              <form key={i.id} action={itemSourcingAction} className="item-block">
                <input type="hidden" name="order_id" value={o.id} /><input type="hidden" name="item_id" value={i.id} />
                <div className="item-head">
                  <ProductImage src={i.image_url} alt="" className="admin-thumb" />
                  <div>
                    <strong>{i.product_name}</strong> <span className="muted small">{i.sku}</span>
                    <div className="small">Qty {i.quantity} · {nairaFromKobo(i.unit_price_kobo)} {i.billing_label}</div>
                    {i.option_value && <div className="small"><strong>{i.option_label || "Option"}:</strong> {i.option_value}</div>}
                    <div className="small muted">Fulfilment: {i.fulfilment_type.replace(/_/g, " ")} · <Link href={`/products/${i.product_slug}`} target="_blank">product page</Link></div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div><b>{nairaFromKobo(i.line_total_kobo)}</b></div>
                    <div className="small muted">selling price</div>
                    {margin != null && <div className={`small ${margin < 0 ? "err" : ""}`}>Margin {nairaFromKobo(margin)}</div>}
                  </div>
                </div>
                <div className="admin-grid">
                  <div className="field"><label htmlFor={`ss-${i.id}`}>Sourcing status</label>
                    <select id={`ss-${i.id}`} name="sourcing_status" defaultValue={i.sourcing_status}>{SOURCING_STATUSES.map((s) => <option key={s} value={s}>{SOURCING_LABEL[s]}</option>)}</select></div>
                  <div className="field"><label htmlFor={`sn-${i.id}`}>Supplier</label><input id={`sn-${i.id}`} name="supplier_name" defaultValue={i.supplier_name} /></div>
                  <div className="field"><label htmlFor={`su-${i.id}`}>Supplier link / research</label><input id={`su-${i.id}`} name="supplier_url" type="url" defaultValue={i.supplier_url} placeholder="https://" />
                    {i.supplier_url && <p className="hint"><a href={i.supplier_url} target="_blank" rel="noopener noreferrer">Open supplier link</a></p>}</div>
                  <div className="field"><label htmlFor={`sa-${i.id}`}>Supplier availability</label><input id={`sa-${i.id}`} name="supplier_availability" defaultValue={i.supplier_availability} placeholder="e.g. In stock, available today" /></div>
                  <div className="field"><label htmlFor={`sp-${i.id}`}>Supplier price (as quoted)</label><input id={`sp-${i.id}`} name="supplier_price_text" defaultValue={i.supplier_price_text} placeholder="e.g. US$99.99 or ₦88,999" /></div>
                  <div className="field"><label htmlFor={`sc-${i.id}`}>Your actual sourcing cost (₦, whole line)</label><input id={`sc-${i.id}`} name="sourcing_cost_naira" inputMode="decimal" defaultValue={i.sourcing_cost_kobo == null ? "" : String(Number(i.sourcing_cost_kobo) / 100)} /></div>
                  <div className="field"><label htmlFor={`se-${i.id}`}>Supplier delivery time</label><input id={`se-${i.id}`} name="supplier_eta" defaultValue={i.supplier_eta} placeholder="e.g. 1–2 business days" /></div>
                  <div className="field"><label htmlFor={`ed-${i.id}`}>Expected delivery date</label><input id={`ed-${i.id}`} name="expected_delivery" type="date" defaultValue={i.expected_delivery ? new Date(i.expected_delivery).toISOString().slice(0, 10) : ""} /></div>
                  <div className="field"><label htmlFor={`tr-${i.id}`}>Tracking / supplier order reference</label><input id={`tr-${i.id}`} name="tracking" defaultValue={i.tracking} /></div>
                </div>
                <div className="field"><label htmlFor={`fn-${i.id}`}>Fulfilment notes (internal)</label><textarea id={`fn-${i.id}`} name="fulfilment_notes" defaultValue={i.fulfilment_notes} style={{ minHeight: 70 }} /></div>
                <div className="field"><label htmlFor={`dd-${i.id}`}>Activation / delivery details for the customer</label>
                  <textarea id={`dd-${i.id}`} name="delivery_details" defaultValue={i.delivery_details} style={{ minHeight: 70 }} placeholder="Shown on the customer's order page when this item is marked Delivered. Only enter genuine details received from the vendor/supplier." /></div>
                <button className="btn btn-primary btn-sm" type="submit">Save item</button>
              </form>
            );
          })}

          <section className="card" aria-labelledby="hist-h">
            <h2 id="hist-h" className="h-small">History &amp; communication</h2>
            <ol className="timeline">
              {events.map((e) => (
                <li key={String(e.id)}>
                  <time>{formatDate(String(e.created_at), true)}</time> <span className="flag warn" style={{ background: e.customer_visible ? "var(--ok-bg)" : undefined }}>{e.customer_visible ? "customer sees" : "internal"}</span>
                  {Boolean(e.email_status) && <span className={`flag ${e.email_status === "sent" ? "good" : "bad"}`}>email {String(e.email_status).replace("_", " ")}</span>}
                  <span className="muted small"> {String(e.kind)} · {String(e.actor)}</span>
                  <p>{String(e.message)}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="stack">
          <section className="card" aria-labelledby="money-h">
            <h2 id="money-h" className="h-small">Money</h2>
            <dl className="sum">
              <dt>Order total</dt><dd>{nairaFromKobo(o.total_kobo)}</dd>
              <dt>Payment</dt><dd>{o.payment_status.replace(/_/g, " ")}{o.paid_at ? ` (${formatDate(o.paid_at, true)})` : ""}</dd>
              <dt>Refunded</dt><dd>{nairaFromKobo(o.refunded_kobo)}</dd>
              <dt>Sourcing cost</dt><dd>{nairaFromKobo(cost)}{allCosted ? "" : " (incomplete)"}</dd>
              <dt className="total">Margin</dt><dd className="total">{nairaFromKobo(paid - cost)}</dd>
            </dl>
            <p className="muted small">Paystack reference: {o.payment_reference ?? "—"}</p>
            <form action={recheckPaymentAction}><input type="hidden" name="id" value={o.id} /><button className="btn btn-outline btn-sm" type="submit">Re-check payment with Paystack</button></form>
            {payments.length > 0 && (
              <details style={{ marginTop: 12 }}><summary className="small">Payment records ({payments.length})</summary>
                <ul className="small">{payments.map((p) => <li key={String(p.id)}>{formatDate(String(p.created_at), true)} — {String(p.kind)}: {String(p.status)} {p.amount_kobo ? nairaFromKobo(String(p.amount_kobo)) : ""} {String(p.currency ?? "")} {String(p.detail ?? "")}</li>)}</ul>
              </details>
            )}
          </section>

          <form action={orderStatusAction} className="card">
            <input type="hidden" name="id" value={o.id} />
            <h2 className="h-small">Update order status</h2>
            <div className="field"><label htmlFor="st">Status</label>
              <select id="st" name="status" defaultValue={status}>{ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}</select></div>
            <div className="field"><label htmlFor="msg">Message to customer <span className="opt">(shown on their order page)</span></label>
              <textarea id="msg" name="message" style={{ minHeight: 90 }} placeholder="e.g. The supplier price has increased by ₦5,000. Reply to approve, or we will refund you in full." /></div>
            <label className="check"><input type="checkbox" name="notify" defaultChecked /> Email the customer</label>
            <p className="hint">Use <strong>On hold</strong> when the supplier price or availability changed — the customer can approve or ask for a refund on their order page. Never charge extra without approval.</p>
            <button className="btn btn-primary btn-sm" type="submit" style={{ marginTop: 10 }}>Update status</button>
          </form>

          <form action={orderMessageAction} className="card">
            <input type="hidden" name="id" value={o.id} />
            <h2 className="h-small">Message the customer</h2>
            <div className="field"><label htmlFor="cm" className="sr-only">Message</label><textarea id="cm" name="message" style={{ minHeight: 80 }} /></div>
            <button className="btn btn-outline btn-sm" type="submit">Send message</button>
          </form>

          <form action={orderNoteAction} className="card">
            <input type="hidden" name="id" value={o.id} />
            <h2 className="h-small">Internal note</h2>
            <div className="field"><label htmlFor="nt" className="sr-only">Note</label><textarea id="nt" name="note" style={{ minHeight: 70 }} /></div>
            <button className="btn btn-outline btn-sm" type="submit">Save note</button>
          </form>

          <form action={refundAction} className="card danger-zone">
            <input type="hidden" name="id" value={o.id} />
            <h2 className="h-small">Refund</h2>
            {refunds.length > 0 && <ul className="small">{refunds.map((r) => <li key={String(r.id)}>{formatDate(String(r.created_at))}: {nairaFromKobo(String(r.amount_kobo))} — {String(r.method)} ({String(r.status)})</li>)}</ul>}
            <div className="field"><label htmlFor="ra">Amount (₦)</label><input id="ra" name="amount" inputMode="decimal" defaultValue={String(paid / 100)} /></div>
            <div className="field"><label htmlFor="rm">Method</label>
              <select id="rm" name="method" defaultValue="paystack"><option value="paystack">Refund through Paystack (sends money back)</option><option value="manual">Record a refund made another way</option></select></div>
            <div className="field"><label htmlFor="rr">Reason</label><input id="rr" name="reason" /></div>
            <label className="check"><input type="checkbox" name="notify" defaultChecked /> Email the customer</label>
            <label className="check"><input type="checkbox" name="confirm" value="yes" /> I confirm this refund</label>
            <button className="btn btn-danger btn-sm" type="submit" style={{ marginTop: 10 }} disabled={!["paid", "partially_refunded"].includes(o.payment_status)}>Record refund</button>
          </form>
        </div>
      </div>
    </>
  );
}
