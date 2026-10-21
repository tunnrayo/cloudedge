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
      <PageHero eyebrow="Legal" title="Privacy Policy" crumbs={[{ label: "Privacy Policy" }]} intro="Last updated: 21 October 2026 (draft)" />
      <section className="section">
        <div className="container narrow prose">
          <Note><p><strong>Draft wording for review.</strong> This policy has not been reviewed by a lawyer. Have it checked, including against the Nigeria Data Protection Act 2023, before relying on it.</p></Note>

          <h2>Who we are</h2>
          <p>This website is operated by {company.name} (RC {company.rc}), {company.address.join(", ")} (&ldquo;Cloud Edge&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). We are responsible for the personal information you submit through it.</p>

          <h2>What we collect</h2>
          <p>We only collect what you choose to submit through the Contact or Request a Quote forms:</p>
          <ul>
            <li>your name and email address (required);</li>
            <li>phone number and organisation name (optional);</li>
            <li>the inquiry type, and for quote requests your project description, and optionally a preferred timeline and budget range;</li>
            <li>your message, and the product you enquired about if you came from a product page.</li>
          </ul>
          <p>Our hosting provider may also record technical information such as IP addresses in server logs for security and reliability. We use IP addresses briefly in memory to limit repeated form submissions; we do not store them with your inquiry.</p>

          <h2>How we use it</h2>
          <p>We use your information only to respond to your inquiry, discuss a possible project and keep a record of our correspondence. We do not use it for marketing without your separate permission, and we do not sell it.</p>

          <h2>Where it is stored and who can see it</h2>
          <ul>
            <li>Inquiries are stored in a secured database used by this website. Only authorised Cloud Edge staff can view them, through a password-protected admin area.</li>
            <li>When email notifications are switched on, a copy of your inquiry is sent to our company mailbox through our email delivery provider (Resend).</li>
            <li>The website and database are run by our hosting providers, which process data on our behalf. Some providers may store data outside Nigeria.</li>
          </ul>

          <h2>How long we keep it</h2>
          <p>We keep inquiries only as long as needed to respond and for reasonable business records, and review them regularly. Proposed period: up to 24 months after our last contact, unless you become a client (then our client agreement applies). <em>[Period to be confirmed by the company.]</em></p>

          <h2>Cookies and analytics</h2>
          <p>This website does not use advertising or tracking cookies and does not currently use analytics. The only cookie is a security cookie set when Cloud Edge staff sign in to the admin area; visitors who do not sign in never receive it.</p>

          <h2>Your rights</h2>
          <p>You can ask to see, correct or delete the information you sent us, or object to how we use it. Email <a href={`mailto:${company.email}`}>{company.email}</a> with your request and, if you have it, your inquiry reference. You may also complain to the Nigeria Data Protection Commission.</p>

          <h2>Security</h2>
          <p>We use reasonable measures such as encrypted connections (HTTPS), access controls and input validation. No website can be guaranteed completely secure.</p>

          <h2>Changes</h2>
          <p>We may update this policy as the website changes. The date at the top shows the latest version.</p>
        </div>
      </section>
    </>
  );
}
