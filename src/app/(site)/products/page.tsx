import type { Metadata } from "next";
import Link from "next/link";
import { Svg } from "@/components/Icon";
import { Cta, Note, PageHero, ProductCard } from "@/components/ui";
import { getProductCategories, getProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Products",
  description: "Digital products and technology packages from Cloud Edge Technology Services Limited.",
  alternates: { canonical: "/products" },
};

const slugify = (c: string) => c.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export default async function Products({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const [all, categories] = await Promise.all([getProducts(), getProductCategories()]);
  const active = categories.find((c) => slugify(c) === category);
  const list = active ? all.filter((p) => p.category === active) : all;
  const hasSamples = all.some((p) => p.sample);

  return (
    <>
      <PageHero eyebrow="Products" title="Digital products & technology packages" crumbs={[{ label: "Products" }]}
        intro="Packaged software, websites and internet services designed for businesses that want a clear starting point." />
      <section className="section">
        <div className="container">
          {hasSamples && (
            <Note>
              <p><strong>These are sample listings for demonstration.</strong> Product names, descriptions and prices on this page show how the catalogue will look. They are not current offers, stock or supplier arrangements. You are welcome to enquire about similar work.</p>
            </Note>
          )}
          <nav aria-label="Product categories">
            <ul className="filters">
              <li><Link href="/products" aria-current={!active ? "true" : undefined}>All ({all.length})</Link></li>
              {categories.map((c) => (
                <li key={c}><Link href={`/products?category=${slugify(c)}`} aria-current={active === c ? "true" : undefined}>{c} ({all.filter((p) => p.category === c).length})</Link></li>
              ))}
            </ul>
          </nav>
          {list.length ? (
            <div className="grid grid-3">{list.map((p, i) => <ProductCard key={p.slug} p={p} index={i} />)}</div>
          ) : (
            <div className="empty">
              <p><strong>No products are listed yet.</strong></p>
              <p>Products will appear here as they become available. In the meantime, tell us what you need.</p>
              <Link className="btn btn-primary" href="/quote">Make an enquiry <Svg name="arrow" /></Link>
            </div>
          )}
        </div>
      </section>
      <Cta title="Need something that is not listed?" text="Most work is tailored. Describe what you need and we will reply with options." />
    </>
  );
}
