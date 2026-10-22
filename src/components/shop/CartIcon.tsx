"use client";
import Link from "next/link";
import { useCart } from "./cart-store";

export default function CartIcon() {
  const items = useCart();
  const count = items.reduce((a, i) => a + i.quantity, 0);
  return (
    <Link className="icon-btn cart-btn" href="/cart" aria-label={`Request list, ${count} item${count === 1 ? "" : "s"}`}>
      <svg className="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2.2l2.3 11h10.3l2.2-8H6.4M9 20.2h.01M17 20.2h.01" /></svg>
      {count > 0 && <span className="cart-count" aria-hidden="true">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}
