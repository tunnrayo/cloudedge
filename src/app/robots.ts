import type { MetadataRoute } from "next";
import { company } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/search", "/cart", "/checkout", "/orders", "/account"] }, sitemap: `${company.siteUrl}/sitemap.xml` };
}
