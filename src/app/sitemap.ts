import type { MetadataRoute } from "next";
import { company, services } from "@/lib/site";
import { categoryCounts, categorySlug, listProducts } from "@/lib/shop/products";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = company.siteUrl;
  const pages = ["", "/about", "/services", "/solutions", "/products", "/portfolio", "/contact", "/quote", "/faq", "/privacy", "/terms", "/refund-policy", ...services.map((s) => `/services/${s.slug}`)];
  let shop: string[] = [];
  try {
    const [products, cats] = await Promise.all([listProducts(), categoryCounts()]);
    shop = [...cats.map((c) => `/products/category/${categorySlug(c.category)}`), ...products.map((p) => `/products/${p.slug}`)];
  } catch { /* database unavailable: list static pages only */ }
  return [...pages, ...shop].map((p) => ({ url: base + p, lastModified: new Date(), priority: p === "" ? 1 : p.startsWith("/products/") ? 0.7 : 0.6 }));
}
