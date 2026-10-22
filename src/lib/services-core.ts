/**
 * ADMIN-MANAGED SERVICES (no framework imports, so everything here is unit-tested on a real database)
 *
 * - The built-in services are copied into the database exactly once (marker in the "meta" table). Later
 *   deployments never overwrite or re-add anything an administrator changed or deleted.
 * - Every change and its audit record are written in ONE transaction: both happen or neither does.
 */
import type { Db } from "./db-types.ts";
import { writeAudit } from "./audit.ts";
import { defaultServices, inquiryTypes, type Service } from "./site.ts";

export const STATUSES = ["draft", "published", "inactive"] as const;
export type ServiceStatus = (typeof STATUSES)[number];
export const SERVICE_STATUS_LABEL: Record<ServiceStatus, string> = { draft: "Draft (not public)", published: "Published", inactive: "Inactive (hidden from lists)" };
export const ICONS = ["code", "globe", "layers", "phone", "cart", "cloud", "box", "compass", "users", "shield", "chart", "mail"] as const;
export const CATEGORIES = ["Software & applications", "Websites & e-commerce", "Internet & infrastructure", "Digital products", "Consulting"] as const;
const SEED_CATEGORY: Record<string, string> = {
  "software-development": "Software & applications", "web-development": "Websites & e-commerce", "application-development": "Software & applications",
  "mobile-app-development": "Software & applications", ecommerce: "Websites & e-commerce", "internet-services": "Internet & infrastructure",
  "digital-products": "Digital products", "technology-consulting": "Consulting",
};
export const RESERVED_SLUGS = ["new", "admin", "api"];

export type ServiceRecord = Service & { id: string; category: string; priceText: string; imageId: string | null; imageAlt: string; status: ServiceStatus; sortOrder: number; updatedAt: string };
type Row = { id: string; slug: string; title: string; icon: string; category: string; summary: string; problem: string; what: string; items: unknown; good_for: unknown; inquiry_type: string; status: ServiceStatus; sort_order: number; price_text: string; image_id: string | null; image_alt: string; updated_at: string | Date };
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : typeof v === "string" ? (JSON.parse(v) as unknown[]).map(String) : []);
export const rowToService = (r: Row): ServiceRecord => ({
  id: r.id, slug: r.slug, title: r.title, icon: r.icon, category: r.category, summary: r.summary, problem: r.problem, what: r.what, items: arr(r.items), goodFor: arr(r.good_for),
  inquiryType: r.inquiry_type, status: r.status, sortOrder: Number(r.sort_order), priceText: r.price_text, imageId: r.image_id, imageAlt: r.image_alt, updatedAt: new Date(r.updated_at).toISOString(),
});
const COLS = "id, slug, title, icon, category, summary, problem, what, items, good_for, inquiry_type, status, sort_order, price_text, image_id, image_alt, updated_at";

/** Copies the built-in services into the database once. Safe to call on every start. */
export async function seedServicesIfNeeded(db: Db): Promise<number> {
  return db.tx(async (q) => {
    const done = (await q<{ value: string }>("SELECT value FROM meta WHERE key = 'services_seeded'")).rows.length > 0;
    if (done) return 0;
    let n = 0;
    for (const [i, s] of defaultServices.entries()) {
      const r = await q(
        `INSERT INTO services (id, slug, title, icon, category, summary, problem, what, items, good_for, inquiry_type, status, sort_order)
         VALUES (gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,'published',$11) ON CONFLICT (slug) DO NOTHING`,
        [s.slug, s.title, s.icon, SEED_CATEGORY[s.slug] ?? "Technology services", s.summary, s.problem, s.what, JSON.stringify(s.items), JSON.stringify(s.goodFor), s.inquiryType, (i + 1) * 10],
      );
      n += r.rowCount;
    }
    await q("INSERT INTO meta (key, value) VALUES ('services_seeded', $1) ON CONFLICT (key) DO NOTHING", [new Date().toISOString()]);
    return n;
  });
}

/* ------------------------------------ validation ------------------------------------ */
export type ServiceInput = {
  slug?: unknown; title?: unknown; icon?: unknown; category?: unknown; summary?: unknown; problem?: unknown; what?: unknown; items?: unknown; goodFor?: unknown;
  inquiryType?: unknown; status?: unknown; sortOrder?: unknown; priceText?: unknown; imageAlt?: unknown;
};
export type CleanService = { slug: string; title: string; icon: string; category: string; summary: string; problem: string; what: string; items: string[]; goodFor: string[]; inquiryType: string; status: ServiceStatus; sortOrder: number; priceText: string; imageAlt: string };

const ctl = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const text = (v: unknown, max: number) => String(v ?? "").replace(ctl, "").trim().slice(0, max);
const lines = (v: unknown, perLine: number, maxLines: number) => (Array.isArray(v) ? v.map(String) : String(v ?? "").split(/\r?\n/)).map((l) => l.replace(ctl, "").trim().slice(0, perLine)).filter(Boolean).slice(0, maxLines);
export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

export function validateService(input: ServiceInput): { errors: Record<string, string>; value: CleanService } {
  const e: Record<string, string> = {};
  const title = text(input.title, 100);
  const slug = text(input.slug, 80).toLowerCase() || slugify(title);
  const v: CleanService = {
    slug, title, icon: text(input.icon, 20), category: text(input.category, 60), summary: text(input.summary, 300), problem: text(input.problem, 700), what: text(input.what, 900),
    items: lines(input.items, 150, 8), goodFor: lines(input.goodFor, 150, 6), inquiryType: text(input.inquiryType, 80),
    status: (STATUSES as readonly string[]).includes(String(input.status)) ? (input.status as ServiceStatus) : "draft",
    sortOrder: Math.max(0, Math.min(9999, Math.floor(Number(input.sortOrder ?? 0)) || 0)), priceText: text(input.priceText, 200), imageAlt: text(input.imageAlt, 200),
  };
  if (title.length < 2) e.title = "Enter a service name (at least 2 characters).";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 2) e.slug = "The web address may only contain lowercase letters, numbers and hyphens.";
  else if (RESERVED_SLUGS.includes(slug)) e.slug = "That web address is reserved. Choose another.";
  if (!(ICONS as readonly string[]).includes(v.icon)) v.icon = "code";
  if (v.category.length < 2) e.category = "Choose or enter a category.";
  if (v.summary.length < 10) e.summary = "Write a short summary (at least 10 characters).";
  if (v.what.length < 10) e.what = "Describe what you do (at least 10 characters).";
  if (v.items.length < 1) e.items = "Add at least one item (one per line).";
  if (v.goodFor.length < 1) e.goodFor = "Add at least one \"good fit\" line.";
  if (!inquiryTypes.includes(v.inquiryType)) e.inquiryType = "Choose which inquiry type the quote form should use.";
  return { errors: e, value: v };
}

/* ------------------------------------ reads ------------------------------------ */
export async function listServices(db: Db, opts: { publishedOnly?: boolean } = {}): Promise<ServiceRecord[]> {
  const r = await db.query<Row>(`SELECT ${COLS} FROM services ${opts.publishedOnly ? "WHERE status = 'published'" : ""} ORDER BY sort_order, title`);
  return r.rows.map(rowToService);
}
export async function getServiceById(db: Db, id: string): Promise<ServiceRecord | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const r = await db.query<Row>(`SELECT ${COLS} FROM services WHERE id = $1`, [id]);
  return r.rows[0] ? rowToService(r.rows[0]) : null;
}
export async function getServiceBySlugDb(db: Db, slug: string): Promise<ServiceRecord | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const r = await db.query<Row>(`SELECT ${COLS} FROM services WHERE slug = $1`, [slug]);
  return r.rows[0] ? rowToService(r.rows[0]) : null;
}
/** How many inquiries used this service's inquiry type (used to protect services that real customers asked about). */
export async function inquiryUsage(db: Db, inquiryType: string): Promise<number> {
  const t = await db.query<{ t: string | null }>("SELECT to_regclass('public.inquiries')::text AS t");
  if (!t.rows[0]?.t) return 0;
  return Number((await db.query<{ n: number }>("SELECT COUNT(*)::int AS n FROM inquiries WHERE type = $1", [inquiryType])).rows[0].n);
}

/* ------------------------------------ writes (change + audit in one transaction) ------------------------------------ */
export type SaveResult = { ok: true; id: string } | { ok: false; error: string; field?: string };
const isUnique = (e: unknown) => (e as { code?: string }).code === "23505";

export async function saveService(db: Db, id: string | null, v: CleanService, actor: string, imageId?: string | null): Promise<SaveResult> {
  try {
    return await db.tx(async (q) => {
      let sid = id;
      if (id) {
        const cur = (await q<{ slug: string; status: ServiceStatus; title: string }>("SELECT slug, status, title FROM services WHERE id = $1 FOR UPDATE", [id])).rows[0];
        if (!cur) return { ok: false as const, error: "That service no longer exists." };
        if (cur.slug !== v.slug && cur.status !== "draft") return { ok: false as const, field: "slug", error: "The web address of a published or inactive service cannot be changed (it would break links and search results). Set the service to Draft first, or keep the address." };
        await q(
          `UPDATE services SET slug=$2, title=$3, icon=$4, category=$5, summary=$6, problem=$7, what=$8, items=$9::jsonb, good_for=$10::jsonb, inquiry_type=$11, status=$12, sort_order=$13, price_text=$14, image_alt=$15, updated_at=NOW() WHERE id=$1`,
          [id, v.slug, v.title, v.icon, v.category, v.summary, v.problem, v.what, JSON.stringify(v.items), JSON.stringify(v.goodFor), v.inquiryType, v.status, v.sortOrder, v.priceText, v.imageAlt],
        );
        if (imageId !== undefined) await q("UPDATE services SET image_id = $2 WHERE id = $1", [id, imageId]);
        await writeAudit(q, { type: cur.status !== v.status ? "service.status" : "service.update", actor, target: "service", targetId: id, summary: `Updated service “${v.title}”${cur.status !== v.status ? ` (${cur.status} → ${v.status})` : ""}`, details: { slug: v.slug, status: v.status } });
      } else {
        sid = (await q<{ id: string }>(
          `INSERT INTO services (id, slug, title, icon, category, summary, problem, what, items, good_for, inquiry_type, status, sort_order, price_text, image_alt, image_id)
           VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12,$13,$14,$15) RETURNING id`,
          [v.slug, v.title, v.icon, v.category, v.summary, v.problem, v.what, JSON.stringify(v.items), JSON.stringify(v.goodFor), v.inquiryType, v.status, v.sortOrder, v.priceText, v.imageAlt, imageId ?? null],
        )).rows[0].id;
        await writeAudit(q, { type: "service.create", actor, target: "service", targetId: sid, summary: `Created service “${v.title}”`, details: { slug: v.slug, status: v.status } });
      }
      return { ok: true as const, id: sid! };
    });
  } catch (e) {
    if (isUnique(e)) return { ok: false, field: "slug", error: "Another service already uses this web address." };
    throw e;
  }
}

export async function setServiceStatus(db: Db, id: string, status: ServiceStatus, actor: string): Promise<{ ok: boolean; error?: string }> {
  if (!(STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Unknown status." };
  return db.tx(async (q) => {
    const cur = (await q<{ title: string; status: ServiceStatus }>("SELECT title, status FROM services WHERE id = $1 FOR UPDATE", [id])).rows[0];
    if (!cur) return { ok: false, error: "That service no longer exists." };
    if (cur.status === status) return { ok: true };
    await q("UPDATE services SET status = $2, updated_at = NOW() WHERE id = $1", [id, status]);
    await writeAudit(q, { type: "service.status", actor, target: "service", targetId: id, summary: `“${cur.title}”: ${cur.status} → ${status}` });
    return { ok: true };
  });
}

export async function deleteService(db: Db, id: string, actor: string): Promise<{ ok: boolean; error?: string }> {
  const s = await getServiceById(db, id);
  if (!s) return { ok: false, error: "That service no longer exists." };
  if (s.status === "published") return { ok: false, error: "A published service cannot be deleted. Set it to Inactive or Draft first." };
  const used = await inquiryUsage(db, s.inquiryType);
  if (used > 0) return { ok: false, error: `Customers have sent ${used} inquiry(ies) of type “${s.inquiryType}”, so this service is kept for your records. Set it to Inactive instead.` };
  return db.tx(async (q) => {
    await q("DELETE FROM services WHERE id = $1", [id]);
    await writeAudit(q, { type: "service.delete", actor, target: "service", targetId: id, summary: `Deleted service “${s.title}”`, details: { slug: s.slug } });
    return { ok: true };
  });
}

/** Moves a service one place up or down in the public order. */
export async function moveService(db: Db, id: string, dir: "up" | "down", actor: string): Promise<boolean> {
  return db.tx(async (q) => {
    const all = (await q<{ id: string; sort_order: number }>("SELECT id, sort_order FROM services ORDER BY sort_order, title FOR UPDATE")).rows;
    const i = all.findIndex((r) => r.id === id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= all.length) return false;
    const order = all.map((r) => r.id);
    [order[i], order[j]] = [order[j], order[i]];
    for (const [k, sid] of order.entries()) await q("UPDATE services SET sort_order = $2 WHERE id = $1", [sid, (k + 1) * 10]);
    await writeAudit(q, { type: "service.reorder", actor, target: "service", targetId: id, summary: `Moved a service ${dir}` });
    return true;
  });
}
