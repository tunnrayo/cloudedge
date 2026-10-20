import type { MetadataRoute } from "next";
import { company, services } from "@/lib/site";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = company.siteUrl.replace(/\/$/, "");
  const pages = ["", "/about", "/services", "/solutions", "/portfolio", "/contact", "/quote", "/faq", "/privacy", "/terms", ...services.map((s) => `/services/${s.slug}`)];
  return pages.map((p) => ({ url: base + p, lastModified: new Date() }));
}
