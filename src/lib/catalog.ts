/**
 * DATA ACCESS FOR PRODUCTS AND PROJECTS
 *
 * Pages call these functions instead of importing the data arrays directly.
 * Today they read from src/content/*.ts. To move products into a database or an
 * authorised external API later, change only the body of these functions —
 * the page designs do not need to change.
 */
import { products, productCategories, type Product } from "@/content/products";
import { projects, type Project } from "@/content/projects";
import { settings } from "@/lib/site";

export async function getProducts(): Promise<Product[]> {
  return products.filter((p) => !p.sample || settings.showSampleProducts);
}
export async function getProduct(slug: string): Promise<Product | undefined> {
  return (await getProducts()).find((p) => p.slug === slug);
}
export async function getFeaturedProducts(limit = 3): Promise<Product[]> {
  const all = await getProducts();
  const featured = all.filter((p) => p.featured);
  return (featured.length ? featured : all).slice(0, limit);
}
export async function getProductCategories(): Promise<string[]> {
  const used = new Set((await getProducts()).map((p) => p.category));
  return productCategories.filter((c) => used.has(c));
}
export async function getProjects(): Promise<Project[]> {
  return projects.filter((p) => p.kind === "client" || settings.showDemoProjects);
}
