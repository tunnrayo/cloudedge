import Link from "next/link";
import Icon, { Svg } from "@/components/Icon";
import { Cta, PageHero, ServiceCard } from "@/components/ui";
import ProductImage from "@/components/shop/ProductImage";
import { processSteps, type Service } from "@/lib/site";

/** The public service page. Also used by the admin preview, so what you preview is what visitors get. */
export default function ServiceView({ s, others }: { s: Service; others: Service[] }) {
  const inactive = s.status === "inactive";
  return (
    <>
      <PageHero eyebrow={s.category ?? "Service"} title={s.title} intro={s.summary} crumbs={[{ href: "/services", label: "Services" }, { label: s.title }]} />
      <section className="section">
        <div className="container split wide-left">
          <div className="prose">
            {inactive && <div className="note" role="note"><p><strong>This service is not currently offered.</strong> You are welcome to <Link href="/contact">contact us</Link> to ask about alternatives.</p></div>}
            {s.imageId && <ProductImage src={`/api/images/${s.imageId}`} alt={s.imageAlt || s.title} className="service-hero-img" />}
            {s.problem && (<><h2 className="mt-0">The problem</h2><p>{s.problem}</p></>)}
            <h2 className={s.problem ? undefined : "mt-0"}>What we do</h2>
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
            {s.priceText && <p><strong>Pricing:</strong> {s.priceText}</p>}
            {!inactive && <Link className="btn btn-primary" style={{ width: "100%" }} href={`/quote?service=${s.slug}`}>Request a quote <Svg name="arrow" /></Link>}
            <p className="muted" style={{ fontSize: ".85rem", marginTop: 12, marginBottom: 0 }}>Scope and availability are confirmed in writing after your inquiry.</p>
          </aside>
        </div>
      </section>
      {others.length > 0 && (
        <section className="section soft">
          <div className="container">
            <h2>Related services</h2>
            <div className="grid grid-3" style={{ marginTop: 24 }}>{others.map((o) => <ServiceCard key={o.slug} s={o} />)}</div>
          </div>
        </section>
      )}
      <Cta />
    </>
  );
}
