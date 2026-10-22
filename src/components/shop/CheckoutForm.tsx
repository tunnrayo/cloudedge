"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { cart, useCart } from "./cart-store";
import { ngn, useQuote } from "./useQuote";
import { SOURCING_DISCLAIMER } from "./ShopNotice";
import { normalizeCheckout, validateCheckout, type CheckoutErrors, type CheckoutInput } from "@/lib/shop/checkout-validate";

type Props = { prefill: { name: string; email: string; phone: string } | null };

const newRequestId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "") : `${Date.now()}${Math.random().toString(36).slice(2)}`).slice(0, 40);

/**
 * Sourcing request form: Step 1 details → Step 2 review → Submit request.
 * No payment is taken. A per-form request id makes repeated clicks/resubmits safe (one request only).
 */
export default function CheckoutForm({ prefill }: Props) {
  const items = useCart();
  const { quote, error: quoteError } = useQuote(items);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [step, setStep] = useState<"details" | "review">("details");
  const [input, setInput] = useState<CheckoutInput | null>(null);
  const [status, setStatus] = useState<{ kind: "idle" | "sending" | "done" } | { kind: "error"; message: string }>({ kind: "idle" });
  const [done, setDone] = useState<{ number: string; url: string | null } | null>(null);
  const [requestId] = useState(newRequestId);
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  if (done) {
    return (
      <div className="alert ok" role="status">
        <p><strong>Request received — reference {done.number}.</strong> This is not an order confirmation and nothing was charged. We will email you a quotation after checking availability.</p>
        {done.url ? <p style={{ marginTop: 10 }}><Link className="btn btn-primary btn-sm" href={done.url}>View your request</Link></p> : <p>Use the link in your acknowledgement email to view it.</p>}
      </div>
    );
  }
  if (!items.length) return <div className="empty"><p><strong>Your request list is empty.</strong></p><Link className="btn btn-primary" href="/products">Browse software</Link></div>;
  if (quoteError) return <div className="alert bad" role="alert"><p>{quoteError}</p></div>;
  if (!quote) return <p className="muted" role="status">Loading your request…</p>;
  const blocked = quote.lines.filter((l) => !l.requestable);
  const missing = quote.lines.filter((l) => l.optionRequired && !(items.find((i) => i.slug === l.slug)?.option ?? "").trim());
  if (blocked.length || missing.length) {
    return <div className="alert bad" role="alert"><p>Your request list needs attention first. <Link href="/cart">Return to your request list</Link>.</p></div>;
  }

  const a = (k: keyof CheckoutInput) => ({ "aria-invalid": errors[k] ? (true as const) : undefined, "aria-describedby": errors[k] ? `${k}-err` : undefined });
  const E = (k: keyof CheckoutInput) => (errors[k] ? <p className="err" id={`${k}-err`}>{errors[k]}</p> : null);

  function review(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    const i = normalizeCheckout({ ...fd, acceptTerms: fd.acceptTerms === "on" });
    const errs = validateCheckout(i);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setStatus({ kind: "error", message: "Please correct the highlighted fields." });
      formRef.current?.querySelector<HTMLElement>(`[name="${Object.keys(errs)[0]}"]`)?.focus();
      return;
    }
    setInput(i); setStatus({ kind: "idle" }); setStep("review");
    window.scrollTo({ top: 0 });
  }

  async function submit() {
    if (!input || status.kind === "sending") return;
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer: input, items, requestId }) });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.ok) {
        cart.clear();
        if (typeof j.orderUrl === "string" && j.orderUrl.startsWith("/orders/")) { setStatus({ kind: "done" }); window.location.assign(j.orderUrl); return; }
        setDone({ number: String(j.orderNumber), url: null });
        return;
      }
      if (j.errors) { setErrors(j.errors); setStep("details"); }
      setStatus({ kind: "error", message: j.error ?? "We could not send your request. Nothing was charged. Please try again." });
      alertRef.current?.focus();
    } catch {
      setStatus({ kind: "error", message: "Network problem. Nothing was charged. Please check your connection and try again." });
      alertRef.current?.focus();
    }
  }

  const busy = status.kind === "sending" || status.kind === "done";
  const summary = (
    <aside className="card cart-summary" aria-label="Request summary">
      <h2 className="h-small">Software requested</h2>
      <ul className="sum-lines">
        {quote.lines.map((l) => (
          <li key={l.slug}><span>{l.name}{l.quantity > 1 ? ` × ${l.quantity}` : ""}<br /><span className="muted small">{l.billingLabel}{l.option ? ` · ${l.optionLabel.replace(/\?$/, "")}: ${l.option}` : ""}</span></span><strong>{ngn(l.lineTotalNgn)}</strong></li>
        ))}
      </ul>
      <dl className="sum"><dt className="total">Indicative total</dt><dd className="total">{ngn(quote.indicativeTotalNgn)}</dd><dt>Charged now</dt><dd>₦0</dd></dl>
      <p className="muted small">Indicative only. Your quotation sets the final price.</p>
      <Link href="/cart" className="small">Edit request list</Link>
    </aside>
  );

  return (
    <div className="cart-layout">
      <div>
        <div ref={alertRef} tabIndex={-1} role="alert">{status.kind === "error" && <div className="alert bad"><p>{status.message}</p></div>}</div>
        <ol className="steps-mini muted small" aria-label="Progress" style={{ marginBottom: 14 }}>
          <li aria-current={step === "details" ? "step" : undefined}>{step === "details" ? <strong>Your details</strong> : "Your details"}</li>
          <li aria-current={step === "review" ? "step" : undefined}>{step === "review" ? <strong>Review and submit</strong> : "Review and submit"}</li>
          <li>We confirm availability and send a quotation</li>
          <li>You accept the quotation, then pay</li>
        </ol>

        <form ref={formRef} className="form-card" onSubmit={review} noValidate hidden={step !== "details"}>
          <div className="note" role="note"><p>{SOURCING_DISCLAIMER} Submitting this form does not secure the product and does not charge you.</p></div>
          <h2 className="h-small">Your details</h2>
          <div className="field-row">
            <div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" defaultValue={prefill?.name} required {...a("name")} />{E("name")}</div>
            <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" defaultValue={prefill?.email} required {...a("email")} />{E("email")}<p className="hint">Your acknowledgement and quotation are sent here.</p></div>
          </div>
          <div className="field-row">
            <div className="field"><label htmlFor="country">Country where the software will be used</label><input id="country" name="country" autoComplete="country-name" defaultValue="Nigeria" required {...a("country")} />{E("country")}<p className="hint">Licence eligibility and pricing can depend on your country.</p></div>
            <div className="field"><label htmlFor="phone">Phone number <span className="opt">(optional)</span></label><input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={prefill?.phone} {...a("phone")} />{E("phone")}</div>
          </div>
          <div className="field"><label htmlFor="company">Company <span className="opt">(optional)</span></label><input id="company" name="company" autoComplete="organization" /></div>
          <div className="field"><label htmlFor="notes">Anything we should know <span className="opt">(optional)</span></label><textarea id="notes" name="notes" maxLength={1000} style={{ minHeight: 90 }} placeholder="For example: number of users, the account email for activation, or when you need it." /></div>
          <label className="check" style={{ alignItems: "flex-start" }}>
            <input type="checkbox" name="acceptTerms" {...a("acceptTerms")} />
            <span>I understand this is a request, not an order: the price, availability, licence eligibility and delivery time will be confirmed in a quotation. I agree to the <Link href="/terms" target="_blank">Terms of Use</Link>, <Link href="/privacy" target="_blank">Privacy Policy</Link> and <Link href="/refund-policy" target="_blank">Refund &amp; Delivery Policy</Link>.</span>
          </label>
          {E("acceptTerms")}
          <div className="form-foot" style={{ marginTop: 18 }}>
            <button className="btn btn-primary" type="submit">Review request</button>
          </div>
        </form>

        {step === "review" && input && (
          <div className="form-card">
            <h2 className="h-small">Review your request</h2>
            <dl className="sum">
              <dt>Name</dt><dd>{input.name}</dd>
              <dt>Email</dt><dd style={{ wordBreak: "break-all" }}>{input.email}</dd>
              <dt>Country</dt><dd>{input.country}</dd>
              {input.phone && (<><dt>Phone</dt><dd>{input.phone}</dd></>)}
              {input.company && (<><dt>Company</dt><dd>{input.company}</dd></>)}
              {input.notes && (<><dt>Notes</dt><dd style={{ whiteSpace: "pre-line" }}>{input.notes}</dd></>)}
            </dl>
            <p className="small" style={{ marginTop: 12 }}>When you submit, you receive a reference number and an acknowledgement. Nothing is charged. We will email a quotation with the final price, availability, delivery estimate and payment instructions.</p>
            <div className="actions" style={{ marginTop: 10 }}>
              <button type="button" className="btn btn-primary" onClick={submit} disabled={busy} aria-busy={busy}>
                {busy ? <><span className="spinner" aria-hidden="true" /> Sending request…</> : "Submit request"}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setStep("details")} disabled={busy}>Edit details</button>
            </div>
          </div>
        )}
      </div>
      {summary}
    </div>
  );
}
