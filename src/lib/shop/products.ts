/** Product queries (server-only). The storefront and admin both read products from here. */
import "server-only";
import { getDb, type Row } from "@/lib/db";
import { billingSuffix, naira } from "@/lib/shop/format";

export type Product = {
  id: string; sku: string; slug: string; name: string; brand: string; category: string;
  description: string; coverage: string; platforms: string;
  billingPeriod: "month" | "year" | "one_time" | "term"; billingNote: string; priceUnit: string;
  referenceAmount: number; referenceCurrency: "USD" | "NGN"; referenceLabel: string; referenceType: string;
  referenceSourceName: string; referenceSourceUrl: string; fxRate: number | null; markupNgn: number;
  priceNgn: number; listedPriceNgn: number | null;
  priceVerification: "verified" | "catalogue" | "needs_verification"; priceVerifiedAt: string | null; verificationNote: string;
  supplierName: string; supplierUrl: string; supplierNotes: string;
  fulfilmentType: string; fulfilmentNote: string; deliveryEstimate: string;
  resaleStatus: "unconfirmed" | "authorised" | "affiliate" | "not_permitted"; saleMode: "purchase" | "enquiry";
  status: "draft" | "published" | "archived"; maxQuantity: number; quantityLabel: string;
  optionLabel: string; optionRequired: boolean; chips: string[];
  imagePath: string; imageId: string | null; imageAlt: string; featured: boolean; sortOrder: number; sourceDocument: string;
  createdAt: string; updatedAt: string;
};

export function rowToProduct(r: Row): Product {
  const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : "");
  return {
    id: String(r.id), sku: String(r.sku), slug: String(r.slug), name: String(r.name), brand: String(r.brand), category: String(r.category),
    description: String(r.description), coverage: String(r.coverage), platforms: String(r.platforms),
    billingPeriod: r.billing_period as Product["billingPeriod"], billingNote: String(r.billing_note), priceUnit: String(r.price_unit),
    referenceAmount: Number(r.reference_amount), referenceCurrency: r.reference_currency as "USD" | "NGN", referenceLabel: String(r.reference_label),
    referenceType: String(r.reference_type), referenceSourceName: String(r.reference_source_name), referenceSourceUrl: String(r.reference_source_url),
    fxRate: r.fx_rate == null ? null : Number(r.fx_rate), markupNgn: Number(r.markup_ngn), priceNgn: Number(r.price_ngn),
    listedPriceNgn: r.listed_price_ngn == null ? null : Number(r.listed_price_ngn),
    priceVerification: r.price_verification as Product["priceVerification"], priceVerifiedAt: r.price_verified_at ? iso(r.price_verified_at).slice(0, 10) : null,
    verificationNote: String(r.verification_note), supplierName: String(r.supplier_name), supplierUrl: String(r.supplier_url), supplierNotes: String(r.supplier_notes),
    fulfilmentType: String(r.fulfilment_type), fulfilmentNote: String(r.fulfilment_note), deliveryEstimate: String(r.delivery_estimate),
    resaleStatus: r.resale_status as Product["resaleStatus"], saleMode: r.sale_mode as Product["saleMode"], status: r.status as Product["status"],
    maxQuantity: Number(r.max_quantity), quantityLabel: String(r.quantity_label), optionLabel: String(r.option_label), optionRequired: Boolean(r.option_required),
    chips: Array.isArray(r.chips) ? (r.chips as string[]) : JSON.parse(String(r.chips ?? "[]")),
    imagePath: String(r.image_path), imageId: r.image_id ? String(r.image_id) : null, imageAlt: String(r.image_alt),
    featured: Boolean(r.featured), sortOrder: Number(r.sort_order), sourceDocument: String(r.source_document), createdAt: iso(r.created_at), updatedAt: iso(r.updated_at),
  };
}

/** Public URL of the product's current image (uploaded image wins over the generated one). */
export const imageUrl = (p: Pick<Product, "imageId" | "imagePath" | "slug">) => (p.imageId ? `/api/images/${p.imageId}` : p.imagePath || `/products/${p.slug}.svg`);
export const priceSuffix = (p: Pick<Product, "billingPeriod" | "priceUnit" | "billingNote">) => billingSuffix(p.billingPeriod, p.priceUnit, p.billingPeriod === "term" ? p.billingNote : "");
export const priceLabel = (p: Product) => `${naira(p.priceNgn)} ${priceSuffix(p)}`;

/**
 * Manual sourcing: any published product can be REQUESTED (no payment at request time).
 * An admin can mark a product unavailable (fulfilment "unavailable") to stop new requests.
 */
export function requestBlockers(p: Pick<Product, "status" | "fulfilmentType">): string[] {
  const out: string[] = [];
  if (p.status !== "published") out.push("Product is not published.");
  if (p.fulfilmentType === "unavailable") out.push("Product is marked unavailable.");
  return out;
}
export const isRequestable = (p: Product) => requestBlockers(p).length === 0;

export type ListFilters = { q?: string; category?: string; billing?: string; min?: number; max?: number; sort?: string; availability?: string };
export const SORTS: Record<string, string> = {
  featured: "featured DESC, sort_order ASC",
  "price-asc": "price_ngn ASC, name ASC",
  "price-desc": "price_ngn DESC, name ASC",
  "name-asc": "name ASC",
  "name-desc": "name DESC",
  newest: "created_at DESC, sort_order ASC",
};

export async function listProducts(f: ListFilters = {}, opts: { admin?: boolean } = {}): Promise<Product[]> {
  const db = await getDb();
  const where: string[] = []; const params: unknown[] = [];
  if (!opts.admin) where.push("status = 'published'");
  if (f.q) {
    const terms = f.q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
    for (const t of terms) {
      params.push(`%${t.replace(/[\\%_]/g, (m) => "\\" + m)}%`);
      where.push(`LOWER(name || ' ' || brand || ' ' || category || ' ' || description || ' ' || sku) LIKE $${params.length}`);
    }
  }
  if (f.category) { params.push(f.category); where.push(`category = $${params.length}`); }
  if (f.billing) { params.push(f.billing); where.push(`billing_period = $${params.length}`); }
  if (f.min != null && Number.isFinite(f.min)) { params.push(f.min); where.push(`price_ngn >= $${params.length}`); }
  if (f.max != null && Number.isFinite(f.max)) { params.push(f.max); where.push(`price_ngn <= $${params.length}`); }
  if (f.availability === "available") where.push("fulfilment_type <> 'unavailable'");
  if (f.availability === "unavailable") where.push("fulfilment_type = 'unavailable'");
  const order = SORTS[f.sort ?? "featured"] ?? SORTS.featured;
  const sql = `SELECT * FROM products ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${order}`;
  return (await db.query(sql, params)).rows.map(rowToProduct);
}

export async function getProduct(slug: string, opts: { admin?: boolean } = {}): Promise<Product | null> {
  const db = await getDb();
  const r = await db.query(`SELECT * FROM products WHERE slug = $1 ${opts.admin ? "" : "AND status = 'published'"}`, [slug]);
  return r.rows[0] ? rowToProduct(r.rows[0]) : null;
}
export async function getProductById(id: string): Promise<Product | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const r = await (await getDb()).query("SELECT * FROM products WHERE id = $1", [id]);
  return r.rows[0] ? rowToProduct(r.rows[0]) : null;
}
export async function getProductsBySlugs(slugs: string[]): Promise<Product[]> {
  if (!slugs.length) return [];
  const r = await (await getDb()).query("SELECT * FROM products WHERE slug = ANY($1::text[]) AND status = 'published'", [slugs]);
  return r.rows.map(rowToProduct);
}
export async function categoryCounts(): Promise<{ category: string; count: number }[]> {
  const r = await (await getDb()).query<{ category: string; n: number }>("SELECT category, COUNT(*)::int AS n FROM products WHERE status = 'published' GROUP BY category ORDER BY category");
  return r.rows.map((x) => ({ category: x.category, count: Number(x.n) }));
}
export async function relatedProducts(p: Product, limit = 4): Promise<Product[]> {
  const r = await (await getDb()).query(
    `SELECT * FROM products WHERE status = 'published' AND id <> $1 AND (category = $2 OR brand = $3)
     ORDER BY (brand = $3) DESC, (category = $2) DESC, ABS(price_ngn - $4) ASC LIMIT $5`, [p.id, p.category, p.brand, p.priceNgn, limit]);
  return r.rows.map(rowToProduct);
}
export const categorySlug = (c: string) => c.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
