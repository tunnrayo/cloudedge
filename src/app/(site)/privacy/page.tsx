import type { Metadata } from "next";
import { Note, PageHero } from "@/components/ui";
import { company } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Cloud Edge Technology Services Limited handles information submitted through this website.",
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy Policy" crumbs={[{ label: "Privacy Policy" }]} intro="Last updated: 22 October 2026 (draft)" />
      <section className="section">
        <div className="container narrow prose">
          <Note><p><strong>Draft wording for review.</strong> This policy has not been reviewed by a lawyer. Have it checked, including against the Nigeria Data Protection Act 2023 (lawful basis, retention period, cross-border transfers, any registration duty), before relying on it.</p></Note>

          <h2>Who we are</h2>
          <p>This website is operated by {company.name} (RC {company.rc}), {company.address.join(", ")} (&ldquo;Cloud Edge&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). We are responsible for the personal information you submit through it.</p>

          <h2>What we collect</h2>
          <p><strong>Software requests and orders:</strong> when you send a sourcing request we collect your name, email address and the country where the software will be used (required), an optional phone number, company name and notes, the products you requested and any details a product needs (for example a domain name or account email). We then record our quotation and your decision on it. If you pay through Paystack we receive the payment status, amount and reference, but <strong>never your card number or CVV</strong>; if you pay by bank transfer we record the transfer reference and date. Orders placed before 22 October 2026 may also hold a billing address.</p>
          <p><strong>Accounts:</strong> if you create an account we store your name, email, optional phone number and a securely hashed password (we cannot read your password).</p>
          <p><strong>Enquiries:</strong> we collect what you submit through the Contact or Request a Quote forms:</p>
          <ul>
            <li>your name and email address (required);</li>
            <li>phone number and organisation name (optional);</li>
            <li>the inquiry type, and for quote requests your project description, and optionally a preferred timeline and budget range;</li>
            <li>your message, and the product you enquired about if you came from a product page.</li>
          </ul>
          <p>Our hosting provider may also record technical information such as IP addresses in server logs for security and reliability. We use IP addresses briefly in memory to limit repeated form submissions; we do not store them with your inquiry.</p>

          <h2>How we use it</h2>
          <p>To check availability and prepare quotations, to process and deliver your orders (including sharing the details a supplier needs to activate your product, such as the account email and country), to confirm payments, to provide refunds, to respond to enquiries and to keep business and tax records. We do not use it for marketing without your separate permission, and we do not sell it.</p>

          <h2>Where it is stored and who can see it</h2>
          <ul>
            <li>Orders, accounts and inquiries are stored in a secured database used by this website. Only people authorised by Cloud Edge can view them, through a password-protected admin area. Administrator sign-ins and changes made in the admin area are recorded in an audit log (who, what and when; a one-way hash of the IP address, never passwords).</li>
            <li>Payments are processed by Paystack, which handles your card details under its own privacy policy.</li>
            <li>To check availability or fulfil an order we may share the necessary details (never your payment details) with an external supplier or the product&apos;s vendor.</li>
            <li>When email notifications are switched on, a copy of your inquiry is sent to our company mailbox through our email delivery provider (Resend).</li>
            <li>The website and database are run by our hosting providers, which process data on our behalf. Some providers may store data outside Nigeria.</li>
          </ul>

          <h2>How long we keep it</h2>
          <p>We keep inquiries only as long as needed to respond and for reasonable business records, and review them regularly. Proposed period: up to 24 months after our last contact, unless you become a client (then our client agreement applies). <em>[Period to be confirmed by the company.]</em></p>

          <h2>Cookies and analytics</h2>
          <p>This website does not use advertising or tracking cookies and does not currently use analytics. It uses a sign-in cookie only if you log in to a customer account (or staff sign in to the admin area). Your request list is kept in your own browser&apos;s storage, not on our server, until you send a request.</p>

          <h2>Your rights</h2>
          <p>You can ask to see, correct or delete the information you sent us, or object to how we use it. Email <a href={`mailto:${company.email}`}>{company.email}</a> with your request and, if you have it, your inquiry reference. You may also complain to the Nigeria Data Protection Commission.</p>

          <h2>Security</h2>
          <p>We use reasonable measures such as access controls, input validation and, when the site is served over HTTPS, encrypted connections. No website can be guaranteed completely secure.</p>

          <h2>Changes</h2>
          <p>We may update this policy as the website changes. The date at the top shows the latest version.</p>
        </div>
      </section>
    </>
  );
}
