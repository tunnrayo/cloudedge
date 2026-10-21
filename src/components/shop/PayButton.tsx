"use client";
import { useState } from "react";
import { isPaymentUrl } from "./payment-url";

export default function PayButton({ number, token, label }: { number: string; token: string; label: string }) {
  const [state, setState] = useState<"idle" | "busy" | string>("idle");
  async function pay() {
    setState("busy");
    try {
      const r = await fetch(`/api/orders/${number}/pay`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok && isPaymentUrl(j.authorizationUrl)) { window.location.assign(j.authorizationUrl); return; }
      setState(j.error ?? "Could not start payment.");
    } catch { setState("Network problem. Please try again."); }
  }
  return (
    <div>
      <button className="btn btn-primary" type="button" onClick={pay} disabled={state === "busy"}>{state === "busy" ? "Opening Paystack…" : label}</button>
      <div role="alert">{state !== "idle" && state !== "busy" && <p className="err">{state}</p>}</div>
    </div>
  );
}
