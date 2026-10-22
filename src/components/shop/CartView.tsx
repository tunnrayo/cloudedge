"use client";
import Link from "next/link";
import { useEffect } from "react";
import { cart, useCart } from "./cart-store";
import { ngn, useQuote } from "./useQuote";
import ProductImage from "./ProductImage";
import { SOURCING_DISCLAIMER } from "./ShopNotice";

/** The request list ("cart"): products the customer wants us to source and quote. Nothing is charged here. */
export default function CartView() {
  const items = useCart();
  const { quote, error, loading } = useQuote(items);

  useEffect(() => { quote?.removed.forEach((s) => cart.remove(s)); }, [quote]);

  if (!items.length) {
    return (
      <div className="empty">
        <p><strong>Your request list is empty.</strong></p>
        <p>Add the software you need, then send one request for a quotation.</p>
        <Link className="btn btn-primary" href="/products">Browse software</Link>
      </div>
    );
  }
  if (error) return <div className="alert bad" role="alert"><p>{error}</p></div>;
  if (!quote) return <p className="muted" role="status">Loading your request list…</p>;

  const missingOption = quote.lines.filter((l) => l.optionRequired && !(items.find((i) => i.slug === l.slug)?.option ?? "").trim());
  const blocked = quote.lines.filter((l) => !l.requestable);
  const canContinue = !loading && quote.lines.length > 0 && !blocked.length && !missingOption.length;

  return (
    <div className="cart-layout" aria-busy={loading}>
      <ul className="cart-lines">
        {quote.lines.map((l) => {
          const item = items.find((i) => i.slug === l.slug);
          return (
            <li key={l.slug} className="cart-line card">
              <Link href={`/products/${l.slug}`} className="cart-thumb"><ProductImage src={l.image} alt="" /></Link>
              <div className="cart-main">
                <h2 className="h-small"><Link href={`/products/${l.slug}`}>{l.name}</Link></h2>
                <p className="muted small">Indicative {ngn(l.unitPriceNgn)} {l.billingLabel} · {l.sku}</p>
                {l.optionLabel && (
                  <div className="field" style={{ marginTop: 8 }}>
                    <label htmlFor={`o-${l.slug}`} className="small">{l.optionLabel}{!l.optionRequired && <span className="opt"> (optional)</span>}</label>
                    <input id={`o-${l.slug}`} defaultValue={item?.option ?? ""} maxLength={200} onBlur={(e) => cart.setOption(l.slug, e.target.value)}
                      aria-invalid={l.optionRequired && !(item?.option ?? "").trim() ? true : undefined} />
                  </div>
                )}
                {!l.requestable && <p className="err">This product is currently unavailable for new requests. Please remove it, or <Link href={`/quote?product=${l.slug}`}>ask us about alternatives</Link>.</p>}
                <div className="cart-controls">
                  {l.maxQuantity > 1 ? (
                    <div className="qty" aria-label={`${l.quantityLabel} for ${l.name}`}>
                      <button type="button" className="qty-btn" aria-label="Decrease" disabled={l.quantity <= 1} onClick={() => cart.setQuantity(l.slug, l.quantity - 1)}>−</button>
                      <input type="number" aria-label={l.quantityLabel} min={1} max={l.maxQuantity} value={l.quantity} onChange={(e) => cart.setQuantity(l.slug, Math.min(l.maxQuantity, Math.max(1, Number(e.target.value) || 1)))} />
                      <button type="button" className="qty-btn" aria-label="Increase" disabled={l.quantity >= l.maxQuantity} onClick={() => cart.setQuantity(l.slug, l.quantity + 1)}>+</button>
                    </div>
                  ) : <span className="muted small">Quantity: 1</span>}
                  <button type="button" className="link-btn" onClick={() => cart.remove(l.slug)}>Remove<span className="sr-only"> {l.name}</span></button>
                </div>
              </div>
              <div className="cart-total"><span className="muted small">Indicative</span><br /><strong>{ngn(l.lineTotalNgn)}</strong></div>
            </li>
          );
        })}
      </ul>
      <aside className="card cart-summary" aria-label="Request summary">
        <h2 className="h-small">Summary</h2>
        <dl className="sum">
          <dt className="total">Indicative total</dt><dd className="total">{ngn(quote.indicativeTotalNgn)}</dd>
          <dt>Payment now</dt><dd>None</dd>
        </dl>
        <p className="muted small">{SOURCING_DISCLAIMER} Your quotation will show the final price.</p>
        {missingOption.length > 0 && <p className="err">Please fill in: {missingOption.map((m) => m.optionLabel).join(", ")}.</p>}
        {canContinue ? <Link className="btn btn-primary" style={{ width: "100%" }} href="/checkout">Continue to request details</Link>
          : <button className="btn btn-primary" style={{ width: "100%" }} disabled aria-disabled="true">Continue to request details</button>}
        <button type="button" className="link-btn" style={{ marginTop: 12 }} onClick={() => cart.clear()}>Empty request list</button>
      </aside>
    </div>
  );
}
