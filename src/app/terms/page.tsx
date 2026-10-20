import type { Metadata } from "next";
import { company } from "@/lib/site";
export const metadata: Metadata = { title: "Terms of Use", description: "Terms of use for the Cloud Edge Technology Services Limited website." };
export default function Terms() {
  return (<section className="section"><div className="wrap" style={{ maxWidth: 820 }}><h1>Terms of Use</h1>
    <div className="note" role="note">Draft wording for review. It has not been legally reviewed.</div>
    <h2 style={{ marginTop: 24 }}>General information</h2><p>This website is operated by {company.name} (RC {company.rc}). Content is for general information and is not a binding offer.</p>
    <h2>Inquiries and quotes</h2><p>Submitting a form does not create a contract. Services, scope and prices are agreed separately in writing.</p>
    <h2>Acceptable use</h2><p>Do not misuse the website, submit unlawful content, or attempt to disrupt it.</p>
    <h2>Liability</h2><p>We aim for accurate content but provide the website as is. Draft only; confirm liability wording with a legal adviser.</p>
    <h2>Contact</h2><p><a href={`mailto:${company.email}`}>{company.email}</a></p></div></section>);
}
