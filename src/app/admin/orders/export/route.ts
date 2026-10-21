/** GET /admin/orders/export — all order lines as CSV, including sourcing cost and margin (admin only). */
import { isAdmin } from "@/lib/admin-session";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
const cell = (v: unknown) => { const s = String(v ?? ""); const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s; return `"${safe.replace(/"/g, '""')}"`; };

export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const rows = (await (await getDb()).query(`SELECT o.number, o.created_at, o.status, o.payment_status, o.payment_mode, o.name, o.email, o.phone, o.country, o.city,
      i.sku, i.product_name, i.quantity, i.line_total_kobo, i.sourcing_status, i.supplier_name, i.sourcing_cost_kobo, o.total_kobo, o.refunded_kobo
    FROM orders o JOIN order_items i ON i.order_id = o.id ORDER BY o.created_at DESC`)).rows;
  const head = ["order", "created_at", "status", "payment_status", "mode", "customer", "email", "phone", "country", "city", "sku", "product", "qty", "line_total_ngn", "sourcing_status", "supplier", "sourcing_cost_ngn", "line_margin_ngn", "order_total_ngn", "refunded_ngn"];
  const lines = [head.join(",")];
  for (const r of rows) {
    const cost = r.sourcing_cost_kobo == null ? "" : Number(r.sourcing_cost_kobo) / 100;
    const margin = cost === "" ? "" : Number(r.line_total_kobo) / 100 - (cost as number);
    lines.push([r.number, new Date(String(r.created_at)).toISOString(), r.status, r.payment_status, r.payment_mode, r.name, r.email, r.phone, r.country, r.city, r.sku, r.product_name, r.quantity,
      Number(r.line_total_kobo) / 100, r.sourcing_status, r.supplier_name, cost, margin, Number(r.total_kobo) / 100, Number(r.refunded_kobo) / 100].map(cell).join(","));
  }
  return new Response("﻿" + lines.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="cloudedge-orders-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
