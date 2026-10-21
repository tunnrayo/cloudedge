import type { Metadata } from "next";
import Link from "next/link";
import Icon, { Svg } from "@/components/Icon";
import InquiryForm from "@/components/InquiryForm";
import { PageHero } from "@/components/ui";
import { company } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact Cloud Edge Technology Services Limited by email or online form. Registered office: Samfa Plaza, Wuse Zone 5, Abuja.",
  alternates: { canonical: "/contact" },
};

export default function Contact() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Get in touch" crumbs={[{ label: "Contact" }]}
        intro="Have a question or an idea? Send us a message and we will reply by email." />
      <section className="section">
        <div className="container split form-split">
          <div className="form-card">
            <h2 style={{ fontSize: "1.4rem" }}>Send us a message</h2>
            <p className="muted">Fields marked optional can be left blank.</p>
            <InquiryForm mode="contact" />
          </div>
          <aside aria-labelledby="details-title">
            <h2 id="details-title" style={{ fontSize: "1.3rem" }}>Company details</h2>
            <ul className="contact-list" style={{ marginTop: 20 }}>
              <li><Icon name="mail" size="sm" /><div><h3>Email</h3><p><a href={`mailto:${company.email}`} style={{ wordBreak: "break-all" }}>{company.email}</a></p></div></li>
              <li><Icon name="pin" size="sm" /><div><h3>Registered address</h3><address>{company.address.map((l) => <span key={l} style={{ display: "block" }}>{l}</span>)}</address></div></li>
              <li><Icon name="id" size="sm" /><div><h3>RC number</h3><p>{company.rc}</p></div></li>
            </ul>
            <div className="card" style={{ marginTop: 28, background: "var(--soft)" }}>
              <h3 className="mt-0">Planning a project?</h3>
              <p>The quote form asks a few extra questions that help us reply with useful next steps.</p>
              <Link className="link-arrow" href="/quote">Request a quote <Svg name="arrow" /></Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
