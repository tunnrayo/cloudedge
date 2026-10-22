"use client";
import { useEffect, useState } from "react";
import type { CartItem } from "./cart-store";

/** One line of the request list, with the INDICATIVE catalogue price (final price comes in the quotation). */
export type QuoteLine = {
  slug: string; name: string; sku: string; image: string; quantity: number; maxQuantity: number; quantityLabel: string;
  unitPriceNgn: number; lineTotalNgn: number; billingLabel: string; optionLabel: string; optionRequired: boolean; option: string;
  requestable: boolean; blockers: string[]; priceVerification: string;
};
export type Quote = { lines: QuoteLine[]; indicativeTotalNgn: number; allRequestable: boolean; removed: string[] };

const EMPTY: Quote = { lines: [], indicativeTotalNgn: 0, allRequestable: false, removed: [] };

/** Asks the server for current indicative prices whenever the request list changes. */
export function useQuote(items: CartItem[]) {
  const [state, setState] = useState<{ key: string; quote: Quote | null; error: string }>({ key: "", quote: null, error: "" });
  const key = JSON.stringify(items);
  useEffect(() => {
    const ctrl = new AbortController();
    const parsed = JSON.parse(key) as CartItem[];
    if (!parsed.length) return;
    fetch("/api/cart/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: parsed }), signal: ctrl.signal })
      .then(async (r) => { const j = await r.json(); if (!r.ok || !j.ok) throw new Error(j.error || "Could not load prices."); setState({ key, quote: j, error: "" }); })
      .catch((e) => { if (e.name !== "AbortError") setState((s) => ({ key, quote: s.quote, error: e.message || "Could not load prices." })); });
    return () => ctrl.abort();
  }, [key]);
  if (!items.length) return { quote: EMPTY, error: "", loading: false };
  return { quote: state.quote, error: state.key === key ? state.error : "", loading: state.key !== key };
}
export const ngn = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
