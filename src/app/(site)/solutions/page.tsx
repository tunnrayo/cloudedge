import type { Metadata } from "next";
import Link from "next/link";
import Icon, { Svg } from "@/components/Icon";
import { Cta, PageHero, SectionHead } from "@/components/ui";
import { services, solutions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Solutions",
  description: "How Cloud Edge combines software, applications, e-commerce and internet services to solve common business problems.",
  alternates: { canonical: "/solutions" },
};

const title = (slug: string) => services.find((s) => s.slug === slug)?.title ?? slug;

export default function Solutions() {
  return (
    <>
      <PageHero eyebrow="Solutions" title="Technology solutions built around business problems" crumbs={[{ label: "Solutions" }]}
        intro="Start from the problem, not the technology. Each solution below combines the services needed to solve it." />
      <section className="section">
        <div className="container">
          <div className="grid grid-3">
            {solutions.map((s) => (
              <article className="card" key={s.title}>
                <Icon name={s.icon} />
                <h2 style={{ fontSize: "1.15rem", marginTop: 18 }}>{s.title}</h2>
                <p>{s.text}</p>
                <p className="label" style={{ marginTop: 18, fontSize: ".8rem", color: "var(--muted)" }}>Services involved</p>
                <ul className="tag-list">{s.services.map((slug) => <li key={slug}><Link href={`/services/${slug}`}>{title(slug)}</Link></li>)}</ul>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section soft">
        <div className="container split even">
          <div>
            <SectionHead eyebrow="Not sure where to start?" title="Describe the problem — we will suggest the approach">
              <p>You do not need to know the right technology. Tell us what is slowing your business down or what you want customers to be able to do, and we will propose a practical, realistic solution.</p>
            </SectionHead>
            <div className="actions" style={{ marginTop: 0 }}>
              <Link className="btn btn-primary" href="/quote?service=technology-consulting">Ask for a recommendation <Svg name="arrow" /></Link>
              <Link className="btn btn-outline" href="/products">See product examples</Link>
            </div>
          </div>
          <ul className="feature-list card" style={{ padding: 28 }}>
            <li><Svg name="check" />We listen first and confirm the goal in writing</li>
            <li><Svg name="check" />We recommend the simplest approach that works</li>
            <li><Svg name="check" />We explain costs and trade-offs in plain language</li>
            <li><Svg name="check" />We document what we build so you are never locked in</li>
          </ul>
        </div>
      </section>
      <Cta />
    </>
  );
}
