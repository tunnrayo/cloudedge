import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Icon, { Svg } from "@/components/Icon";
import { Cta, PageHero, ServiceCard } from "@/components/ui";
import { processSteps, services } from "@/lib/site";

type P = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return services.map((s) => ({ slug: s.slug })); }
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const s = services.find((x) => x.slug === slug);
  return s ? { title: s.title, description: `${s.summary} ${s.what}`.slice(0, 160), alternates: { canonical: `/services/${s.slug}` } } : {};
}

export default async function ServicePage({ params }: P) {
  const { slug } = await params;
  const s = services.find((x) => x.slug === slug);
  if (!s) notFound();
  const others = services.filter((x) => x.slug !== s.slug).slice(0, 3);
  return (
    <>
      <PageHero eyebrow="Service" title={s.title} intro={s.summary} crumbs={[{ href: "/services", label: "Services" }, { label: s.title }]} />
      <section className="section">
        <div className="container split wide-left">
          <div className="prose">
            <h2 className="mt-0">The problem</h2>
            <p>{s.problem}</p>
            <h2>What we do</h2>
            <p>{s.what}</p>
            <h2>What this can include</h2>
            <ul className="feature-list cols" style={{ marginTop: 12 }}>{s.items.map((i) => <li key={i}><Svg name="check" />{i}</li>)}</ul>
            <h2>Typical engagement</h2>
            <ol>{processSteps.map((p) => <li key={p.title}><strong>{p.title}:</strong> {p.text}</li>)}</ol>
          </div>
          <aside className="card side-card" aria-label="Request this service">
            <Icon name={s.icon} />
            <h3 style={{ marginTop: 16 }}>A good fit for</h3>
            <ul className="feature-list" style={{ marginBottom: 22 }}>{s.goodFor.map((g) => <li key={g}><Svg name="check" />{g}</li>)}</ul>
            <Link className="btn btn-primary" style={{ width: "100%" }} href={`/quote?service=${s.slug}`}>Request a quote <Svg name="arrow" /></Link>
            <p className="muted" style={{ fontSize: ".85rem", marginTop: 12, marginBottom: 0 }}>Scope and availability are confirmed in writing after your inquiry.</p>
          </aside>
        </div>
      </section>
      <section className="section soft">
        <div className="container">
          <h2>Related services</h2>
          <div className="grid grid-3" style={{ marginTop: 24 }}>{others.map((o) => <ServiceCard key={o.slug} s={o} />)}</div>
        </div>
      </section>
      <Cta />
    </>
  );
}
