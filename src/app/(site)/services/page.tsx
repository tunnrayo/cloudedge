import type { Metadata } from "next";
import Link from "next/link";
import { Svg } from "@/components/Icon";
import { Cta, Note, PageHero, SectionHead, ServiceCard } from "@/components/ui";
import { processSteps, services } from "@/lib/site";

export const metadata: Metadata = {
  title: "Services",
  description: "Software development, website design, web and mobile applications, e-commerce, internet-related services, digital products and technology consulting from Cloud Edge.",
  alternates: { canonical: "/services" },
};

export default function Services() {
  return (
    <>
      <PageHero eyebrow="Services" title="Technology services for growing businesses" crumbs={[{ label: "Services" }]}
        intro="From your first website to custom software and mobile apps, we help you plan, build and run the technology your business needs." />
      <section className="section">
        <div className="container">
          <Note><p>These are the service areas Cloud Edge is set up to provide. The exact scope and availability of each is confirmed when you send an inquiry.</p></Note>
          <div className="grid grid-4">{services.map((s) => <ServiceCard key={s.slug} s={s} headingLevel={2} />)}</div>
        </div>
      </section>
      <section className="section soft">
        <div className="container">
          <SectionHead eyebrow="Typical engagement" title="What working with us looks like" center />
          <ol className="steps">{processSteps.map((s) => <li key={s.title}><h3>{s.title}</h3><p>{s.text}</p></li>)}</ol>
          <div className="actions" style={{ justifyContent: "center" }}>
            <Link className="btn btn-primary" href="/quote">Request a Quote <Svg name="arrow" /></Link>
            <Link className="btn btn-outline" href="/faq">Read the FAQ</Link>
          </div>
        </div>
      </section>
      <Cta />
    </>
  );
}
