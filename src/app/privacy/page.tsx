import type { Metadata } from "next";
import { company } from "@/lib/site";
export const metadata: Metadata = { title: "Privacy Policy", description: "How Cloud Edge Technology Services Limited handles information submitted through this website." };
export default function Privacy() {
  return (<section className="section"><div className="wrap" style={{ maxWidth: 820 }}><h1>Privacy Policy</h1>
    <div className="note" role="note">Draft wording for review. It has not been legally reviewed. Have it checked, including against the Nigeria Data Protection Act, before relying on it.</div>
    <h2 style={{ marginTop: 24 }}>What we collect</h2><p>Only what you submit in the contact or quote forms: name, email address, optional organization, inquiry type, optional budget range, and your message or project description.</p>
    <h2>How we use it</h2><p>To respond to your inquiry and discuss a possible project. Messages are forwarded by email to the company; this website does not store inquiries in a database.</p>
    <h2>Sharing</h2><p>Messages pass through our email delivery provider (currently Resend, when configured). We do not sell your information.</p>
    <h2>Cookies and analytics</h2><p>This website does not currently set tracking cookies or use analytics.</p>
    <h2>Your requests</h2><p>To ask about, correct or delete information you sent, email <a href={`mailto:${company.email}`}>{company.email}</a>.</p>
    <p>Controller: {company.name}, {company.address.join(", ")}.</p></div></section>);
}
