import type { Metadata } from "next";
import Link from "next/link";
import Icon, { Svg } from "@/components/Icon";
import { Cta, Note, PageHero, SectionHead } from "@/components/ui";
import { company, processSteps, values } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us",
  description: "About Cloud Edge Technology Services Limited, a registered Nigerian technology and e-commerce company based in Wuse Zone 5, Abuja.",
  alternates: { canonical: "/about" },
};

export default function About() {
  return (
    <>
      <PageHero eyebrow="About us" title="A Nigerian technology and e-commerce company" crumbs={[{ label: "About" }]}
        intro="We help businesses, organisations and individuals use dependable technology to operate effectively and reach their customers." />

      <section className="section">
        <div className="container split wide-left">
          <div>
            <SectionHead eyebrow="Company overview" title={`Who ${company.short} is`} />
            <p>{company.name} is a registered Nigerian company (RC {company.rc}) focused on software development, web and mobile application development, internet-related services, digital products and technology solutions.</p>
            <p>Our registered office is at {company.address.join(", ")}. We work with businesses and individuals who need practical technology: a credible website, an online store, a tool that replaces manual work, or advice on what to build next.</p>
            <p>We believe good technology should be understandable. We explain options in plain business language, agree scope in writing and document what we build so it can be maintained.</p>
          </div>
          <aside className="card" aria-label="Company details">
            <h3 className="mt-0">Company details</h3>
            <dl className="details" style={{ gridTemplateColumns: "1fr", gap: 4 }}>
              <dt>Registered name</dt><dd>{company.name}</dd>
              <dt style={{ marginTop: 10 }}>RC number</dt><dd>{company.rc}</dd>
              <dt style={{ marginTop: 10 }}>Registered address</dt><dd>{company.address.join(", ")}</dd>
              <dt style={{ marginTop: 10 }}>Email</dt><dd><a href={`mailto:${company.email}`} style={{ wordBreak: "break-all" }}>{company.email}</a></dd>
            </dl>
          </aside>
        </div>
      </section>

      <section className="section soft" aria-labelledby="mv-title">
        <div className="container">
          <SectionHead eyebrow="Purpose" title="Mission, vision and principles" id="mv-title" />
          <Note><p><strong>Draft for company approval.</strong> The mission, vision and principles below are proposed messaging based on the company&apos;s stated business purpose. Edit them in <code>src/app/(site)/about/page.tsx</code>.</p></Note>
          <div className="grid grid-2">
            <article className="card"><Icon name="compass" /><h3>Our mission</h3><p>To help businesses, organisations and individuals use dependable, well-built technology to operate more effectively and reach their customers.</p></article>
            <article className="card"><Icon name="spark" /><h3>Our vision</h3><p>To be a trusted technology partner for Nigerian and international clients, known for clarity, reliability and practical results.</p></article>
          </div>
          <h3 style={{ marginTop: 40 }}>Operating principles</h3>
          <div className="grid grid-4" style={{ marginTop: 16 }}>
            {values.map((v) => <article className="card" key={v.title}><Icon name={v.icon} size="sm" /><h3 style={{ fontSize: "1rem" }}>{v.title}</h3><p>{v.text}</p></article>)}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="approach-title">
        <div className="container">
          <SectionHead eyebrow="Our approach" title="How we deliver technology solutions" id="approach-title">
            <p>A simple, transparent process that keeps you informed and in control.</p>
          </SectionHead>
          <ol className="steps">{processSteps.map((s) => <li key={s.title}><h3>{s.title}</h3><p>{s.text}</p></li>)}</ol>
          <div className="actions"><Link className="btn btn-primary" href="/services">Explore our services <Svg name="arrow" /></Link></div>
        </div>
      </section>
      <Cta />
    </>
  );
}
