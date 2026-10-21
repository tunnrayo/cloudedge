"use client";
/**
 * Shopping cart stored in the visitor's browser (localStorage), so it survives page refreshes.
 * It stores only product slugs, quantities and options — prices always come from the server.
 */
import { useSyncExternalStore } from "react";

export type CartItem = { slug: string; quantity: number; option?: string };
const KEY = "ce_cart_v1";
const EVT = "ce-cart-change";
const EMPTY: CartItem[] = [];
let cache: { raw: string | null; items: CartItem[] } = { raw: null, items: EMPTY };

function read(): CartItem[] {
  let raw: string | null = null;
  try { raw = window.localStorage.getItem(KEY); } catch { return cache.items; }
  if (raw === cache.raw) return cache.items;
  let items: CartItem[] = EMPTY;
  try {
    const parsed = JSON.parse(raw ?? "[]");
    if (Array.isArray(parsed)) items = parsed.filter((x) => x && typeof x.slug === "string").map((x) => ({ slug: String(x.slug).slice(0, 100), quantity: Math.max(1, Math.floor(Number(x.quantity) || 1)), option: typeof x.option === "string" ? x.option.slice(0, 200) : "" })).slice(0, 50);
  } catch { items = EMPTY; }
  cache = { raw, items };
  return items;
}
function write(items: CartItem[]) {
  try { window.localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable: cart lasts for this page only */ cache = { raw: null, items }; }
  window.dispatchEvent(new Event(EVT));
}
function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); };
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", onStorage);
  return () => { window.removeEventListener(EVT, cb); window.removeEventListener("storage", onStorage); };
}

export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
export const cart = {
  add(slug: string, quantity: number, option = "") {
    const items = [...read()];
    const i = items.findIndex((x) => x.slug === slug);
    if (i >= 0) items[i] = { ...items[i], quantity: items[i].quantity + quantity, option: option || items[i].option };
    else items.push({ slug, quantity, option });
    write(items);
  },
  setQuantity(slug: string, quantity: number) { write(read().map((x) => (x.slug === slug ? { ...x, quantity: Math.max(1, Math.floor(quantity)) } : x))); },
  setOption(slug: string, option: string) { write(read().map((x) => (x.slug === slug ? { ...x, option: option.slice(0, 200) } : x))); },
  remove(slug: string) { write(read().filter((x) => x.slug !== slug)); },
  clear() { write([]); },
};
