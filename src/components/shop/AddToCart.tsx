"use client";
import Link from "next/link";
import { useState } from "react";
import { cart, useCart } from "./cart-store";

type Props = { slug: string; name: string; maxQuantity: number; quantityLabel: string; optionLabel: string; optionRequired: boolean };

export default function AddToCart({ slug, name, maxQuantity, quantityLabel, optionLabel, optionRequired }: Props) {
  const items = useCart();
  const inCart = items.find((i) => i.slug === slug);
  const [qty, setQty] = useState(1);
  const [option, setOption] = useState("");
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  function add() {
    if (optionLabel && optionRequired && option.trim().length < 2) { setError(`Please fill in: ${optionLabel}`); return; }
    const already = inCart?.quantity ?? 0;
    if (already + qty > maxQuantity) { setError(`The maximum for this product is ${maxQuantity}.`); return; }
    setError("");
    cart.add(slug, qty, option.trim());
    setAdded(true);
  }

  return (
    <div className="buy-box">
      {maxQuantity > 1 && (
        <div className="field">
          <label htmlFor="qty">{quantityLabel}</label>
          <div className="qty">
            <button type="button" className="qty-btn" aria-label="Decrease" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>−</button>
            <input id="qty" type="number" inputMode="numeric" min={1} max={maxQuantity} value={qty} onChange={(e) => setQty(Math.min(maxQuantity, Math.max(1, Math.floor(Number(e.target.value) || 1))))} />
            <button type="button" className="qty-btn" aria-label="Increase" onClick={() => setQty((q) => Math.min(maxQuantity, q + 1))} disabled={qty >= maxQuantity}>+</button>
          </div>
          <p className="hint">Maximum {maxQuantity}.</p>
        </div>
      )}
      {optionLabel && (
        <div className="field">
          <label htmlFor="opt">{optionLabel}{!optionRequired && <span className="opt"> (optional)</span>}</label>
          <input id="opt" value={option} maxLength={200} onChange={(e) => setOption(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={error ? "atc-err" : undefined} />
        </div>
      )}
      <div role="alert">{error && <p className="err" id="atc-err">{error}</p>}</div>
      <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={add}>Request this software</button>
      <div role="status" aria-live="polite">
        {added && <p className="added-msg">Added {name} to your request list. <Link href="/cart">Review and send your request</Link></p>}
      </div>
    </div>
  );
}
