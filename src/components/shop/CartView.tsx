"use client";
import Link from "next/link";
import { useEffect } from "react";
import { cart, useCart } from "./cart-store";
import { ngn, useQuote } from "./useQuote";
import ProductImage from "./ProductImage";

export default function CartView() {
  const items = useCart();
  const { quote, error, loading } = useQuote(items);

  // Drop items that no longer exist in the catalogue.
  useEffect(() => { quote?.removed.forEach((s) => cart.remove(s)); }, [quote]);

  if (!items.length) {
    return (
      <div className="empty">
        <p><strong>Your cart is empty.</strong></p>
        <p>Browse software, security, creative and cloud products.</p>
        <Link className="btn btn-primary" href="/products">Browse products</Link>
      </div>
    );
  }
  if (error) return <div className="alert bad" role="alert"><p>{error}</p></div>;
  if (!quote) return <p className="muted" role="status">Loading your cart…</p>;

  const missingOption = quote.lines.filter((l) => l.optionRequired && !(items.find((i) => i.slug === l.slug)?.option ?? "").trim());
  const blocked = quote.lines.filter((l) => !l.purchasable);
  const canCheckout = !loading && quote.lines.length > 0 && !blocked.length && !missingOption.length;

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
                <p className="muted small">{ngn(l.unitPriceNgn)} {l.billingLabel} · {l.sku}</p>
                {l.optionLabel && (
                  <div className="field" style={{ marginTop: 8 }}>
                    <label htmlFor={`o-${l.slug}`} className="small">{l.optionLabel}{!l.optionRequired && <span className="opt"> (optional)</span>}</label>
                    <input id={`o-${l.slug}`} defaultValue={item?.option ?? ""} maxLength={200} onBlur={(e) => cart.setOption(l.slug, e.target.value)}
                      aria-invalid={l.optionRequired && !(item?.option ?? "").trim() ? true : undefined} />
                  </div>
                )}
                {!l.purchasable && <p className="err">This product can no longer be bought online. <Link href={`/quote?product=${l.slug}`}>Request it instead</Link> or remove it.</p>}
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
              <div className="cart-total"><strong>{ngn(l.lineTotalNgn)}</strong></div>
            </li>
          );
        })}
      </ul>
      <aside className="card cart-summary" aria-label="Order summary">
        <h2 className="h-small">Summary</h2>
        <dl className="sum">
          <dt>Subtotal</dt><dd>{ngn(quote.subtotalNgn)}</dd>
          <dt>Delivery</dt><dd>Digital — no charge</dd>
          <dt className="total">Total</dt><dd className="total">{ngn(quote.totalNgn)}</dd>
        </dl>
        <p className="muted small">Prices are recalculated by our server at checkout. Recurring products are charged for the period shown; renewals are not automatic.</p>
        {missingOption.length > 0 && <p className="err">Please fill in: {missingOption.map((m) => m.optionLabel).join(", ")}.</p>}
        {canCheckout ? <Link className="btn btn-primary" style={{ width: "100%" }} href="/checkout">Proceed to checkout</Link>
          : <button className="btn btn-primary" style={{ width: "100%" }} disabled aria-disabled="true">Proceed to checkout</button>}
        <button type="button" className="link-btn" style={{ marginTop: 12 }} onClick={() => cart.clear()}>Empty cart</button>
      </aside>
    </div>
  );
}
