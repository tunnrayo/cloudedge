import type { MetadataRoute } from "next";
import { company, services } from "@/lib/site";
import { getProducts } from "@/lib/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = company.siteUrl;
  const realProducts = (await getProducts()).filter((p) => !p.sample).map((p) => `/products/${p.slug}`);
  const pages = ["", "/about", "/services", "/solutions", "/products", "/portfolio", "/contact", "/quote", "/faq", "/privacy", "/terms", ...services.map((s) => `/services/${s.slug}`), ...realProducts];
  return pages.map((p) => ({ url: base + p, lastModified: new Date(), priority: p === "" ? 1 : p.startsWith("/services") ? 0.8 : 0.6 }));
}
