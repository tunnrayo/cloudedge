"use server";
/** Admin server actions for orders and products. Every action re-checks the admin session first. */
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";
import { getDb } from "@/lib/db";
import {
  addInternalNote, completeRefund, confirmPayment, decideQuote, expireQuotes, getOrderById, recordManualPayment, recordRefund, saveDraftQuote, sendCustomerMessage,
  sendPaymentInstructions, sendQuote, setNextAction, setOrderStatus, updateItemSourcing, type DraftQuoteInput,
} from "@/lib/shop/orders";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/shop/format";
import { CATEGORIES } from "@/content/catalogue";

const str = (f: FormData, k: string, max = 500) => String(f.get(k) ?? "").trim().slice(0, max);
const num = (f: FormData, k: string) => { const v = str(f, k, 30).replace(/[,₦\s]/g, ""); return v === "" ? 0 : Number(v); };
const back = (id: string, msg: string, kind: "ok" | "err" = "ok", hash = "") => redirect(`/admin/orders/${id}?${kind}=${encodeURIComponent(msg)}${hash}`);
const errMsg = (e: unknown) => (e as Error).message || "Something went wrong.";

/* ------------------------------- Orders ------------------------------- */
export async function orderStatusAction(f: FormData) {
  await requireAdmin();
  const id = str(f, "id", 40);
  const status = str(f, "status", 40) as OrderStatus;
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) back(id, "Choose a status.", "err");
  let result = "";
  try {
    const email = await setOrderStatus(id, status, str(f, "message", 4000), f.get("notify") === "on");
    result = email ? ` Email: ${email.replace("_", " ")}.` : "";
  } catch (e) { back(id, errMsg(e), "err"); }
  revalidatePath("/admin/orders");
  back(id, `Status updated.${result}`);
}

export async function orderMessageAction(f: FormData) {
  await requireAdmin();
  const id = str(f, "id", 40); const message = str(f, "message", 4000);
  if (message.length < 2) back(id, "Write a message first.", "err");
  const r = await sendCustomerMessage(id, message);
  back(id, `Message added to the customer's request page. Email: ${r.replace("_", " ")}.`);
}

export async function orderNoteAction(f: FormData) {
  await requireAdmin();
  const id = str(f, "id", 40); const note = str(f, "note", 4000);
  if (note.length < 2) back(id, "Write a note first.", "err");
  await addInternalNote(id, note);
  back(id, "Internal note saved.");
}

export async function nextActionAction(f: FormData) {
  await requireAdmin();
  const id = str(f, "id", 40);
  await setNextAction(id, str(f, "next_action", 300));
  back(id, "Next action saved.");
}

export async function itemSourcingAction(f: FormData) {
  await requireAdmin();
  const orderId = str(f, "order_id", 40);
  try {
    await updateItemSourcing(str(f, "item_id", 40), {
      sourcing_status: str(f, "sourcing_status", 40), supplier_name: str(f, "supplier_name", 200), supplier_url: str(f, "supplier_url", 500),
      supplier_availability: str(f, "supplier_availability", 200), supplier_price_text: str(f, "supplier_price_text", 200), sourcing_cost_naira: str(f, "sourcing_cost_naira", 30),
      supplier_eta: str(f, "supplier_eta", 100), tracking: str(f, "tracking", 300), expected_delivery: str(f, "expected_delivery", 10),
      fulfilment_notes: str(f, "fulfilment_notes", 4000), delivery_details: str(f, "delivery_details", 4000),
      supply_evidence: str(f, "supply_evidence", 2000), licence_type: str(f, "licence_type", 200), region_eligibility: str(f, "region_eligibility", 20),
      region_notes: str(f, "region_notes", 500), actual_fulfilment_date: str(f, "actual_fulfilment_date", 10), delivery_method: str(f, "delivery_method", 200),
    });
  } catch (e) { back(orderId, errMsg(e), "err", "#items"); }
  back(orderId, "Item sourcing and fulfilment record saved.", "ok", "#items");
}

/** Saves the draft quotation (prices are calculated on the server from the recorded costs and margin). */
export async function saveQuoteAction(f: FormData) {
  await requireAdmin();
  const id = str(f, "id", 40);
  const count = Math.min(50, Math.max(0, Math.floor(num(f, "line_count"))));
  const lines: DraftQuoteInput["lines"] = [];
  for (let i = 0; i < count; i++) {
    if (f.get(`l${i}_include`) !== "on") continue;
    const currency = str(f, `l${i}_currency`, 3).toUpperCase() || "NGN";
    lines.push({
      orderItemId: str(f, `l${i}_item`, 40), quantity: Math.floor(num(f, `l${i}_qty`)), supplierName: str(f, `l${i}_supplier`, 200),
      supplierCurrency: currency, supplierUnitCost: num(f, `l${i}_cost`), fxRate: currency === "NGN" ? 1 : num(f, `l${i}_fx`),
      feesNgn: num(f, `l${i}_fees`), taxesNgn: num(f, `l${i}_taxes`), deliveryNgn: num(f, `l${i}_delivery`),
      marginType: str(f, `l${i}_mtype`, 10) === "fixed" ? "fixed" : "percent", marginValue: num(f, `l${i}_margin`), internalNote: str(f, `l${i}_note`, 1000),
    });
  }
  try {
    await saveDraftQuote(id, {
      lines, expiresAt: str(f, "expires_at", 20), priceChecked: f.get("price_checked") === "on", countrySuitable: f.get("country_suitable") === "on",
      deliveryEstimate: str(f, "delivery_estimate", 300), licenceTerms: str(f, "licence_terms", 500), customerNote: str(f, "customer_note", 2000), internalNote: str(f, "internal_note", 2000),
    });
  } catch (e) { back(id, errMsg(e), "err", "#quote"); }
  back(id, "Draft quotation saved. Check the calculated prices, then send it.", "ok", "#quote");
}

export async function sendQuoteAction(f: FormData) {
  await requireAdmin();
  const id = str(f, "id", 40);
  if (f.get("confirm") !== "on") back(id, "Tick the box to confirm the quotation is correct before sending.", "err", "#quote");
  try { await sendQuote(str(f, "quote_id", 40), f.get("notify") === "on"); }
  catch (e) { back(id, errMsg(e), "err", "#quote"); }
  revalidatePath("/admin/orders");
  back(id, "Quotation sent. The customer can accept or decline it on their request page.", "ok", "#quote");
}

/** Records a decision the customer gave outside the website (e.g. by email or phone). */
export async function adminDecisionAction(f: FormData) {
  await requireAdmin();
  const id = str(f, "id", 40);
  const note = str(f, "note", 1000);
  if (note.length < 5) back(id, "Describe how the customer gave their decision (e.g. “Email from customer, 22 Oct”).", "err", "#quote");
  const o = await getOrderById(id);
  if (!o) back(id, "Order not found", "err");
  try { await decideQuote(o!, str(f, "quote_id", 40), f.get("decision") === "accept" ? "accept" : "decline", "admin", note); }
  catch (e) { back(id, errMsg(e), "err", "#quote"); }
  back(id, "Customer decision recorded.", "ok", "#quote");
}

export async function manualPaymentAction(f: FormData) {
  await requireAdmin();
  const id = str(f, "id", 40);
  if (f.get("confirm") !== "on") back(id, "Tick the box to confirm the money has been received in the company account.", "err", "#payment");
  try { await recordManualPayment(id, { method: str(f, "method", 20), reference: str(f, "reference", 200), amountNaira: num(f, "amount"), paidOn: str(f, "paid_on", 10), note: str(f, "note", 1000) }); }
  catch (e) { back(id, errMsg(e), "err", "#payment"); }
  revalidatePath("/admin/orders");
  back(id, "Manual payment recorded. The order is now Payment confirmed.", "ok", "#payment");
}

export async function paymentInstructionsAction(f: FormData) {
  await requireAdmin();
  const id = str(f, "id", 40);
  let r = "";
  try { r = await sendPaymentInstructions(id, str(f, "instructions", 3000)); }
  catch (e) { back(id, errMsg(e), "err", "#payment"); }
  back(id, `Payment instructions added to the request page. Email: ${r.replace("_", " ")}.`, "ok", "#payment");
}

export async function refundAction(f: FormData) {
  await requireAdmin();
  const id = str(f, "id", 40);
  if (f.get("confirm") !== "yes") back(id, "Tick the confirmation box to record a refund.", "err");
  try { await recordRefund(id, num(f, "amount"), f.get("method") === "paystack" ? "paystack" : "manual", str(f, "reason", 500), f.get("notify") === "on"); }
  catch (e) { back(id, errMsg(e), "err"); }
  back(id, "Refund recorded.");
}

export async function completeRefundAction(f: FormData) {
  await requireAdmin();
  const id = str(f, "id", 40);
  try { await completeRefund(id, f.get("notify") === "on"); } catch (e) { back(id, errMsg(e), "err"); }
  back(id, "Order marked Refunded.");
}

export async function recheckPaymentAction(f: FormData) {
  await requireAdmin();
  const id = str(f, "id", 40);
  const o = await getOrderById(id);
  if (!o?.payment_reference) back(id, "This order has no Paystack payment reference yet.", "err");
  const r = await confirmPayment(o!.payment_reference!, "admin");
  back(id, `Paystack check: ${r.message}`, r.state === "error" ? "err" : "ok");
}

export async function expireQuotesAction() {
  await requireAdmin();
  const n = await expireQuotes();
  redirect(`/admin/orders?queue=quotes&ok=${encodeURIComponent(`${n} expired quotation(s) closed.`)}`);
}

/* ------------------------------- Products ------------------------------- */
const PERIODS = ["month", "year", "one_time", "term"];
const UNITS = ["subscription", "user", "seat", "licence", "device_pack", "site", "computer", "editor", "domain", "workspace"];
const REF_TYPES = ["standard", "renewal", "promotional", "introductory", "starting_from", "annual_billing_monthly_equivalent"];
const FULFIL = ["manual_sourcing", "manual_activation", "supplier_api", "digital_file", "unavailable"];
const RESALE = ["unconfirmed", "authorised", "affiliate", "not_permitted"];
const VERIF = ["verified", "catalogue", "needs_verification"];
const pick = (v: string, list: string[], d: string) => (list.includes(v) ? v : d);
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);

export async function saveProductAction(f: FormData) {
  await requireAdmin();
  const id = str(f, "id", 40);
  const isNew = !id;
  const errBack = (m: string) => redirect(`${isNew ? "/admin/products/new" : `/admin/products/${id}`}?err=${encodeURIComponent(m)}`);

  const name = str(f, "name", 150);
  const slug = slugify(str(f, "slug", 100) || name);
  if (name.length < 2 || !slug) errBack("Name is required.");
  const refAmount = Number(str(f, "reference_amount", 20).replace(/,/g, ""));
  const refCurrency = str(f, "reference_currency", 3) === "USD" ? "USD" : "NGN";
  const fx = refCurrency === "USD" ? Number(str(f, "fx_rate", 20) || "0") : null;
  const markup = Math.round(Number(str(f, "markup_ngn", 20).replace(/,/g, "") || "0"));
  if (!(refAmount > 0)) errBack("Reference price must be a positive number.");
  if (refCurrency === "USD" && !(fx && fx > 0)) errBack("Enter the exchange rate (₦ per US$1) for a USD reference price.");
  let price = Math.round(Number(str(f, "price_ngn", 20).replace(/[,₦\s]/g, "")));
  if (f.get("recalculate") === "on" || !(price > 0)) price = Math.round(refCurrency === "USD" ? refAmount * (fx as number) : refAmount) + markup;
  if (!(price > 0)) errBack("Selling price must be positive.");
  const maxQty = Math.min(1000, Math.max(1, Math.floor(Number(str(f, "max_quantity", 6)) || 1)));
  const category = str(f, "category", 80) || CATEGORIES[0];
  const chips = str(f, "chips", 300).split(",").map((c) => c.trim()).filter(Boolean).slice(0, 4);
  const refUrl = str(f, "reference_source_url", 500); const supUrl = str(f, "supplier_url", 500);
  if ((refUrl && !/^https?:\/\//i.test(refUrl)) || (supUrl && !/^https?:\/\//i.test(supUrl))) errBack("Links must start with http:// or https://");

  const values = {
    sku: str(f, "sku", 30) || `CE-${Date.now().toString().slice(-6)}`, slug, name, brand: str(f, "brand", 80) || name.split(" ")[0], category,
    description: str(f, "description", 3000), coverage: str(f, "coverage", 300), platforms: str(f, "platforms", 200),
    billing_period: pick(str(f, "billing_period", 20), PERIODS, "year"), billing_note: str(f, "billing_note", 200), price_unit: pick(str(f, "price_unit", 20), UNITS, "subscription"),
    reference_amount: refAmount, reference_currency: refCurrency, reference_label: str(f, "reference_label", 200), reference_type: pick(str(f, "reference_type", 40), REF_TYPES, "standard"),
    reference_source_name: str(f, "reference_source_name", 150), reference_source_url: refUrl, fx_rate: fx, markup_ngn: markup, price_ngn: price,
    price_verification: pick(str(f, "price_verification", 30), VERIF, "needs_verification"), price_verified_at: /^\d{4}-\d{2}-\d{2}$/.test(str(f, "price_verified_at", 10)) ? str(f, "price_verified_at", 10) : null,
    verification_note: str(f, "verification_note", 1000), supplier_name: str(f, "supplier_name", 150), supplier_url: supUrl, supplier_notes: str(f, "supplier_notes", 3000),
    fulfilment_type: pick(str(f, "fulfilment_type", 30), FULFIL, "manual_sourcing"), fulfilment_note: str(f, "fulfilment_note", 1000), delivery_estimate: str(f, "delivery_estimate", 300),
    resale_status: pick(str(f, "resale_status", 30), RESALE, "unconfirmed"), sale_mode: "enquiry",
    status: pick(str(f, "status", 20), ["draft", "published", "archived"], "draft"), max_quantity: maxQty, quantity_label: str(f, "quantity_label", 40) || "Quantity",
    option_label: str(f, "option_label", 150), option_required: f.get("option_required") === "on", chips: JSON.stringify(chips),
    image_alt: str(f, "image_alt", 200) || `${name} product image`, featured: f.get("featured") === "on",
  };
  const warning = "";

  // Image upload (stored in the database so it survives redeploys).
  const file = f.get("image");
  let imageId: string | null | undefined;
  if (file && typeof file === "object" && "size" in file && file.size > 0) {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) errBack("Image must be PNG, JPEG or WebP.");
    if (file.size > 2 * 1024 * 1024) errBack("Image must be 2 MB or smaller.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const sig = bytes.subarray(0, 12).toString("hex");
    const looksRight = sig.startsWith("89504e47") || sig.startsWith("ffd8ff") || (sig.startsWith("52494646") && bytes.subarray(8, 12).toString() === "WEBP");
    if (!looksRight) errBack("The file does not look like a valid image.");
    imageId = randomUUID();
    await (await getDb()).query("INSERT INTO product_images (id, content_type, bytes, filename) VALUES ($1,$2,$3,$4)", [imageId, file.type, bytes, String(file.name ?? "").slice(0, 200)]);
  }
  if (f.get("remove_image") === "on") imageId = null;

  const db = await getDb();
  const cols = Object.keys(values);
  let productId = id;
  try {
    if (isNew) {
      productId = randomUUID();
      await db.query(`INSERT INTO products (id, ${cols.join(", ")}, image_path) VALUES ($1, ${cols.map((_, i) => `$${i + 2}`).join(", ")}, '')`, [productId, ...Object.values(values)]);
    } else {
      await db.query(`UPDATE products SET ${cols.map((c, i) => `${c} = $${i + 2}`).join(", ")}, updated_at = NOW() WHERE id = $1`, [id, ...Object.values(values)]);
    }
    if (imageId !== undefined) {
      await db.query("UPDATE products SET image_id = $2 WHERE id = $1", [productId, imageId]);
      if (imageId) await db.query("UPDATE product_images SET product_id = $2 WHERE id = $1", [imageId, productId]);
    }
  } catch (e) {
    const msg = (e as { code?: string }).code === "23505" ? "Another product already uses this SKU or URL slug." : (e as Error).message;
    errBack(msg);
  }
  revalidatePath("/products");
  redirect(`/admin/products/${productId}?ok=${encodeURIComponent(`Saved.${warning}`)}`);
}

export async function deleteProductAction(f: FormData) {
  await requireAdmin();
  const id = str(f, "id", 40);
  if (f.get("confirm") !== "yes") redirect(`/admin/products/${id}?err=${encodeURIComponent("Tick the confirmation box to delete.")}`);
  const db = await getDb();
  const used = Number((await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM order_items WHERE product_id = $1", [id])).rows[0].n);
  if (used > 0) {
    await db.query("UPDATE products SET status = 'archived', sale_mode = 'enquiry', updated_at = NOW() WHERE id = $1", [id]);
    redirect(`/admin/products/${id}?ok=${encodeURIComponent("This product appears in orders, so it was archived (hidden) instead of deleted.")}`);
  }
  await db.query("DELETE FROM products WHERE id = $1", [id]);
  revalidatePath("/products");
  redirect(`/admin/products?ok=${encodeURIComponent("Product deleted.")}`);
}

export async function bulkProductsAction(f: FormData) {
  await requireAdmin();
  const ids = f.getAll("ids").map(String).filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 500);
  const action = str(f, "bulk", 30);
  const returnTo = str(f, "return", 300).startsWith("/admin/products") ? str(f, "return", 300) : "/admin/products";
  const sep = returnTo.includes("?") ? "&" : "?";
  if (!ids.length) redirect(`${returnTo}${sep}err=${encodeURIComponent("Select at least one product.")}`);
  const db = await getDb();
  let msg = "";
  if (["published", "draft", "archived"].includes(action)) {
    const r = await db.query(`UPDATE products SET status = $2, updated_at = NOW() WHERE id = ANY($1::uuid[])`, [ids, action]);
    msg = `${r.rowCount} product(s) set to ${action}.`;
  } else if (action === "unavailable" || action === "available") {
    const r = action === "unavailable"
      ? await db.query("UPDATE products SET fulfilment_type = 'unavailable', updated_at = NOW() WHERE id = ANY($1::uuid[])", [ids])
      : await db.query("UPDATE products SET fulfilment_type = 'manual_sourcing', updated_at = NOW() WHERE id = ANY($1::uuid[]) AND fulfilment_type = 'unavailable'", [ids]);
    msg = `${r.rowCount} product(s) marked ${action === "unavailable" ? "unavailable for new requests" : "available for requests"}.`;
  } else {
    redirect(`${returnTo}${sep}err=${encodeURIComponent("Choose an action.")}`);
  }
  revalidatePath("/products");
  redirect(`${returnTo}${sep}ok=${encodeURIComponent(msg)}`);
}
