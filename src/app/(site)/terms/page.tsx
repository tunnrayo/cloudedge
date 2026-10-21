import type { Metadata } from "next";
import Link from "next/link";
import { Note, PageHero } from "@/components/ui";
import { company } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms of use for the Cloud Edge Technology Services Limited website.",
  alternates: { canonical: "/terms" },
};

export default function Terms() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms of Use" crumbs={[{ label: "Terms of Use" }]} intro="Last updated: 21 October 2026 (draft)" />
      <section className="section">
        <div className="container narrow prose">
          <Note><p><strong>Draft wording for review.</strong> These terms have not been reviewed by a lawyer. Confirm them with a legal adviser before relying on them.</p></Note>

          <h2>About this website</h2>
          <p>This website is operated by {company.name} (RC {company.rc}), {company.address.join(", ")}. By using it you agree to these terms.</p>

          <h2>Information on this website</h2>
          <p>Content is provided for general information about our business and services. It is not a binding offer. Service descriptions show what we are set up to provide; availability and scope are confirmed in writing for each engagement.</p>

          <h2>Shop, prices and orders</h2>
          <p>Products in our shop are made by third-party vendors and are supplied by us after payment, as described in the <Link href="/refund-policy">Refund &amp; Delivery Policy</Link>. Prices are in Nigerian naira; where a vendor prices in US dollars, the conversion rate and reference price are shown on the product page. An order is accepted when Paystack confirms your payment; we may cancel and fully refund an order if the product cannot be supplied. Products marked &ldquo;Available on request&rdquo; are not offered for online sale.</p>
          <p>You must use products in line with the vendor&apos;s licence terms. Items marked <strong>&ldquo;Demo concept&rdquo;</strong> on the Portfolio page are illustrative concepts, not completed client projects.</p>

          <h2>Inquiries and quotes</h2>
          <p>Submitting a form does not create a contract. Any work, price and timeline is agreed separately in writing. Quotes are valid only for the period stated on them.</p>

          <h2>Acceptable use</h2>
          <p>Do not misuse the website: for example, do not submit false, unlawful or harmful content, attempt to gain unauthorised access, or interfere with its operation.</p>

          <h2>Intellectual property</h2>
          <p>The Cloud Edge name, logo and website content belong to {company.name} unless stated otherwise. Do not copy or reuse them without permission.</p>

          <h2>Liability</h2>
          <p>We aim to keep the website accurate and available but provide it &ldquo;as is&rdquo;. To the extent permitted by law, we are not liable for losses arising from its use. <em>[Liability wording to be confirmed by a legal adviser.]</em></p>

          <h2>Governing law</h2>
          <p>These terms are governed by the laws of the Federal Republic of Nigeria.</p>

          <h2>Contact</h2>
          <p>Questions about these terms: <a href={`mailto:${company.email}`}>{company.email}</a>. See also our <Link href="/privacy">Privacy Policy</Link>.</p>
        </div>
      </section>
    </>
  );
}
