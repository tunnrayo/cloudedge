/**
 * INQUIRY STORAGE (server-only)
 *
 * Where inquiries are saved depends on configuration:
 *   1. DATABASE_URL is set           -> PostgreSQL (recommended for the live website).
 *   2. No DATABASE_URL, development  -> a local file: .data/inquiries.json (handy on your own computer).
 *      (In production the file store is used only if INQUIRY_STORAGE=file is set, because many hosts
 *       wipe local files on every deploy.)
 *   3. Neither                       -> nothing is stored; the site relies on email only.
 *
 * The table is created automatically on first use. The same SQL is in docs/database/schema.sql.
 */
import "server-only";
import { randomUUID, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { InquiryInput } from "@/lib/validate";

export const STATUSES = ["new", "in_progress", "responded", "closed", "spam"] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<Status, string> = { new: "New", in_progress: "In progress", responded: "Responded", closed: "Closed", spam: "Spam" };

export type Inquiry = Omit<InquiryInput, "website"> & {
  id: string;
  reference: string;
  createdAt: string;
  status: Status;
  notes: string;
  emailStatus: "sent" | "failed" | "not_configured";
};

export type ListOptions = { status?: Status; q?: string; limit?: number; offset?: number };

interface Store {
  kind: "postgres" | "file";
  create(i: Omit<Inquiry, "id" | "reference" | "createdAt" | "status" | "notes" | "emailStatus">): Promise<Inquiry>;
  setEmailStatus(id: string, s: Inquiry["emailStatus"]): Promise<void>;
  list(o: ListOptions): Promise<{ items: Inquiry[]; total: number }>;
  counts(): Promise<Record<Status, number>>;
  get(id: string): Promise<Inquiry | null>;
  update(id: string, patch: { status?: Status; notes?: string }): Promise<void>;
  remove(id: string): Promise<void>;
}

/** Short human-friendly reference such as CE-7K3P9Q. */
function makeReference() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = randomBytes(6);
  return "CE-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
const isStatus = (s: unknown): s is Status => typeof s === "string" && (STATUSES as readonly string[]).includes(s);
const emptyCounts = (): Record<Status, number> => ({ new: 0, in_progress: 0, responded: 0, closed: 0, spam: 0 });

/* ------------------------------ PostgreSQL ------------------------------ */
const COLUMNS = "id, reference, created_at, status, notes, email_status, mode, name, email, phone, organization, type, budget, timeline, scope, message, product";

type Row = Record<string, unknown>;
function fromRow(r: Row): Inquiry {
  return {
    id: String(r.id), reference: String(r.reference), createdAt: new Date(r.created_at as string).toISOString(),
    status: isStatus(r.status) ? r.status : "new", notes: String(r.notes ?? ""), emailStatus: (r.email_status as Inquiry["emailStatus"]) ?? "not_configured",
    mode: r.mode === "quote" ? "quote" : "contact", name: String(r.name), email: String(r.email), phone: String(r.phone ?? ""),
    organization: String(r.organization ?? ""), type: String(r.type), budget: String(r.budget ?? ""), timeline: String(r.timeline ?? ""),
    scope: String(r.scope ?? ""), message: String(r.message ?? ""), product: String(r.product ?? ""),
  };
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS inquiries (
  id            UUID PRIMARY KEY,
  reference     VARCHAR(16)  NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  status        VARCHAR(20)  NOT NULL DEFAULT 'new',
  notes         TEXT         NOT NULL DEFAULT '',
  email_status  VARCHAR(20)  NOT NULL DEFAULT 'not_configured',
  mode          VARCHAR(10)  NOT NULL,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(200) NOT NULL,
  phone         VARCHAR(30)  NOT NULL DEFAULT '',
  organization  VARCHAR(150) NOT NULL DEFAULT '',
  type          VARCHAR(80)  NOT NULL,
  budget        VARCHAR(60)  NOT NULL DEFAULT '',
  timeline      VARCHAR(60)  NOT NULL DEFAULT '',
  scope         TEXT         NOT NULL DEFAULT '',
  message       TEXT         NOT NULL DEFAULT '',
  product       VARCHAR(80)  NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS inquiries_created_at_idx ON inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS inquiries_status_idx ON inquiries (status);
`;

function postgresStore(url: string): Store {
  // Imported lazily so the "pg" package is only loaded when a database is configured.
  let poolPromise: Promise<import("pg").Pool> | null = null;
  const pool = () => {
    poolPromise ??= (async () => {
      const { Pool } = await import("pg");
      const needsSsl = process.env.DATABASE_SSL === "true" || /sslmode=require/.test(url);
      const p = new Pool({ connectionString: url, max: 5, ssl: needsSsl ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } : undefined });
      await p.query(SCHEMA_SQL);
      return p;
    })().catch((e) => { poolPromise = null; throw e; });
    return poolPromise;
  };
  const q = async (sql: string, params: unknown[] = []) => (await pool()).query(sql, params);

  return {
    kind: "postgres",
    async create(i) {
      const id = randomUUID();
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const r = await q(
            `INSERT INTO inquiries (id, reference, mode, name, email, phone, organization, type, budget, timeline, scope, message, product)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING ${COLUMNS}`,
            [id, makeReference(), i.mode, i.name, i.email, i.phone, i.organization, i.type, i.budget, i.timeline, i.scope, i.message, i.product],
          );
          return fromRow(r.rows[0]);
        } catch (e) {
          if ((e as { code?: string }).code !== "23505") throw e; // retry only on duplicate reference
        }
      }
      throw new Error("Could not allocate a unique reference");
    },
    async setEmailStatus(id, s) { await q("UPDATE inquiries SET email_status = $2 WHERE id = $1", [id, s]); },
    async list({ status, q: search, limit = 50, offset = 0 }) {
      const where: string[] = []; const params: unknown[] = [];
      if (status) { params.push(status); where.push(`status = $${params.length}`); }
      if (search) {
        params.push(`%${search.replace(/[\\%_]/g, (m) => "\\" + m)}%`);
        const n = params.length;
        where.push(`(name ILIKE $${n} OR email ILIKE $${n} OR organization ILIKE $${n} OR reference ILIKE $${n} OR message ILIKE $${n} OR scope ILIKE $${n})`);
      }
      const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const total = Number((await q(`SELECT COUNT(*)::int AS n FROM inquiries ${w}`, params)).rows[0].n);
      params.push(limit, offset);
      const r = await q(`SELECT ${COLUMNS} FROM inquiries ${w} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
      return { items: r.rows.map(fromRow), total };
    },
    async counts() {
      const c = emptyCounts();
      for (const row of (await q("SELECT status, COUNT(*)::int AS n FROM inquiries GROUP BY status")).rows as { status: unknown; n: number }[]) {
        if (isStatus(row.status)) c[row.status] = Number(row.n);
      }
      return c;
    },
    async get(id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
      const r = await q(`SELECT ${COLUMNS} FROM inquiries WHERE id = $1`, [id]);
      return r.rows[0] ? fromRow(r.rows[0]) : null;
    },
    async update(id, patch) {
      if (patch.status) await q("UPDATE inquiries SET status = $2 WHERE id = $1", [id, patch.status]);
      if (patch.notes !== undefined) await q("UPDATE inquiries SET notes = $2 WHERE id = $1", [id, patch.notes]);
    },
    async remove(id) { await q("DELETE FROM inquiries WHERE id = $1", [id]); },
  };
}

/* ------------------------------ Local file ------------------------------ */
function fileStore(file: string): Store {
  let chain: Promise<unknown> = Promise.resolve();
  // Serialise all access so two submissions at once cannot overwrite each other.
  const locked = <T,>(fn: () => Promise<T>): Promise<T> => { const run = chain.then(fn, fn); chain = run.catch(() => {}); return run; };
  const read = async (): Promise<Inquiry[]> => {
    try { return JSON.parse(await fs.readFile(file, "utf8")) as Inquiry[]; }
    catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return []; throw e; }
  };
  const write = async (items: Inquiry[]) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(items, null, 2), { mode: 0o600 });
    await fs.rename(tmp, file);
  };
  const mutate = (fn: (items: Inquiry[]) => void) => locked(async () => { const items = await read(); fn(items); await write(items); });

  return {
    kind: "file",
    create: (i) => locked(async () => {
      const items = await read();
      let reference = makeReference();
      while (items.some((x) => x.reference === reference)) reference = makeReference();
      const rec: Inquiry = { ...i, id: randomUUID(), reference, createdAt: new Date().toISOString(), status: "new", notes: "", emailStatus: "not_configured" };
      items.push(rec); await write(items); return rec;
    }),
    setEmailStatus: (id, s) => mutate((items) => { const x = items.find((r) => r.id === id); if (x) x.emailStatus = s; }),
    list: ({ status, q, limit = 50, offset = 0 }) => locked(async () => {
      const needle = q?.toLowerCase();
      const all = (await read())
        .filter((x) => !status || x.status === status)
        .filter((x) => !needle || [x.name, x.email, x.organization, x.reference, x.message, x.scope].some((v) => v.toLowerCase().includes(needle)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { items: all.slice(offset, offset + limit), total: all.length };
    }),
    counts: () => locked(async () => { const c = emptyCounts(); for (const x of await read()) c[x.status]++; return c; }),
    get: (id) => locked(async () => (await read()).find((x) => x.id === id) ?? null),
    update: (id, patch) => mutate((items) => { const x = items.find((r) => r.id === id); if (x) { if (patch.status) x.status = patch.status; if (patch.notes !== undefined) x.notes = patch.notes; } }),
    remove: (id) => mutate((items) => { const i = items.findIndex((r) => r.id === id); if (i >= 0) items.splice(i, 1); }),
  };
}

/* ------------------------------ Selection ------------------------------ */
let cached: Store | null | undefined;
export function getStore(): Store | null {
  if (cached !== undefined) return cached;
  const url = process.env.DATABASE_URL;
  if (url) cached = postgresStore(url);
  else if (process.env.NODE_ENV !== "production" || process.env.INQUIRY_STORAGE === "file")
    cached = fileStore(process.env.INQUIRY_FILE ?? path.join(process.cwd(), ".data", "inquiries.json"));
  else cached = null;
  return cached;
}
export { isStatus };
