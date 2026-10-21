import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Svg } from "@/components/Icon";
import { Cta, PageHero } from "@/components/ui";
import AddToCart from "@/components/shop/AddToCart";
import ProductCard from "@/components/shop/ProductCard";
import ProductImage from "@/components/shop/ProductImage";
import { getProduct, imageUrl, isPurchasable, priceSuffix, purchaseBlockers, relatedProducts, categorySlug } from "@/lib/shop/products";
import { FULFILMENT_LABEL, REF_TYPE_LABEL, VERIFICATION_LABEL, formatDate, naira } from "@/lib/shop/format";
import { company } from "@/lib/site";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await getProduct((await params).slug).catch(() => null);
  if (!p) return {};
  return {
    title: `${p.name} — ${naira(p.priceNgn)} ${priceSuffix(p)}`,
    description: `${p.description} ${p.coverage}.`.slice(0, 160),
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { images: [{ url: imageUrl(p), alt: p.imageAlt }] },
  };
}

const BILLING: Record<string, string> = { month: "Monthly", year: "Annual", one_time: "One-time purchase", term: "Fixed term" };

export default async function ProductPage({ params }: P) {
  const p = await getProduct((await params).slug);
  if (!p) notFound();
  const related = await relatedProducts(p, 4);
  const buyable = isPurchasable(p);
  const blockers = purchaseBlockers(p);
  const isUsd = p.referenceCurrency === "USD";
  const officialLogo = !p.imageId && !["Parallels", "Acronis", "IDrive", "Otter.ai"].includes(p.brand);

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: p.name, sku: p.sku, brand: { "@type": "Brand", name: p.brand }, category: p.category, description: p.description,
    image: `${company.siteUrl}${imageUrl(p)}`,
    ...(buyable ? { offers: { "@type": "Offer", priceCurrency: "NGN", price: p.priceNgn, availability: "https://schema.org/PreOrder", seller: { "@type": "Organization", name: company.name }, url: `${company.siteUrl}/products/${p.slug}` } } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHero eyebrow={p.brand} title={p.name} crumbs={[{ href: "/products", label: "Products" }, { href: `/products/category/${categorySlug(p.category)}`, label: p.category }, { label: p.name }]} />
      <section className="section tight">
        <div className="container pdp">
          <div className="pdp-media">
            <div className="card product-card"><div className="product-media light"><ProductImage src={imageUrl(p)} alt={p.imageAlt || p.name} eager /></div></div>
            <p className="caption">
              {p.imageId ? "Product image supplied by Cloud Edge." : officialLogo
                ? `Image: the official ${p.brand} logo with this plan's details, used to identify the product. Not a screenshot or box shot.`
                : `Image: illustration only — no official ${p.brand} logo is shown.`}
            </p>
          </div>

          <div className="pdp-info">
            <div className="pdp-price">
              <div><span className="big-price">{naira(p.priceNgn)}</span> <span className="per">{priceSuffix(p)}</span></div>
              {p.billingNote && p.billingPeriod !== "term" && <p className="muted small">{p.billingNote}</p>}
              <p className="muted small">
                Reference price: {p.referenceLabel} from{" "}
                <a href={p.referenceSourceUrl} target="_blank" rel="noopener noreferrer nofollow">{p.referenceSourceName}</a>.
                {isUsd && <> Converted at ₦{(p.fxRate ?? 0).toLocaleString("en-NG")} per US$1.</>}
                {p.priceVerifiedAt && <> Last checked {formatDate(p.priceVerifiedAt)}.</>}
              </p>
              {p.priceVerification === "needs_verification" && <div className="note" role="note"><Svg name="alert" /><p><strong>Price under review.</strong> This price must be re-confirmed before it can be sold online. Request it and we will confirm the current price.</p></div>}
            </div>

            <p>{p.description}</p>
            {p.chips.length > 0 && <ul className="tag-list" aria-label="Plan highlights">{p.chips.map((c) => <li key={c}><span>{c}</span></li>)}</ul>}

            <div className="card buy-card">
              {buyable ? (
                <>
                  <h2 className="h-small">Buy online</h2>
                  <AddToCart slug={p.slug} name={p.name} maxQuantity={p.maxQuantity} quantityLabel={p.quantityLabel} optionLabel={p.optionLabel} optionRequired={p.optionRequired} />
                  <p className="muted small" style={{ marginTop: 12 }}>Secure payment by Paystack. {p.deliveryEstimate}</p>
                </>
              ) : (
                <>
                  <h2 className="h-small">Available on request</h2>
                  <p className="small">This product is not sold online yet{blockers.some((b) => b.startsWith("Resale")) ? " while we confirm supply arrangements with the vendor" : ""}. Send a request and we will reply by email with availability, the confirmed price and how it will be supplied. Nothing is charged until you agree.</p>
                  <Link className="btn btn-primary" style={{ width: "100%" }} href={`/quote?product=${p.slug}`}>Request this product <Svg name="arrow" /></Link>
                </>
              )}
            </div>

            <div className="note" role="note" style={{ marginTop: 18 }}><Svg name="info" /><p><strong>How it is delivered:</strong> {p.fulfilmentNote}</p></div>
          </div>
        </div>
      </section>

      <section className="section tight soft" aria-labelledby="spec-title">
        <div className="container narrow">
          <h2 id="spec-title" style={{ fontSize: "1.4rem" }}>Product details</h2>
          <dl className="details spec">
            <dt>Product code</dt><dd>{p.sku}</dd>
            <dt>Brand</dt><dd>{p.brand}</dd>
            <dt>Category</dt><dd>{p.category}</dd>
            <dt>Licence / coverage</dt><dd>{p.coverage}</dd>
            {p.platforms && (<><dt>Platforms</dt><dd>{p.platforms}</dd></>)}
            <dt>Billing</dt><dd>{BILLING[p.billingPeriod]}{p.billingNote ? ` — ${p.billingNote}` : ""}</dd>
            <dt>Our price</dt><dd>{naira(p.priceNgn)} {priceSuffix(p)}</dd>
            <dt>Reference price</dt><dd>{p.referenceLabel} ({(REF_TYPE_LABEL[p.referenceType] ?? p.referenceType).toLowerCase()}) — <a href={p.referenceSourceUrl} target="_blank" rel="noopener noreferrer nofollow">{p.referenceSourceName}</a></dd>
            <dt>Price check</dt><dd>{VERIFICATION_LABEL[p.priceVerification]}{p.priceVerifiedAt ? ` (${formatDate(p.priceVerifiedAt)})` : ""}{p.verificationNote ? `. ${p.verificationNote}` : ""}</dd>
            <dt>Fulfilment</dt><dd>{FULFILMENT_LABEL[p.fulfilmentType] ?? p.fulfilmentType}</dd>
            <dt>Delivery</dt><dd>{p.deliveryEstimate}</dd>
          </dl>
          <p className="muted small" style={{ marginTop: 16 }}>{p.brand} and its product names are trademarks of their owner. {company.short} is not affiliated with or endorsed by {p.brand} unless stated. Vendor terms of use apply to every product.</p>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section tight" aria-labelledby="rel-title">
          <div className="container">
            <h2 id="rel-title">Related products</h2>
            <div className="grid grid-4" style={{ marginTop: 20 }}>{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
          </div>
        </section>
      )}
      <Cta />
    </>
  );
}
