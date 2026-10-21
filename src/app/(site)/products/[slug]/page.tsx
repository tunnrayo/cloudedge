import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Svg } from "@/components/Icon";
import { Cta, MediaArt, Note, PageHero, ProductCard } from "@/components/ui";
import { formatPrice } from "@/content/products";
import { getProduct, getProducts } from "@/lib/catalog";

type P = { params: Promise<{ slug: string }> };
export async function generateStaticParams() { return (await getProducts()).map((p) => ({ slug: p.slug })); }
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return {};
  return { title: p.sample ? `${p.name} (sample listing)` : p.name, description: p.summary, alternates: { canonical: `/products/${p.slug}` }, robots: p.sample ? { index: false } : undefined };
}

export default async function ProductPage({ params }: P) {
  const p = await getProduct((await params).slug);
  if (!p) notFound();
  const related = (await getProducts()).filter((x) => x.category === p.category && x.slug !== p.slug).slice(0, 3);
  const cta = p.cta ?? { label: "Enquire about this", href: `/quote?product=${p.slug}` };
  return (
    <>
      <PageHero eyebrow={p.category} title={p.name} intro={p.summary} crumbs={[{ href: "/products", label: "Products" }, { label: p.name }]} />
      <section className="section">
        <div className="container">
          {p.sample && <Note><p><strong>Sample listing.</strong> This product, its description and its price are examples for demonstration only. They are not a current offer.</p></Note>}
          <div className="split even" style={{ alignItems: "start" }}>
            <div className="card product-card" style={{ boxShadow: "var(--shadow)" }}>
              <div className="product-media">
                {p.image ? <Image src={p.image} alt={p.imageAlt ?? p.name} fill sizes="(max-width: 960px) 100vw, 50vw" style={{ objectFit: "cover" }} priority /> : <MediaArt icon={p.icon} label={`Illustration for ${p.name}`} />}
                {p.sample && <span className="badge sample">Sample listing</span>}
              </div>
            </div>
            <div>
              <p>{p.description}</p>
              <h2 style={{ fontSize: "1.2rem" }}>What it includes</h2>
              <ul className="feature-list" style={{ marginBottom: 24 }}>{p.features.map((f) => <li key={f}><Svg name="check" />{f}</li>)}</ul>
              <div className="card" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                <div>
                  <span className="muted" style={{ fontSize: ".85rem" }}>{p.sample ? "Sample price" : "Price"}</span>
                  <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: "1.5rem", color: "var(--navy)" }}>{formatPrice(p.price)}</div>
                  {p.sample && <small style={{ color: "var(--amber-text)" }}>Illustrative only — not a real offer</small>}
                </div>
                <Link className="btn btn-primary" href={cta.href}>{cta.label} <Svg name="arrow" /></Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      {related.length > 0 && (
        <section className="section soft">
          <div className="container">
            <h2>Related products</h2>
            <div className="grid grid-3" style={{ marginTop: 24 }}>{related.map((r, i) => <ProductCard key={r.slug} p={r} index={i + 1} />)}</div>
          </div>
        </section>
      )}
      <Cta />
    </>
  );
}
