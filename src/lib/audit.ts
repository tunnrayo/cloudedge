/**
 * ADMIN AUDIT LOG (no framework imports so it can be unit-tested)
 *
 * Append-only: the database refuses UPDATE and DELETE on audit_log (trigger from migration 3) and the admin
 * screens only read it. Secrets are removed before anything is written (see redact()).
 */
import type { Db } from "./db-types.ts";

export const OUTCOMES = ["success", "failure", "denied"] as const;
export type Outcome = (typeof OUTCOMES)[number];
export type AuditEvent = { type: string; outcome?: Outcome; actor?: string; target?: string; targetId?: string; summary?: string; details?: Record<string, unknown>; ipHash?: string };

/** Event types shown in the filter menu. Free-form types are still accepted if they match the safe pattern. */
export const EVENT_TYPES = [
  "admin.login", "admin.logout", "admin.sessions_revoked",
  "product.create", "product.update", "product.delete", "product.archive", "product.bulk",
  "service.create", "service.update", "service.status", "service.delete", "service.reorder",
  "order.status", "order.message", "order.note", "order.next_action", "order.item_sourcing",
  "quote.save", "quote.send", "quote.decision", "payment.manual", "payment.instructions", "payment.recheck", "refund.record", "refund.complete", "quote.expire",
  "inquiry.update", "inquiry.delete", "health.check",
] as const;

const SAFE_TYPE = /^[a-z0-9_.-]{1,60}$/;
const SENSITIVE_KEY = /pass(word)?|secret|token|api[_-]?key|authorization|cookie|card|cvv|signature|bearer|session|credential|private/i;
const SECRET_VALUE = /\b(?:sk|pk|rk|re)_(?:live|test)?_?[A-Za-z0-9]{10,}\b|\b[0-9a-f]{40,}\b|\bpostgres(?:ql)?:\/\/\S+/gi;

/** Removes secrets: values under sensitive-looking keys, key/token-shaped strings, long text is shortened. */
export function redact(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (typeof value === "string") return value.replace(SECRET_VALUE, "[redacted]").slice(0, 300);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (depth >= 3) return "[too deep]";
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 30)) out[k.slice(0, 60)] = SENSITIVE_KEY.test(k) ? "[redacted]" : redact(v, depth + 1);
    return out;
  }
  return String(value).slice(0, 100);
}

const state = globalThis as unknown as { __ceAuditFailures?: { count: number; lastAt: string | null } };
export const auditFailureStats = () => (state.__ceAuditFailures ??= { count: 0, lastAt: null });

function clean(e: AuditEvent) {
  const type = SAFE_TYPE.test(e.type) ? e.type : "invalid.event";
  return {
    type, outcome: (OUTCOMES as readonly string[]).includes(e.outcome ?? "success") ? e.outcome ?? "success" : "success",
    actor: String(e.actor ?? "").slice(0, 60), target: String(e.target ?? "").slice(0, 40), targetId: String(e.targetId ?? "").slice(0, 80),
    summary: String(redact(e.summary ?? "")).slice(0, 300), details: JSON.stringify(redact(e.details ?? {})), ipHash: String(e.ipHash ?? "").slice(0, 40),
  };
}

type Q = Db["query"];
const INSERT = `INSERT INTO audit_log (event_type, outcome, actor, target_type, target_id, summary, details, ip_hash) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`;

/** Writes an event and THROWS on failure. Use inside a transaction so the change and its record commit together. */
export async function writeAudit(q: Q, e: AuditEvent): Promise<void> {
  const c = clean(e);
  await q(INSERT, [c.type, c.outcome, c.actor, c.target, c.targetId, c.summary, c.details, c.ipHash]);
}

/** Writes an event but never throws: a logging problem must not break the business action. Failures are counted for the health page. */
export async function recordAudit(db: Db, e: AuditEvent): Promise<boolean> {
  try { await writeAudit(db.query.bind(db), e); return true; }
  catch (err) {
    const s = auditFailureStats(); s.count += 1; s.lastAt = new Date().toISOString();
    console.error(`[audit] could not record "${String(e.type).slice(0, 40)}":`, (err as Error).name);
    return false;
  }
}

export type AuditFilters = { type?: string; outcome?: string; from?: string; to?: string; q?: string; page?: number; pageSize?: number };
export type AuditRow = { id: number; created_at: string; event_type: string; outcome: Outcome; actor: string; target_type: string; target_id: string; summary: string; details: Record<string, unknown> };
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function listAudit(db: Db, f: AuditFilters): Promise<{ rows: AuditRow[]; total: number; page: number; pages: number; pageSize: number }> {
  const where: string[] = []; const p: unknown[] = [];
  const add = (sql: string, v: unknown) => { p.push(v); where.push(sql.replaceAll("?", `$${p.length}`)); };
  if (f.type && SAFE_TYPE.test(f.type)) add("event_type = ?", f.type);
  if (f.outcome && (OUTCOMES as readonly string[]).includes(f.outcome)) add("outcome = ?", f.outcome);
  if (f.from && DAY.test(f.from)) add("created_at >= ?::date", f.from);
  if (f.to && DAY.test(f.to)) add("created_at < (?::date + 1)", f.to);
  const q = (f.q ?? "").trim().slice(0, 80);
  if (q) add("(summary ILIKE ? OR target_id ILIKE ? OR actor ILIKE ?)", `%${q.replace(/[%_\\]/g, "\\$&")}%`);
  const pageSize = Math.min(100, Math.max(5, Math.floor(f.pageSize ?? 25)));
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = Number((await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM audit_log ${w}`, p)).rows[0].n);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pages, Math.max(1, Math.floor(f.page ?? 1)));
  const rows = (await db.query<AuditRow>(`SELECT id::int AS id, created_at, event_type, outcome, actor, target_type, target_id, summary, details FROM audit_log ${w} ORDER BY id DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`, p)).rows;
  return { rows, total, page, pages, pageSize };
}
