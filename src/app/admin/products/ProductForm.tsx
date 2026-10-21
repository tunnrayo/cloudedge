import type { Product } from "@/lib/shop/products";
import { CATEGORIES, FX_RATE_NGN_PER_USD, MARKUP_NGN } from "@/content/catalogue";
import { FULFILMENT_LABEL, REF_TYPE_LABEL, RESALE_LABEL, VERIFICATION_LABEL } from "@/lib/shop/format";
import { saveProductAction } from "../shop-actions";

const UNITS: Record<string, string> = { subscription: "per subscription", user: "per user", seat: "per seat", licence: "per licence", device_pack: "device bundle", site: "per site", computer: "per computer", editor: "per editor", domain: "per domain", workspace: "per workspace" };
const PERIODS: Record<string, string> = { month: "Monthly", year: "Annual", one_time: "One-time", term: "Fixed term" };

export default function ProductForm({ p }: { p?: Product }) {
  const d = p;
  return (
    <form action={saveProductAction} className="stack">
      <input type="hidden" name="id" value={d?.id ?? ""} />
      <section className="card">
        <h2 className="h-small">Basics</h2>
        <div className="admin-grid">
          <div className="field"><label htmlFor="name">Product name</label><input id="name" name="name" required defaultValue={d?.name} /></div>
          <div className="field"><label htmlFor="brand">Brand / vendor</label><input id="brand" name="brand" defaultValue={d?.brand} /></div>
          <div className="field"><label htmlFor="sku">SKU</label><input id="sku" name="sku" defaultValue={d?.sku} placeholder="Auto if empty" /></div>
          <div className="field"><label htmlFor="slug">URL slug</label><input id="slug" name="slug" defaultValue={d?.slug} placeholder="Made from the name if empty" /></div>
          <div className="field"><label htmlFor="category">Category</label><select id="category" name="category" defaultValue={d?.category ?? CATEGORIES[0]}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="field"><label htmlFor="status">Visibility</label><select id="status" name="status" defaultValue={d?.status ?? "draft"}><option value="published">Published</option><option value="draft">Draft (hidden)</option><option value="archived">Archived (hidden)</option></select></div>
        </div>
        <div className="field"><label htmlFor="description">Description</label><textarea id="description" name="description" defaultValue={d?.description} /></div>
        <div className="admin-grid">
          <div className="field"><label htmlFor="coverage">Licence / coverage</label><input id="coverage" name="coverage" defaultValue={d?.coverage} placeholder="e.g. 5 devices; annual subscription" /></div>
          <div className="field"><label htmlFor="platforms">Platforms <span className="opt">(only if stated by vendor)</span></label><input id="platforms" name="platforms" defaultValue={d?.platforms} /></div>
          <div className="field"><label htmlFor="chips">Image/plan highlights (comma separated, max 4)</label><input id="chips" name="chips" defaultValue={d?.chips.join(", ")} /></div>
          <label className="check" style={{ marginTop: 28 }}><input type="checkbox" name="featured" defaultChecked={d?.featured} /> Feature on home page</label>
        </div>
      </section>

      <section className="card">
        <h2 className="h-small">Pricing</h2>
        <div className="admin-grid">
          <div className="field"><label htmlFor="reference_amount">Online reference price</label><input id="reference_amount" name="reference_amount" inputMode="decimal" required defaultValue={d?.referenceAmount} /></div>
          <div className="field"><label htmlFor="reference_currency">Reference currency</label><select id="reference_currency" name="reference_currency" defaultValue={d?.referenceCurrency ?? "NGN"}><option>NGN</option><option>USD</option></select></div>
          <div className="field"><label htmlFor="fx_rate">Exchange rate ₦ per US$1 <span className="opt">(USD only)</span></label><input id="fx_rate" name="fx_rate" inputMode="decimal" defaultValue={d?.fxRate ?? FX_RATE_NGN_PER_USD} /></div>
          <div className="field"><label htmlFor="markup_ngn">Markup (₦)</label><input id="markup_ngn" name="markup_ngn" inputMode="numeric" defaultValue={d?.markupNgn ?? MARKUP_NGN} /></div>
          <div className="field"><label htmlFor="price_ngn">Selling price (₦)</label><input id="price_ngn" name="price_ngn" inputMode="numeric" defaultValue={d?.priceNgn} /></div>
          <label className="check" style={{ marginTop: 28 }}><input type="checkbox" name="recalculate" defaultChecked={!d} /> Recalculate: reference × rate + markup</label>
          <div className="field"><label htmlFor="billing_period">Billing</label><select id="billing_period" name="billing_period" defaultValue={d?.billingPeriod ?? "year"}>{Object.entries(PERIODS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div className="field"><label htmlFor="price_unit">Priced</label><select id="price_unit" name="price_unit" defaultValue={d?.priceUnit ?? "subscription"}>{Object.entries(UNITS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div className="field"><label htmlFor="billing_note">Billing note</label><input id="billing_note" name="billing_note" defaultValue={d?.billingNote} placeholder="e.g. Vendor bills annually / for the first 27 months" /></div>
          <div className="field"><label htmlFor="reference_type">Reference price type</label><select id="reference_type" name="reference_type" defaultValue={d?.referenceType ?? "standard"}>{Object.entries(REF_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div className="field"><label htmlFor="reference_label">Reference price as shown by source</label><input id="reference_label" name="reference_label" defaultValue={d?.referenceLabel} /></div>
          <div className="field"><label htmlFor="reference_source_name">Price source name</label><input id="reference_source_name" name="reference_source_name" defaultValue={d?.referenceSourceName} /></div>
          <div className="field"><label htmlFor="reference_source_url">Price source URL</label><input id="reference_source_url" name="reference_source_url" type="url" defaultValue={d?.referenceSourceUrl} /></div>
          <div className="field"><label htmlFor="price_verification">Price verification</label><select id="price_verification" name="price_verification" defaultValue={d?.priceVerification ?? "needs_verification"}>{Object.entries(VERIFICATION_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div className="field"><label htmlFor="price_verified_at">Last price check</label><input id="price_verified_at" name="price_verified_at" type="date" defaultValue={d?.priceVerifiedAt ?? ""} /></div>
        </div>
        <div className="field"><label htmlFor="verification_note">Verification note</label><textarea id="verification_note" name="verification_note" defaultValue={d?.verificationNote} style={{ minHeight: 70 }} /></div>
        {d?.listedPriceNgn != null && d.listedPriceNgn !== d.priceNgn && <p className="hint">The supplied catalogue document listed ₦{d.listedPriceNgn.toLocaleString("en-NG")} for this product.</p>}
      </section>

      <section className="card">
        <h2 className="h-small">Selling &amp; fulfilment</h2>
        <div className="admin-grid">
          <div className="field"><label htmlFor="resale_status">Resale permission</label><select id="resale_status" name="resale_status" defaultValue={d?.resaleStatus ?? "unconfirmed"}>{Object.entries(RESALE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <p className="hint">Only choose “authorised” once you have confirmed the vendor allows you to resell or supply this product.</p></div>
          <div className="field"><label htmlFor="sale_mode">Sale mode</label><select id="sale_mode" name="sale_mode" defaultValue={d?.saleMode ?? "enquiry"}><option value="enquiry">Enquiry only (“Available on request”)</option><option value="purchase">Buy online (checkout)</option></select></div>
          <div className="field"><label htmlFor="fulfilment_type">Fulfilment</label><select id="fulfilment_type" name="fulfilment_type" defaultValue={d?.fulfilmentType ?? "manual_sourcing"}>{Object.entries(FULFILMENT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div className="field"><label htmlFor="delivery_estimate">Delivery expectation (shown to customers)</label><input id="delivery_estimate" name="delivery_estimate" defaultValue={d?.deliveryEstimate} /></div>
          <div className="field"><label htmlFor="max_quantity">Maximum quantity per order</label><input id="max_quantity" name="max_quantity" inputMode="numeric" defaultValue={d?.maxQuantity ?? 1} /></div>
          <div className="field"><label htmlFor="quantity_label">Quantity label</label><input id="quantity_label" name="quantity_label" defaultValue={d?.quantityLabel ?? "Quantity"} placeholder="e.g. Users, Licences" /></div>
          <div className="field"><label htmlFor="option_label">Customer option question <span className="opt">(optional)</span></label><input id="option_label" name="option_label" defaultValue={d?.optionLabel} placeholder="e.g. Domain name you want" /></div>
          <label className="check" style={{ marginTop: 28 }}><input type="checkbox" name="option_required" defaultChecked={d?.optionRequired} /> Option is required</label>
        </div>
        <div className="field"><label htmlFor="fulfilment_note">How it is delivered (shown to customers)</label><textarea id="fulfilment_note" name="fulfilment_note" defaultValue={d?.fulfilmentNote} style={{ minHeight: 80 }} /></div>
        <div className="admin-grid">
          <div className="field"><label htmlFor="supplier_name">Default supplier</label><input id="supplier_name" name="supplier_name" defaultValue={d?.supplierName} /></div>
          <div className="field"><label htmlFor="supplier_url">Supplier link</label><input id="supplier_url" name="supplier_url" type="url" defaultValue={d?.supplierUrl} /></div>
        </div>
        <div className="field"><label htmlFor="supplier_notes">Supplier research notes (internal)</label><textarea id="supplier_notes" name="supplier_notes" defaultValue={d?.supplierNotes} style={{ minHeight: 70 }} /></div>
      </section>

      <section className="card">
        <h2 className="h-small">Image</h2>
        <div className="field"><label htmlFor="image">Upload a new image <span className="opt">(PNG, JPEG or WebP, up to 2 MB)</span></label><input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp" /></div>
        <p className="hint">Use only images you have the right to use (for example an official image from the vendor&apos;s partner or press kit). Uploads are stored in the database.</p>
        {d?.imageId && <label className="check"><input type="checkbox" name="remove_image" /> Remove the uploaded image (go back to the generated logo image)</label>}
        <div className="field"><label htmlFor="image_alt">Image description (alt text)</label><input id="image_alt" name="image_alt" defaultValue={d?.imageAlt} /></div>
      </section>
      <div><button className="btn btn-primary" type="submit">{d ? "Save changes" : "Create product"}</button></div>
    </form>
  );
}
