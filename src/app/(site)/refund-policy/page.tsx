import type { Metadata } from "next";
import Link from "next/link";
import { Note, PageHero } from "@/components/ui";
import { company } from "@/lib/site";

export const metadata: Metadata = {
  title: "Refund & Delivery Policy",
  description: "How Cloud Edge software requests, quotations, delivery, cancellations and refunds work.",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicy() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Refund & Delivery Policy" crumbs={[{ label: "Refund & Delivery Policy" }]} intro="Last updated: 22 October 2026 (draft)" />
      <section className="section">
        <div className="container narrow prose">
          <Note><p><strong>Draft wording for review.</strong> Have this policy checked by a lawyer (including against the Federal Competition and Consumer Protection Act) and confirm it matches how you actually operate before relying on it.</p></Note>

          <h2>What we offer</h2>
          <p>Our shop lists software subscriptions, licences, cloud services, domain registrations and other digital products made by third-party vendors (for example Microsoft, Google, Adobe and Norton). Product names and logos belong to those vendors. Cloud Edge sources eligible software products through external suppliers. {company.name} is not an authorised partner of, or affiliated with, these vendors unless a product page says so.</p>

          <h2>Requests, quotations and orders</h2>
          <ul>
            <li><strong>A request is not an order.</strong> Sending a request does not secure the product, reserve stock or a price, or charge you. Prices on the website are indicative.</li>
            <li>After checking with suppliers we send you a <strong>quotation</strong> with the final price, licence terms, any confirmed delivery estimate and an expiry date.</li>
            <li>Your order is confirmed only when you <strong>accept a quotation</strong>. You then pay the accepted amount. An accepted quotation is never changed without your agreement; if something changes before you pay, we send a revised quotation that you must accept again.</li>
            <li>We can decline or close a request if a product cannot be sourced legitimately, is not licensed for your country, or the supplier cannot confirm it. You are not charged in that case.</li>
          </ul>

          <h2>How delivery works</h2>
          <ul>
            <li>We place the supplier order <strong>only after your payment is confirmed</strong>, then deliver the licence, subscription invitation or activation instructions as provided by the supplier or vendor.</li>
            <li>Delivery time depends on the supplier. We do not promise a delivery date unless the supplier has confirmed it, and we show any confirmed estimate in your quotation and on your request page.</li>
            <li>Some products need information from you (for example the domain name to register or the account email to activate on). Delays in providing it delay delivery.</li>
            <li>Vendor terms of use apply to every product. We do not sell shared personal accounts or unofficial licence keys.</li>
          </ul>

          <h2>Cancellations</h2>
          <ul>
            <li><strong>Before you pay:</strong> you can decline a quotation or ask us to cancel your request at any time, at no cost.</li>
            <li><strong>After you pay, before we place the supplier order:</strong> tell us as soon as possible and we will cancel and refund you in full.</li>
            <li><strong>After we have placed the supplier order:</strong> whether we can cancel depends on the supplier&apos;s and vendor&apos;s terms for that product. We will tell you what is possible and any amount the supplier will not return before going ahead.</li>
          </ul>

          <h2>Refunds</h2>
          <ul>
            <li><strong>We cannot supply what you paid for:</strong> if, after your payment, the supplier cannot provide the product as quoted, we refund you in full (or, if you prefer, offer an alternative you must accept first).</li>
            <li><strong>After delivery:</strong> digital products can usually be used immediately, so refunds after delivery depend on the vendor&apos;s cancellation or refund rules for that product. If the product is faulty, not as described in your quotation, or not valid for your country as quoted, contact us and we will work to fix it, replace it or refund you. Your statutory consumer rights are not affected.</li>
            <li>Refunds of Paystack payments are made through Paystack to the original payment method; bank transfers are refunded to the account you tell us. Banks usually take several business days to show a refund.</li>
            <li>To ask about a cancellation or refund, email <a href={`mailto:${company.email}`}>{company.email}</a> quoting your request reference.</li>
          </ul>

          <h2>Payments</h2>
          <p>We only ask for payment after you accept a quotation. Online payments are processed by Paystack; we never see or store your card details. A payment is treated as confirmed only after we verify it with Paystack (or, for a bank transfer, after it reaches the company account) — not because a page says &ldquo;success&rdquo;.</p>

          <h2>Renewals</h2>
          <p>Prices are for the billing period shown (for example per month or per year). Subscriptions supplied through us do not renew automatically through this website; a renewal is a new request and quotation.</p>
          <p>See also <Link href="/faq#sourcing">how sourcing works</Link> and our <Link href="/terms">Terms of Use</Link>.</p>
        </div>
      </section>
    </>
  );
}
