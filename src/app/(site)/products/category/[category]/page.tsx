import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Catalogue, { type CatalogueParams } from "@/components/shop/Catalogue";
import { Cta, PageHero } from "@/components/ui";
import { ShopNotice } from "@/components/shop/ShopNotice";
import { categoryCounts, categorySlug } from "@/lib/shop/products";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ category: string }>; searchParams: Promise<CatalogueParams> };

async function find(slug: string) {
  return (await categoryCounts()).find((c) => categorySlug(c.category) === slug)?.category;
}
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = await find((await params).category).catch(() => undefined);
  return c ? { title: `${c} — Shop`, description: `${c} products sourced on request by Cloud Edge Technology Services Limited — indicative naira prices, quotation before payment.`, alternates: { canonical: `/products/category/${categorySlug(c)}` } } : {};
}
export default async function CategoryPage({ params, searchParams }: P) {
  const c = await find((await params).category);
  if (!c) notFound();
  return (
    <>
      <PageHero eyebrow="Shop" title={c} crumbs={[{ href: "/products", label: "Products" }, { label: c }]} />
      <section className="section tight">
        <div className="container">
          <ShopNotice />
          <Catalogue params={await searchParams} fixedCategory={c} />
        </div>
      </section>
      <Cta />
    </>
  );
}
