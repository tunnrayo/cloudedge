import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui";
import ClearCart from "@/components/shop/ClearCart";
import { confirmPayment } from "@/lib/shop/orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payment status", robots: { index: false } };

/** Paystack redirects here. The redirect itself proves nothing: the payment is verified with Paystack's API. */
export default async function Complete({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string; order?: string; t?: string }> }) {
  const sp = await searchParams;
  const reference = sp.reference ?? sp.trxref ?? "";
  const out = reference ? await confirmPayment(reference, "callback") : { state: "unknown_reference" as const, message: "No payment reference was provided." };
  const orderUrl = out.orderNumber ? `/orders/${out.orderNumber}${sp.t ? `?t=${encodeURIComponent(sp.t)}` : ""}` : null;
  const ok = out.state === "paid" || out.state === "already_paid";
  return (
    <>
      <PageHero eyebrow="Checkout" title={ok ? "Payment confirmed" : out.state === "pending" ? "Payment not completed yet" : "Payment status"} />
      <section className="section"><div className="container narrow">
        {ok && <ClearCart />}
        <div className={`alert ${ok ? "ok" : out.state === "pending" ? "info" : "bad"}`} role="status">
          <p><strong>{out.message}</strong>{out.orderNumber ? ` Order ${out.orderNumber}.` : ""}</p>
        </div>
        {ok && <p>Thank you. Our team will now source your products and email the activation details. You can follow every step on your order page.</p>}
        {out.state === "pending" && <p>If you closed the payment page, you can pay from your order page. If you did pay, this page will update once Paystack confirms it — refresh in a minute.</p>}
        <div className="actions">
          {orderUrl && <Link className="btn btn-primary" href={orderUrl}>View your order</Link>}
          <Link className="btn btn-outline" href="/products">Continue shopping</Link>
        </div>
      </div></section>
    </>
  );
}
