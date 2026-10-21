"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useCart } from "./cart-store";
import { isPaymentUrl } from "./payment-url";
import { ngn, useQuote } from "./useQuote";
import { normalizeCheckout, validateCheckout, type CheckoutErrors, type CheckoutInput } from "@/lib/shop/checkout-validate";

type Props = { mode: "test" | "live" | "off"; prefill: { name: string; email: string; phone: string } | null };

export default function CheckoutForm({ mode, prefill }: Props) {
  const items = useCart();
  const { quote, error: quoteError } = useQuote(items);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [status, setStatus] = useState<{ kind: "idle" | "sending" | "redirecting" } | { kind: "error"; message: string }>({ kind: "idle" });
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  if (!items.length) return <div className="empty"><p><strong>Your cart is empty.</strong></p><Link className="btn btn-primary" href="/products">Browse products</Link></div>;
  if (quoteError) return <div className="alert bad" role="alert"><p>{quoteError}</p></div>;
  if (!quote) return <p className="muted" role="status">Loading your order…</p>;
  const blocked = quote.lines.filter((l) => !l.purchasable);
  const missing = quote.lines.filter((l) => l.optionRequired && !(items.find((i) => i.slug === l.slug)?.option ?? "").trim());
  if (blocked.length || missing.length) {
    return <div className="alert bad" role="alert"><p>Your cart needs attention before checkout. <Link href="/cart">Return to your cart</Link>.</p></div>;
  }

  const a = (k: keyof CheckoutInput) => ({ "aria-invalid": errors[k] ? (true as const) : undefined, "aria-describedby": errors[k] ? `${k}-err` : undefined });
  const E = (k: keyof CheckoutInput) => (errors[k] ? <p className="err" id={`${k}-err`}>{errors[k]}</p> : null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status.kind === "sending" || status.kind === "redirecting") return;
    const fd = Object.fromEntries(new FormData(e.currentTarget));
    const input = normalizeCheckout({ ...fd, acceptTerms: fd.acceptTerms === "on" });
    const errs = validateCheckout(input);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setStatus({ kind: "error", message: "Please correct the highlighted fields." });
      formRef.current?.querySelector<HTMLElement>(`[name="${Object.keys(errs)[0]}"]`)?.focus();
      return;
    }
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer: input, items }) });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.ok && isPaymentUrl(j.authorizationUrl)) {
        setStatus({ kind: "redirecting" });
        window.location.assign(j.authorizationUrl);
        return;
      }
      if (j.errors) setErrors(j.errors);
      setStatus({ kind: "error", message: j.error ?? "Checkout failed. Nothing was charged. Please try again." });
      alertRef.current?.focus();
    } catch {
      setStatus({ kind: "error", message: "Network problem. Nothing was charged. Please check your connection and try again." });
      alertRef.current?.focus();
    }
  }

  const busy = status.kind === "sending" || status.kind === "redirecting";
  return (
    <div className="cart-layout">
      <form ref={formRef} className="form-card" onSubmit={submit} noValidate aria-busy={busy}>
        <div ref={alertRef} tabIndex={-1} role="alert">{status.kind === "error" && <div className="alert bad"><p>{status.message}</p></div>}</div>
        {mode === "test" && <div className="note" role="note"><p><strong>Test mode.</strong> Payments use Paystack test keys — no real money is charged and orders placed now are test orders.</p></div>}
        {mode === "off" && <div className="alert bad"><p>Online payment is not set up yet, so orders cannot be placed. Please <Link href="/contact">contact us</Link>.</p></div>}
        <h2 className="h-small">Your details</h2>
        <div className="field-row">
          <div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" defaultValue={prefill?.name} required {...a("name")} />{E("name")}</div>
          <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" defaultValue={prefill?.email} required {...a("email")} />{E("email")}<p className="hint">Order updates and activation details are sent here.</p></div>
        </div>
        <div className="field-row">
          <div className="field"><label htmlFor="phone">Phone number</label><input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={prefill?.phone} required {...a("phone")} />{E("phone")}</div>
          <div className="field"><label htmlFor="company">Company <span className="opt">(optional)</span></label><input id="company" name="company" autoComplete="organization" /></div>
        </div>
        <h2 className="h-small" style={{ marginTop: 8 }}>Billing address</h2>
        <div className="field"><label htmlFor="address">Street address</label><input id="address" name="address" autoComplete="street-address" required {...a("address")} />{E("address")}</div>
        <div className="field-row">
          <div className="field"><label htmlFor="city">City</label><input id="city" name="city" autoComplete="address-level2" required {...a("city")} />{E("city")}</div>
          <div className="field"><label htmlFor="state">State / region <span className="opt">(optional)</span></label><input id="state" name="state" autoComplete="address-level1" /></div>
        </div>
        <div className="field"><label htmlFor="country">Country</label><input id="country" name="country" autoComplete="country-name" defaultValue="Nigeria" required {...a("country")} />{E("country")}</div>
        <div className="field"><label htmlFor="notes">Order notes <span className="opt">(optional)</span></label><textarea id="notes" name="notes" maxLength={1000} style={{ minHeight: 90 }} placeholder="For example, the account email the subscription should be activated on." /></div>
        <label className="check" style={{ alignItems: "flex-start" }}>
          <input type="checkbox" name="acceptTerms" {...a("acceptTerms")} />
          <span>I agree to the <Link href="/terms" target="_blank">Terms of Use</Link> and the <Link href="/refund-policy" target="_blank">Refund &amp; Delivery Policy</Link>, and I understand these products are supplied manually after payment.</span>
        </label>
        {E("acceptTerms")}
        <div className="form-foot" style={{ marginTop: 18 }}>
          <button className="btn btn-primary" type="submit" disabled={busy || mode === "off"}>
            {status.kind === "sending" ? <><span className="spinner" aria-hidden="true" /> Creating order…</> : status.kind === "redirecting" ? "Redirecting to Paystack…" : `Pay ${ngn(quote.totalNgn)} with Paystack`}
          </button>
          <p>You will be taken to Paystack&apos;s secure page. We never see or store your card details.</p>
        </div>
      </form>
      <aside className="card cart-summary" aria-label="Order summary">
        <h2 className="h-small">Order summary</h2>
        <ul className="sum-lines">
          {quote.lines.map((l) => (
            <li key={l.slug}><span>{l.name}{l.quantity > 1 ? ` × ${l.quantity}` : ""}<br /><span className="muted small">{l.billingLabel}{l.option ? ` · ${l.optionLabel.replace(/\?$/, "")}: ${l.option}` : ""}</span></span><strong>{ngn(l.lineTotalNgn)}</strong></li>
          ))}
        </ul>
        <dl className="sum"><dt className="total">Total</dt><dd className="total">{ngn(quote.totalNgn)}</dd></dl>
        <p className="muted small">The final amount is calculated by our server from current catalogue prices.</p>
        <Link href="/cart" className="small">Edit cart</Link>
      </aside>
    </div>
  );
}
