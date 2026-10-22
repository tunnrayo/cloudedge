import type { Metadata } from "next";
import CheckoutForm from "@/components/shop/CheckoutForm";
import { PageHero } from "@/components/ui";
import { currentCustomer } from "@/lib/shop/customers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Send your sourcing request", robots: { index: false } };

export default async function Checkout() {
  const me = await currentCustomer();
  return (
    <>
      <PageHero eyebrow="Request a quotation" title="Send your sourcing request" intro="No payment is taken now. We check availability and send you a quotation first." crumbs={[{ href: "/cart", label: "Request list" }, { label: "Send request" }]} />
      <section className="section tight"><div className="container">
        {!me && <p className="muted small">Have an account? <a href="/account/login?next=/checkout">Sign in</a> to keep this request in your account. You can also continue as a guest.</p>}
        <CheckoutForm prefill={me ? { name: me.name, email: me.email, phone: me.phone } : null} />
      </div></section>
    </>
  );
}
