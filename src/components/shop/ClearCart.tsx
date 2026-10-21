"use client";
import { useEffect } from "react";
import { cart } from "./cart-store";
/** Empties the cart once a payment has been confirmed. */
export default function ClearCart() {
  useEffect(() => { cart.clear(); }, []);
  return null;
}
