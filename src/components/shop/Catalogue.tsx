import Link from "next/link";
import ProductCard from "./ProductCard";
import { Svg } from "@/components/Icon";
import { categoryCounts, categorySlug, listProducts, SORTS, type ListFilters } from "@/lib/shop/products";

export type CatalogueParams = { q?: string; category?: string; billing?: string; min?: string; max?: string; sort?: string; availability?: string };
const BILLING = [["", "Any billing"], ["month", "Monthly"], ["year", "Annual"], ["one_time", "One-time"], ["term", "Fixed term"]] as const;
const SORT_LABEL: Record<string, string> = { featured: "Featured", "price-asc": "Price: low to high", "price-desc": "Price: high to low", "name-asc": "Name: A–Z", "name-desc": "Name: Z–A", newest: "Newest" };

/** Server-rendered catalogue with search, filters and sorting (works without JavaScript). */
export default async function Catalogue({ params, fixedCategory }: { params: CatalogueParams; fixedCategory?: string }) {
  const num = (v?: string) => (v && /^\d{1,9}$/.test(v) ? Number(v) : undefined);
  const counts = await categoryCounts();
  const category = fixedCategory ?? counts.find((c) => categorySlug(c.category) === params.category)?.category;
  const filters: ListFilters = {
    q: params.q?.trim().slice(0, 80) || undefined, category, billing: BILLING.some(([v]) => v && v === params.billing) ? params.billing : undefined,
    min: num(params.min), max: num(params.max), sort: params.sort && SORTS[params.sort] ? params.sort : "featured",
    availability: params.availability === "available" || params.availability === "unavailable" ? params.availability : undefined,
  };
  const products = await listProducts(filters);
  const total = counts.reduce((a, c) => a + c.count, 0);
  const action = fixedCategory ? `/products/category/${categorySlug(fixedCategory)}` : "/products";
  const active = Boolean(filters.q || filters.billing || filters.min || filters.max || filters.availability || (!fixedCategory && category));

  return (
    <div className="shop-layout">
      <aside className="shop-side" aria-label="Product categories">
        <h2 className="side-title">Categories</h2>
        <ul className="cat-list">
          <li><Link href="/products" aria-current={!category ? "page" : undefined}>All products <span>{total}</span></Link></li>
          {counts.map((c) => (
            <li key={c.category}><Link href={`/products/category/${categorySlug(c.category)}`} aria-current={category === c.category ? "page" : undefined}>{c.category} <span>{c.count}</span></Link></li>
          ))}
        </ul>
      </aside>
      <div>
        <form className="shop-filters" method="get" action={action} role="search" aria-label="Search and filter products">
          <div className="field grow"><label htmlFor="f-q">Search</label><input id="f-q" name="q" type="search" defaultValue={filters.q} placeholder="Product, brand or keyword" maxLength={80} /></div>
          {!fixedCategory && (
            <div className="field"><label htmlFor="f-cat">Category</label>
              <select id="f-cat" name="category" defaultValue={category ? categorySlug(category) : ""}><option value="">All categories</option>{counts.map((c) => <option key={c.category} value={categorySlug(c.category)}>{c.category}</option>)}</select></div>
          )}
          <div className="field"><label htmlFor="f-bill">Billing</label>
            <select id="f-bill" name="billing" defaultValue={filters.billing ?? ""}>{BILLING.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div className="field small"><label htmlFor="f-min">Min ₦</label><input id="f-min" name="min" inputMode="numeric" pattern="[0-9]*" defaultValue={params.min ?? ""} /></div>
          <div className="field small"><label htmlFor="f-max">Max ₦</label><input id="f-max" name="max" inputMode="numeric" pattern="[0-9]*" defaultValue={params.max ?? ""} /></div>
          <div className="field"><label htmlFor="f-av">Availability</label>
            <select id="f-av" name="availability" defaultValue={filters.availability ?? ""}><option value="">All</option><option value="available">Available to request</option><option value="unavailable">Currently unavailable</option></select></div>
          <div className="field"><label htmlFor="f-sort">Sort by</label>
            <select id="f-sort" name="sort" defaultValue={filters.sort}>{Object.keys(SORTS).map((s) => <option key={s} value={s}>{SORT_LABEL[s]}</option>)}</select></div>
          <div className="filter-actions">
            <button className="btn btn-primary btn-sm" type="submit">Apply</button>
            {active && <Link className="btn btn-outline btn-sm" href={action}>Clear</Link>}
          </div>
        </form>
        <p className="muted result-count" aria-live="polite">{products.length} product{products.length === 1 ? "" : "s"}{category ? ` in ${category}` : ""}{filters.q ? ` matching “${filters.q}”` : ""}</p>
        {products.length ? (
          <div className="grid grid-3">{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        ) : (
          <div className="empty">
            <p><strong>No products match these filters.</strong></p>
            <p>Try a different search, or tell us what you need and we will source it for you.</p>
            <div className="actions" style={{ justifyContent: "center", marginTop: 12 }}>
              <Link className="btn btn-outline btn-sm" href={action}>Clear filters</Link>
              <Link className="btn btn-primary btn-sm" href="/quote">Request a product <Svg name="arrow" /></Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
