import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-session";
import ProductImage from "@/components/shop/ProductImage";
import {
  MANUAL_METHODS, getOrderById, getQuotes, manualPayments, orderEvents, orderItems, orderPayments, orderRefunds, paymentsAvailability, transitionContext,
} from "@/lib/shop/orders";
import { ORDER_STATUS_LABEL, SOURCING_LABEL, SOURCING_STATUSES, formatDate, nairaFromKobo, type OrderStatus } from "@/lib/shop/format";
import { PAID_STATUSES, QUOTE_STATUS_LABEL, allowedNextStatuses, fulfilmentGaps, isQuoteExpired } from "@/lib/shop/workflow";
import {
  adminDecisionAction, completeRefundAction, itemSourcingAction, manualPaymentAction, nextActionAction, orderMessageAction, orderNoteAction, orderStatusAction,
  paymentInstructionsAction, recheckPaymentAction, refundAction, saveQuoteAction, sendQuoteAction,
} from "../../shop-actions";

export const metadata = { title: "Order" };
const n2 = (kobo: string | number) => String(Number(kobo) / 100);
const dateIn = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

export default async function AdminOrder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const o = await getOrderById(id);
  if (!o) notFound();
  const [items, events, payments, refunds, quotes, manual, ctx] = await Promise.all([
    orderItems(id), orderEvents(id, false), orderPayments(id), orderRefunds(id), getQuotes(id), manualPayments(id), transitionContext(o),
  ]);
  const status = o.status as OrderStatus;
  const next = allowedNextStatuses(status, ctx);
  const paid = (PAID_STATUSES as string[]).includes(status) || o.payment_status === "paid";
  const draft = quotes.find((q) => q.status === "draft");
  const sent = quotes.find((q) => q.status === "sent");
  const accepted = quotes.find((q) => q.id === o.accepted_quote_id);
  const base = draft ?? sent ?? accepted ?? quotes[0];
  const canQuote = !paid && !["cancelled", "refunded"].includes(status);
  const net = Number(o.total_kobo) - Number(o.refunded_kobo);
  const pay = paymentsAvailability();
  const quoteCost = accepted ? accepted.lines.reduce((a, l) => a + Number(l.cost_kobo), 0) : null;

  return (
    <>
      <p><Link href="/admin/orders">← Orders</Link></p>
      <h1 style={{ fontSize: "1.7rem" }}>Request {o.number} <span className={`status-pill ${status}`} style={{ verticalAlign: "middle" }}>{ORDER_STATUS_LABEL[status] ?? status}</span>
        {o.payment_mode === "test" && paid && <span className="flag warn" style={{ marginLeft: 8, verticalAlign: "middle" }}>TEST PAYMENT</span>}</h1>
      <p className="muted small">Received {formatDate(o.created_at, true)} · Country: <strong>{o.country || "—"}</strong> · Payment: {o.payment_status.replace(/_/g, " ")}</p>
      {sp.ok && <div className="alert ok" role="status"><p>{sp.ok}</p></div>}
      {sp.err && <div className="alert bad" role="alert"><p>{sp.err}</p></div>}

      <form action={nextActionAction} className="card" style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
        <input type="hidden" name="id" value={o.id} />
        <div className="field" style={{ flex: "1 1 300px", margin: 0 }}><label htmlFor="na">Next action (internal)</label><input id="na" name="next_action" defaultValue={o.next_action} placeholder="e.g. Ask supplier X for a GBP quote by Friday" /></div>
        <button className="btn btn-outline btn-sm" type="submit">Save</button>
      </form>

      <div className="split wide-left" style={{ alignItems: "start", gap: 24 }}>
        <div>
          <section className="card" aria-labelledby="cust-h" style={{ marginBottom: 16 }}>
            <h2 id="cust-h" className="h-small">Customer</h2>
            <dl className="details">
              <dt>Name</dt><dd>{String(o.name)}{o.company ? ` — ${String(o.company)}` : ""}</dd>
              <dt>Email</dt><dd><a href={`mailto:${o.email}?subject=${encodeURIComponent(`Your request ${o.number}`)}`}>{o.email}</a></dd>
              <dt>Phone</dt><dd>{String(o.phone || "—")}</dd>
              <dt>Country</dt><dd>{o.country || "—"}</dd>
              {Boolean(o.address || o.city) && (<><dt>Address (older order)</dt><dd>{[o.address, o.city, o.state].filter(Boolean).map(String).join(", ")}</dd></>)}
              <dt>Customer notes</dt><dd style={{ whiteSpace: "pre-line" }}>{String(o.notes || "—")}</dd>
              <dt>Account</dt><dd>{o.customer_id ? "Registered customer" : "Guest"}</dd>
              <dt>Indicative total</dt><dd>{nairaFromKobo(o.indicative_total_kobo ?? o.subtotal_kobo)} <span className="muted small">(catalogue estimate, not a price promise)</span></dd>
            </dl>
          </section>

          {/* ---------------- Quotation ---------------- */}
          <section className="card" id="quote" aria-labelledby="q-h" style={{ marginBottom: 16 }}>
            <h2 id="q-h" className="h-small">Quotation</h2>
            {quotes.length > 0 && (
              <ul className="small" style={{ marginTop: 0 }}>
                {quotes.map((q) => (
                  <li key={q.id}>v{q.version}: <strong>{QUOTE_STATUS_LABEL[q.status] ?? q.status}</strong> — {nairaFromKobo(q.total_kobo)}
                    {q.sent_at ? ` · sent ${formatDate(q.sent_at, true)}` : ""}{q.expires_at ? ` · ${q.status === "sent" && isQuoteExpired(q.expires_at) ? "EXPIRED" : "expires"} ${formatDate(q.expires_at, true)}` : ""}
                    {q.decided_at ? ` · decided ${formatDate(q.decided_at, true)} by ${q.decided_by}` : ""}{q.decision_note ? ` (“${q.decision_note}”)` : ""}</li>
                ))}
              </ul>
            )}
            {accepted && (
              <p className="small"><strong>Accepted v{accepted.version}: {nairaFromKobo(accepted.total_kobo)}.</strong> An accepted quotation is never edited. {paid ? "The order is paid, so the quotation is locked." : "To change the price, save and send a revised quotation — the customer must accept it again."}</p>
            )}

            {sent && !paid && (
              <form action={adminDecisionAction} className="item-block">
                <input type="hidden" name="id" value={o.id} /><input type="hidden" name="quote_id" value={sent.id} />
                <p className="small mb-0"><strong>v{sent.version} is with the customer.</strong> They accept or decline on their request page. If they replied another way, record it here:</p>
                <div className="field"><label htmlFor="dn">How the customer decided</label><input id="dn" name="note" placeholder="e.g. Customer accepted by email on 22 Oct" /></div>
                <div className="actions" style={{ marginTop: 0 }}>
                  <button className="btn btn-outline btn-sm" type="submit" name="decision" value="accept">Record acceptance</button>
                  <button className="btn btn-outline btn-sm" type="submit" name="decision" value="decline">Record decline</button>
                </div>
              </form>
            )}

            {canQuote ? (
              <form action={saveQuoteAction}>
                <input type="hidden" name="id" value={o.id} /><input type="hidden" name="line_count" value={items.length} />
                <p className="small">{draft ? `Editing draft v${draft.version}.` : quotes.length ? "Start a revised quotation (pre-filled from the latest version)." : "Record the supplier quotation for each item. The selling price is calculated: (unit cost × quantity × exchange rate) + fees + taxes + delivery, plus your margin, rounded up to the next naira."}</p>
                {items.map((it, i) => {
                  const l = base?.lines.find((x) => x.order_item_id === it.id);
                  return (
                    <fieldset key={it.id} className="item-block">
                      <legend><strong>{it.product_name}</strong> <span className="muted small">{it.sku}{it.option_value ? ` · ${it.option_label}: ${it.option_value}` : ""} · indicative {nairaFromKobo(it.line_total_kobo)}</span></legend>
                      <input type="hidden" name={`l${i}_item`} value={it.id} />
                      <label className="check small"><input type="checkbox" name={`l${i}_include`} defaultChecked={!base || Boolean(l)} /> Include in quotation</label>
                      <div className="admin-grid">
                        <div className="field"><label htmlFor={`q${i}`}>Quantity</label><input id={`q${i}`} name={`l${i}_qty`} inputMode="numeric" defaultValue={l?.quantity ?? it.quantity} /></div>
                        <div className="field"><label htmlFor={`s${i}`}>Supplier (internal)</label><input id={`s${i}`} name={`l${i}_supplier`} defaultValue={l?.supplier_name ?? it.supplier_name} /></div>
                        <div className="field"><label htmlFor={`c${i}`}>Supplier currency</label><input id={`c${i}`} name={`l${i}_currency`} maxLength={3} defaultValue={l?.supplier_currency ?? "USD"} style={{ textTransform: "uppercase" }} /></div>
                        <div className="field"><label htmlFor={`u${i}`}>Supplier unit cost</label><input id={`u${i}`} name={`l${i}_cost`} inputMode="decimal" defaultValue={l ? String(Number(l.supplier_unit_cost)) : ""} /></div>
                        <div className="field"><label htmlFor={`x${i}`}>Exchange rate (₦ per 1 unit)</label><input id={`x${i}`} name={`l${i}_fx`} inputMode="decimal" defaultValue={l ? String(Number(l.fx_rate)) : ""} /><p className="hint">Use 1 for NGN. Record the rate you will actually pay.</p></div>
                        <div className="field"><label htmlFor={`f${i}`}>Fees (₦, line)</label><input id={`f${i}`} name={`l${i}_fees`} inputMode="decimal" defaultValue={l ? n2(l.fees_kobo) : "0"} /></div>
                        <div className="field"><label htmlFor={`t${i}`}>Taxes (₦, line)</label><input id={`t${i}`} name={`l${i}_taxes`} inputMode="decimal" defaultValue={l ? n2(l.taxes_kobo) : "0"} /></div>
                        <div className="field"><label htmlFor={`d${i}`}>Delivery cost (₦, line)</label><input id={`d${i}`} name={`l${i}_delivery`} inputMode="decimal" defaultValue={l ? n2(l.delivery_kobo) : "0"} /></div>
                        <div className="field"><label htmlFor={`mt${i}`}>Margin type</label><select id={`mt${i}`} name={`l${i}_mtype`} defaultValue={l?.margin_type ?? "percent"}><option value="percent">Percentage of cost</option><option value="fixed">Fixed ₦ amount</option></select></div>
                        <div className="field"><label htmlFor={`m${i}`}>Margin</label><input id={`m${i}`} name={`l${i}_margin`} inputMode="decimal" defaultValue={l ? String(Number(l.margin_value)) : ""} /></div>
                      </div>
                      <div className="field"><label htmlFor={`n${i}`}>Supplier quote notes (internal)</label><input id={`n${i}`} name={`l${i}_note`} defaultValue={l?.internal_note ?? ""} placeholder="e.g. Quote ref, contact, validity" /></div>
                      {l && <p className="small mb-0">Calculated: cost {nairaFromKobo(l.cost_kobo)} → <strong>price {nairaFromKobo(l.price_kobo)}</strong> (margin {nairaFromKobo(Number(l.price_kobo) - Number(l.cost_kobo))})</p>}
                    </fieldset>
                  );
                })}
                <div className="admin-grid">
                  <div className="field"><label htmlFor="qe">Quotation valid until</label><input id="qe" name="expires_at" type="date" defaultValue={base?.expires_at && !isQuoteExpired(base.expires_at) ? base.expires_at.slice(0, 10) : dateIn(3)} /></div>
                  <div className="field"><label htmlFor="qd">Delivery estimate (shown to customer)</label><input id="qd" name="delivery_estimate" defaultValue={base?.delivery_estimate ?? ""} placeholder="Only what the supplier has confirmed" /></div>
                </div>
                <div className="field"><label htmlFor="ql">Licence / subscription terms (shown to customer)</label><input id="ql" name="licence_terms" defaultValue={base?.licence_terms ?? ""} placeholder="e.g. 12-month subscription, 1 user, eligible for Nigeria" /></div>
                <div className="field"><label htmlFor="qc">Note to customer</label><textarea id="qc" name="customer_note" defaultValue={base?.customer_note ?? ""} style={{ minHeight: 60 }} /></div>
                <div className="field"><label htmlFor="qi">Internal note</label><textarea id="qi" name="internal_note" defaultValue={base?.internal_note ?? ""} style={{ minHeight: 60 }} /></div>
                <label className="check small"><input type="checkbox" name="price_checked" defaultChecked={draft?.price_checked} /> I have checked this price against the supplier&apos;s current quotation.</label>
                <label className="check small"><input type="checkbox" name="country_suitable" defaultChecked={draft?.country_suitable} /> The product, licence and price are suitable for the customer&apos;s country ({o.country || "not given"}).</label>
                <button className="btn btn-primary btn-sm" type="submit" style={{ marginTop: 10 }}>Save draft and calculate</button>
              </form>
            ) : <p className="small muted">Quotations cannot be changed for a paid or closed order.</p>}

            {draft && canQuote && (
              <form action={sendQuoteAction} className="item-block" style={{ marginTop: 14 }}>
                <input type="hidden" name="id" value={o.id} /><input type="hidden" name="quote_id" value={draft.id} />
                <p className="mb-0"><strong>Draft v{draft.version} total: {nairaFromKobo(draft.total_kobo)}</strong>{draft.expires_at ? ` · valid until ${formatDate(draft.expires_at)}` : ""}</p>
                {(!draft.price_checked || !draft.country_suitable) && <p className="err small">Tick both confirmations and save before sending.</p>}
                {(sent || accepted) && <p className="small">Sending this replaces v{(sent ?? accepted)!.version}. {accepted ? "The customer must accept again before paying." : ""}</p>}
                <label className="check small"><input type="checkbox" name="notify" defaultChecked /> Email the quotation to the customer</label>
                <label className="check small"><input type="checkbox" name="confirm" /> I confirm this quotation is correct and can be sent.</label>
                <button className="btn btn-primary btn-sm" type="submit" style={{ marginTop: 8 }}>Send quotation</button>
              </form>
            )}
          </section>

          {/* ---------------- Items / fulfilment ---------------- */}
          <h2 className="h-small" id="items">Items — sourcing &amp; fulfilment record</h2>
          {items.map((i) => {
            const gaps = fulfilmentGaps(i);
            return (
              <form key={i.id} action={itemSourcingAction} className="item-block">
                <input type="hidden" name="order_id" value={o.id} /><input type="hidden" name="item_id" value={i.id} />
                <div className="item-head">
                  <ProductImage src={i.image_url} alt="" className="admin-thumb" />
                  <div>
                    <strong>{i.product_name}</strong> <span className="muted small">{i.sku}</span>
                    <div className="small">Qty {i.quantity} · indicative {nairaFromKobo(i.unit_price_kobo)} {i.billing_label}</div>
                    {i.option_value && <div className="small"><strong>{i.option_label || "Option"}:</strong> {i.option_value}</div>}
                    <div className="small muted"><Link href={`/products/${i.product_slug}`} target="_blank">Product page</Link></div>
                  </div>
                  <div style={{ textAlign: "right" }}>{gaps.length === 0 ? <span className="flag good">record complete</span> : <span className="muted small">{gaps.length} item(s) to record before fulfilment</span>}</div>
                </div>
                <div className="admin-grid">
                  <div className="field"><label htmlFor={`ss-${i.id}`}>Sourcing status</label>
                    <select id={`ss-${i.id}`} name="sourcing_status" defaultValue={i.sourcing_status}>{SOURCING_STATUSES.map((s) => <option key={s} value={s}>{SOURCING_LABEL[s]}</option>)}</select></div>
                  <div className="field"><label htmlFor={`sn-${i.id}`}>Supplier / sourcing channel</label><input id={`sn-${i.id}`} name="supplier_name" defaultValue={i.supplier_name} /></div>
                  <div className="field"><label htmlFor={`su-${i.id}`}>Supplier link</label><input id={`su-${i.id}`} name="supplier_url" type="url" defaultValue={i.supplier_url} placeholder="https://" />
                    {i.supplier_url && <p className="hint"><a href={i.supplier_url} target="_blank" rel="noopener noreferrer">Open supplier link</a></p>}</div>
                  <div className="field"><label htmlFor={`sa-${i.id}`}>Supplier availability</label><input id={`sa-${i.id}`} name="supplier_availability" defaultValue={i.supplier_availability} placeholder="As stated by the supplier" /></div>
                  <div className="field"><label htmlFor={`sp-${i.id}`}>Supplier price (as quoted)</label><input id={`sp-${i.id}`} name="supplier_price_text" defaultValue={i.supplier_price_text} placeholder="e.g. US$99.99" /></div>
                  <div className="field"><label htmlFor={`sc-${i.id}`}>Actual sourcing cost (₦, line)</label><input id={`sc-${i.id}`} name="sourcing_cost_naira" inputMode="decimal" defaultValue={i.sourcing_cost_kobo == null ? "" : n2(i.sourcing_cost_kobo)} /></div>
                  <div className="field"><label htmlFor={`lt-${i.id}`}>Licence / subscription type</label><input id={`lt-${i.id}`} name="licence_type" defaultValue={i.licence_type} placeholder="e.g. 1-year subscription, 5 devices" /></div>
                  <div className="field"><label htmlFor={`re-${i.id}`}>Region eligibility</label>
                    <select id={`re-${i.id}`} name="region_eligibility" defaultValue={i.region_eligibility}><option value="not_confirmed">Not confirmed</option><option value="confirmed">Confirmed for customer&apos;s country</option></select></div>
                  <div className="field"><label htmlFor={`rn-${i.id}`}>Region notes</label><input id={`rn-${i.id}`} name="region_notes" defaultValue={i.region_notes} /></div>
                  <div className="field"><label htmlFor={`se-${i.id}`}>Supplier delivery time (as stated)</label><input id={`se-${i.id}`} name="supplier_eta" defaultValue={i.supplier_eta} /></div>
                  <div className="field"><label htmlFor={`ed-${i.id}`}>Expected fulfilment date (only if confirmed)</label><input id={`ed-${i.id}`} name="expected_delivery" type="date" defaultValue={i.expected_delivery ? String(i.expected_delivery).slice(0, 10) : ""} /></div>
                  <div className="field"><label htmlFor={`af-${i.id}`}>Actual fulfilment date</label><input id={`af-${i.id}`} name="actual_fulfilment_date" type="date" defaultValue={i.actual_fulfilment_date ? String(i.actual_fulfilment_date).slice(0, 10) : ""} /></div>
                  <div className="field"><label htmlFor={`dm-${i.id}`}>Delivery method</label><input id={`dm-${i.id}`} name="delivery_method" defaultValue={i.delivery_method} placeholder="e.g. Invitation to customer's email" /></div>
                  <div className="field"><label htmlFor={`tr-${i.id}`}>Supplier order reference</label><input id={`tr-${i.id}`} name="tracking" defaultValue={i.tracking} /></div>
                </div>
                <div className="field"><label htmlFor={`ev-${i.id}`}>Supply arrangement evidence / notes (internal)</label><textarea id={`ev-${i.id}`} name="supply_evidence" defaultValue={i.supply_evidence} style={{ minHeight: 60 }} placeholder="e.g. Supplier invoice no., order confirmation email date" /></div>
                <div className="field"><label htmlFor={`fn-${i.id}`}>Fulfilment notes (internal)</label><textarea id={`fn-${i.id}`} name="fulfilment_notes" defaultValue={i.fulfilment_notes} style={{ minHeight: 60 }} /></div>
                <div className="field"><label htmlFor={`dd-${i.id}`}>Instructions for the customer</label>
                  <textarea id={`dd-${i.id}`} name="delivery_details" defaultValue={i.delivery_details} style={{ minHeight: 60 }} placeholder="Shown to the customer when this item is Delivered. Only genuine details received from the supplier — never invented keys." /></div>
                {gaps.length > 0 && <p className="hint">Before Delivered: {gaps.join(", ")}.</p>}
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
                  <p style={{ whiteSpace: "pre-line" }}>{String(e.message)}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="stack">
          <section className="card" id="payment" aria-labelledby="money-h">
            <h2 id="money-h" className="h-small">Payment</h2>
            <dl className="sum">
              <dt>{accepted ? "Accepted total" : "Quoted total"}</dt><dd>{accepted || sent ? nairaFromKobo(o.total_kobo) : "No quotation yet"}</dd>
              <dt>Payment</dt><dd>{o.payment_status.replace(/_/g, " ")}{o.paid_at ? ` (${formatDate(o.paid_at)})` : ""}</dd>
              <dt>Refunded</dt><dd>{nairaFromKobo(o.refunded_kobo)}</dd>
              {quoteCost != null && (<><dt>Quoted cost</dt><dd>{nairaFromKobo(quoteCost)}</dd><dt className="total">Margin</dt><dd className="total">{nairaFromKobo(net - quoteCost)}</dd></>)}
            </dl>
            <p className="muted small">Online payment: {pay.ok ? `available (${pay.mode} mode)` : pay.reason}</p>
            {o.payment_reference && <p className="muted small">Paystack reference: {o.payment_reference}</p>}
            {o.payment_reference && <form action={recheckPaymentAction}><input type="hidden" name="id" value={o.id} /><button className="btn btn-outline btn-sm" type="submit">Re-check payment with Paystack</button></form>}
            {status === "awaiting_payment" && accepted && (
              <>
                <form action={paymentInstructionsAction} style={{ marginTop: 12 }}>
                  <input type="hidden" name="id" value={o.id} />
                  <div className="field"><label htmlFor="pi">Send payment instructions</label><textarea id="pi" name="instructions" style={{ minHeight: 80 }} placeholder={`Company bank account details and the reference to use (${o.number}).`} /></div>
                  <button className="btn btn-outline btn-sm" type="submit">Send instructions</button>
                </form>
                <form action={manualPaymentAction} className="item-block" style={{ marginTop: 12 }}>
                  <input type="hidden" name="id" value={o.id} />
                  <h3 className="h-small" style={{ fontSize: "1rem" }}>Record a payment received</h3>
                  <div className="field"><label htmlFor="mpm">Method</label><select id="mpm" name="method">{MANUAL_METHODS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}</select></div>
                  <div className="field"><label htmlFor="mpr">Payment reference</label><input id="mpr" name="reference" placeholder="Bank transfer reference" /></div>
                  <div className="field"><label htmlFor="mpa">Amount received (₦)</label><input id="mpa" name="amount" inputMode="decimal" /><p className="hint">Must equal {nairaFromKobo(o.total_kobo)}.</p></div>
                  <div className="field"><label htmlFor="mpd">Date received</label><input id="mpd" name="paid_on" type="date" /></div>
                  <div className="field"><label htmlFor="mpn">Evidence / note</label><input id="mpn" name="note" placeholder="e.g. Seen in company account statement" /></div>
                  <label className="check small"><input type="checkbox" name="confirm" /> I confirm this money has arrived in the company account.</label>
                  <button className="btn btn-primary btn-sm" type="submit" style={{ marginTop: 8 }}>Record payment</button>
                </form>
              </>
            )}
            {(payments.length > 0 || manual.length > 0) && (
              <details style={{ marginTop: 12 }}><summary className="small">Payment records ({payments.length + manual.length})</summary>
                <ul className="small">
                  {payments.map((p) => <li key={String(p.id)}>{formatDate(String(p.created_at), true)} — Paystack {String(p.kind)}: {String(p.status)} {p.amount_kobo ? nairaFromKobo(String(p.amount_kobo)) : ""} {String(p.currency ?? "")} {String(p.detail ?? "")}</li>)}
                  {manual.map((p) => <li key={String(p.id)}>{String(p.paid_on)} — {String(p.method)} {nairaFromKobo(String(p.amount_kobo))}, ref {String(p.reference)} {String(p.note ?? "")}</li>)}
                </ul>
              </details>
            )}
          </section>

          <form action={orderStatusAction} className="card">
            <input type="hidden" name="id" value={o.id} />
            <h2 className="h-small">Update status</h2>
            {next.length ? (
              <>
                <div className="field"><label htmlFor="st">Move to</label>
                  <select id="st" name="status" defaultValue="">{[<option key="" value="" disabled>Choose…</option>, ...next.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)]}</select></div>
                <div className="field"><label htmlFor="msg">Message to customer <span className="opt">(shown on their request page)</span></label>
                  <textarea id="msg" name="message" style={{ minHeight: 80 }} /></div>
                <label className="check"><input type="checkbox" name="notify" defaultChecked /> Email the customer</label>
                <button className="btn btn-primary btn-sm" type="submit" style={{ marginTop: 10 }}>Update status</button>
              </>
            ) : <p className="small muted">No manual status change is available from “{ORDER_STATUS_LABEL[status]}”.</p>}
            <p className="hint">Quote sent / Awaiting payment / Payment confirmed / Refunded are set automatically by sending a quotation, the customer&apos;s acceptance, a verified payment, and recorded refunds. “Fulfilled” needs a complete record for every item.</p>
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

          {(o.payment_status === "paid" || o.payment_status === "partially_refunded" || refunds.length > 0) && (
            <form action={refundAction} className="card danger-zone">
              <input type="hidden" name="id" value={o.id} />
              <h2 className="h-small">Refund</h2>
              {refunds.length > 0 && <ul className="small">{refunds.map((r) => <li key={String(r.id)}>{formatDate(String(r.created_at))}: {nairaFromKobo(String(r.amount_kobo))} — {String(r.method)} ({String(r.status)})</li>)}</ul>}
              <div className="field"><label htmlFor="ra">Amount (₦)</label><input id="ra" name="amount" inputMode="decimal" defaultValue={n2(net)} /></div>
              <div className="field"><label htmlFor="rm">Method</label>
                <select id="rm" name="method" defaultValue={o.payment_reference ? "paystack" : "manual"}><option value="paystack">Refund through Paystack (sends money back)</option><option value="manual">Record a refund made another way</option></select></div>
              <div className="field"><label htmlFor="rr">Reason</label><input id="rr" name="reason" /></div>
              <label className="check"><input type="checkbox" name="notify" defaultChecked /> Email the customer</label>
              <label className="check"><input type="checkbox" name="confirm" value="yes" /> I confirm this refund</label>
              <button className="btn btn-danger btn-sm" type="submit" style={{ marginTop: 10 }} disabled={!["paid", "partially_refunded"].includes(o.payment_status)}>Record refund</button>
            </form>
          )}
          {status === "refund_pending" && Number(o.refunded_kobo) >= Number(o.total_kobo) && (
            <form action={completeRefundAction} className="card">
              <input type="hidden" name="id" value={o.id} />
              <p className="small">The full amount has been refunded. Mark the order Refunded once the refund has reached the customer.</p>
              <label className="check small"><input type="checkbox" name="notify" defaultChecked /> Email the customer</label>
              <button className="btn btn-primary btn-sm" type="submit">Mark refunded</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
