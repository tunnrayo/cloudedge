import type { Metadata } from "next";
import CheckoutForm from "@/components/shop/CheckoutForm";
import { PageHero } from "@/components/ui";
import { paystackMode } from "@/lib/shop/paystack";
import { currentCustomer } from "@/lib/shop/customers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function Checkout() {
  const me = await currentCustomer();
  return (
    <>
      <PageHero eyebrow="Shop" title="Checkout" crumbs={[{ href: "/cart", label: "Cart" }, { label: "Checkout" }]} />
      <section className="section tight"><div className="container">
        {!me && <p className="muted small">Have an account? <a href="/account/login?next=/checkout">Sign in</a> to see this order in your order history. Guest checkout is fine too.</p>}
        <CheckoutForm mode={paystackMode()} prefill={me ? { name: me.name, email: me.email, phone: me.phone } : null} />
      </div></section>
    </>
  );
}
