/** GET /admin/orders/export — all request/order lines as CSV, including accepted quotation cost and margin (admin only). */
import { isAdmin } from "@/lib/admin-session";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
const cell = (v: unknown) => { const s = String(v ?? ""); const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s; return `"${safe.replace(/"/g, '""')}"`; };
const ngn = (k: unknown) => (k == null ? "" : Number(k) / 100);

export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const rows = (await (await getDb()).query(`SELECT o.number, o.created_at, o.status, o.payment_status, o.payment_mode, o.name, o.email, o.phone, o.country,
      i.sku, i.product_name, i.quantity, i.line_total_kobo, i.sourcing_status, i.supplier_name, i.sourcing_cost_kobo,
      ql.price_kobo AS quoted_price_kobo, ql.cost_kobo AS quoted_cost_kobo, o.total_kobo, o.refunded_kobo, o.accepted_quote_id
    FROM orders o JOIN order_items i ON i.order_id = o.id
    LEFT JOIN quote_lines ql ON ql.quote_id = o.accepted_quote_id AND ql.order_item_id = i.id
    ORDER BY o.created_at DESC`)).rows;
  const head = ["reference", "created_at", "status", "payment_status", "mode", "customer", "email", "phone", "country", "sku", "product", "qty", "indicative_line_ngn",
    "accepted_price_ngn", "quoted_cost_ngn", "quoted_margin_ngn", "actual_sourcing_cost_ngn", "sourcing_status", "supplier", "order_total_ngn", "refunded_ngn"];
  const lines = [head.join(",")];
  for (const r of rows) {
    const margin = r.quoted_price_kobo == null ? "" : (Number(r.quoted_price_kobo) - Number(r.quoted_cost_kobo)) / 100;
    lines.push([r.number, new Date(String(r.created_at)).toISOString(), r.status, r.payment_status, r.payment_mode, r.name, r.email, r.phone, r.country, r.sku, r.product_name, r.quantity,
      ngn(r.line_total_kobo), ngn(r.quoted_price_kobo), ngn(r.quoted_cost_kobo), margin, ngn(r.sourcing_cost_kobo), r.sourcing_status, r.supplier_name,
      r.accepted_quote_id ? ngn(r.total_kobo) : "", ngn(r.refunded_kobo)].map(cell).join(","));
  }
  return new Response("﻿" + lines.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="cloudedge-orders-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
