import type { Metadata } from "next";
import Link from "next/link";
import { Note, PageHero } from "@/components/ui";
import { company } from "@/lib/site";

export const metadata: Metadata = {
  title: "Refund & Delivery Policy",
  description: "How Cloud Edge delivers software subscriptions and digital products, and when refunds apply.",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicy() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Refund & Delivery Policy" crumbs={[{ label: "Refund & Delivery Policy" }]} intro="Last updated: 21 October 2026 (draft)" />
      <section className="section">
        <div className="container narrow prose">
          <Note><p><strong>Draft wording for review.</strong> Have this policy checked by a lawyer (including against the Federal Competition and Consumer Protection Act) and confirm it matches how you actually operate before relying on it.</p></Note>

          <h2>What we sell</h2>
          <p>Our shop lists software subscriptions, licences, cloud services, domain registrations and other digital products made by third-party vendors (for example Microsoft, Google, Adobe and Norton). Product names and logos belong to those vendors. Unless a product page says otherwise, {company.name} is not an official partner of the vendor.</p>

          <h2>How delivery works</h2>
          <ul>
            <li>Products are supplied <strong>manually after your payment is confirmed</strong>. Our team purchases or provisions the product from the vendor or a supplier and emails you the activation instructions, licence details or account access as provided by the vendor.</li>
            <li>We confirm the expected activation date by email after payment. Delivery depends on the vendor or supplier, so we do not promise instant activation.</li>
            <li>You can follow every step on your order page (link in your order email, or under <Link href="/account">your account</Link>).</li>
            <li>Some products need information from you (for example the domain name to register or the account email to activate on). Delays in providing it delay delivery.</li>
            <li>Vendor terms of use apply to every product. We never sell shared personal accounts or unofficial licence keys.</li>
          </ul>

          <h2>If the supplier&apos;s price or availability changes</h2>
          <p>Prices are based on vendor reference prices checked on the date shown on each product. If, after you pay, the supplier price rises or the product becomes unavailable, we will put the order <strong>on hold</strong> and ask you to choose: approve the change, or cancel and receive a full refund. We will never charge you extra without your agreement.</p>

          <h2>Refunds</h2>
          <ul>
            <li><strong>Before delivery:</strong> if we cannot supply your product, or you cancel before we have purchased it from the supplier, we refund you in full.</li>
            <li><strong>After delivery:</strong> because digital products can be used immediately, refunds after activation details have been delivered are only possible where the vendor allows a cancellation or refund for that product, or where the product is faulty or not as described.</li>
            <li>Approved refunds are made through Paystack to the original payment method. Banks usually take several business days to show the refund.</li>
            <li>To request a refund, email <a href={`mailto:${company.email}`}>{company.email}</a> with your order number.</li>
          </ul>

          <h2>Payments</h2>
          <p>Payments are processed by Paystack. We never see or store your card details. An order is only treated as paid once Paystack confirms the payment to our server.</p>

          <h2>Renewals</h2>
          <p>Prices are for the billing period shown (for example per month or per year). Subscriptions bought through us do not renew automatically through this website; we will contact you before the end of the period if renewal is required.</p>
        </div>
      </section>
    </>
  );
}
