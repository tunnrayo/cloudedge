/**
 * Imports the combined catalogue (src/content/catalogue.ts) into the database ONCE.
 * Re-running is safe: products are matched by slug and never duplicated, and an admin's later
 * edits or deletions are not overwritten (the import only runs while meta.catalogue_seed is unset).
 */
import { randomUUID } from "node:crypto";
import type { Db } from "@/lib/db";
import { catalogue, sellingPrice, CATALOGUE_DATE, FX_RATE_NGN_PER_USD, MARKUP_NGN } from "@/content/catalogue";

export const SEED_VERSION = "2026-10-21-v1";
const FEATURED = new Set(["microsoft-365-family", "google-workspace-business-starter-annual", "adobe-creative-cloud-all-apps", "norton-360-deluxe", "bitdefender-total-security", "github-copilot-pro"]);

export const DEFAULT_FULFILMENT_NOTE =
  "Manual fulfilment: after your payment is confirmed, Cloud Edge purchases or provisions this product from the vendor or a supplier and emails you the activation instructions. If the supplier's price or availability has changed, we will ask for your approval or refund you before going ahead.";
export const DEFAULT_DELIVERY_ESTIMATE = "We confirm the expected activation date by email after your order is paid.";

export async function seedCatalogueIfNeeded(db: Db, force = false): Promise<number> {
  if (!force) {
    const done = await db.query<{ value: string }>("SELECT value FROM meta WHERE key = 'catalogue_seed'");
    if (done.rows.length) return 0;
  }
  let inserted = 0;
  await db.tx(async (q) => {
    for (const [i, p] of catalogue.entries()) {
      const r = await q(
        `INSERT INTO products (id, sku, slug, name, brand, category, description, coverage, platforms, billing_period, billing_note, price_unit,
           reference_amount, reference_currency, reference_label, reference_type, reference_source_name, reference_source_url, fx_rate, markup_ngn,
           price_ngn, listed_price_ngn, price_verification, price_verified_at, verification_note, supplier_name, supplier_url,
           fulfilment_type, fulfilment_note, delivery_estimate, resale_status, sale_mode, status, max_quantity, quantity_label,
           option_label, option_required, chips, image_path, image_alt, featured, sort_order, source_document)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,
           'manual_sourcing',$28,$29,'unconfirmed','enquiry','published',$30,$31,$32,$33,$34,$35,$36,$37,$38,$39)
         ON CONFLICT (slug) DO NOTHING`,
        [randomUUID(), p.sku, p.slug, p.name, p.brand, p.category, p.description, p.coverage, p.platforms ?? "", p.billing, p.billingNote ?? "", p.unit,
          p.ref.amount, p.ref.currency, p.ref.label, p.ref.type, p.ref.sourceName, p.ref.sourceUrl, p.ref.currency === "USD" ? FX_RATE_NGN_PER_USD : null, MARKUP_NGN,
          sellingPrice(p.ref), p.listedPrice, p.verification, CATALOGUE_DATE, (p.verificationNote ?? "").trim(), p.ref.sourceName, p.ref.sourceUrl,
          DEFAULT_FULFILMENT_NOTE, DEFAULT_DELIVERY_ESTIMATE, p.quantity?.max ?? 1, p.quantity?.label ?? "Quantity",
          p.option?.label ?? "", p.option?.required ?? false, JSON.stringify(p.chips), `/products/${p.slug}.svg`,
          `${p.name} — ${p.brand} logo and plan details`, FEATURED.has(p.slug), i, p.doc === "A" ? "CloudEdge_Verified_Priced_Catalogue.docx" : "CloudEdge_30_Additional_Verified_Priced_Products.docx"],
      );
      inserted += r.rowCount;
    }
    await q(`INSERT INTO meta (key, value) VALUES ('catalogue_seed', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [SEED_VERSION]);
  });
  if (inserted) console.log(`[db] imported ${inserted} catalogue products`);
  return inserted;
}
