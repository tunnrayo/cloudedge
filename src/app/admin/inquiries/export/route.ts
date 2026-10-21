/** GET /admin/export — download all inquiries as a CSV file (admin only). */
import { isAdmin } from "@/lib/admin-session";
import { getStore } from "@/lib/inquiries";

export const dynamic = "force-dynamic";

// Prefix cells that spreadsheet apps would treat as formulas (CSV injection protection).
const cell = (v: string) => {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const store = getStore();
  if (!store) return new Response("No storage configured", { status: 404 });
  const cols = ["reference", "createdAt", "status", "mode", "name", "email", "phone", "organization", "type", "product", "timeline", "budget", "scope", "message", "notes", "emailStatus"] as const;
  const lines = [cols.join(",")];
  let offset = 0;
  for (;;) {
    const { items } = await store.list({ limit: 500, offset });
    for (const i of items) lines.push(cols.map((c) => cell(String(i[c] ?? ""))).join(","));
    if (items.length < 500) break;
    offset += 500;
  }
  const date = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="cloudedge-inquiries-${date}.csv"`, "Cache-Control": "no-store" },
  });
}
