import Link from "next/link";
import { requireAdmin } from "@/lib/admin-session";
import { getDb } from "@/lib/db";
import { EVENT_TYPES, OUTCOMES, auditFailureStats, listAudit } from "@/lib/audit";
import { activeSessionCount } from "@/lib/admin-sessions";
import { signOutOthers } from "../actions";

export const metadata = { title: "Audit log" };
const fmt = (iso: string | Date) => new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "medium", timeZone: "Africa/Lagos" });

type SP = { type?: string; outcome?: string; from?: string; to?: string; q?: string; page?: string; ok?: string };

export default async function AuditPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  let data: Awaited<ReturnType<typeof listAudit>> | null = null;
  let sessions = 0;
  let failed = false;
  try {
    const db = await getDb();
    [data, sessions] = await Promise.all([listAudit(db, { type: sp.type, outcome: sp.outcome, from: sp.from, to: sp.to, q: sp.q, page }), activeSessionCount(db)]);
  } catch (e) {
    console.error("[admin] audit log could not be loaded:", (e as Error).name);
    failed = true;
  }
  const keep = { type: sp.type, outcome: sp.outcome, from: sp.from, to: sp.to, q: sp.q };
  const link = (p: number) => {
    const u = new URLSearchParams();
    Object.entries({ ...keep, page: String(p) }).forEach(([k, v]) => v && u.set(k, v));
    return `/admin/audit?${u}`;
  };
  const stats = auditFailureStats();
  return (
    <>
      <h1 style={{ fontSize: "1.8rem" }}>Audit log</h1>
      <p className="muted">A permanent record of important administrator actions. It can be read here but not edited or deleted. Passwords, keys and tokens are never recorded.</p>
      {sp.ok && <div className="alert ok" role="status"><p>{sp.ok.slice(0, 200)}</p></div>}
      {failed && <div className="alert bad" role="alert"><p>The audit log could not be loaded. Check the database on the Health page.</p></div>}
      {stats.count > 0 && <div className="alert info"><p>{stats.count} audit event(s) could not be written since the server started (last at {fmt(stats.lastAt!)}). The related actions still went through.</p></div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <p className="mb-0"><strong>{sessions}</strong> active admin session(s). Sessions end when you sign out, after 8 hours, or after 2 hours without activity.</p>
        <form action={signOutOthers} style={{ marginTop: 10 }}><button className="btn btn-outline btn-sm" type="submit">Sign out all other devices</button></form>
      </div>

      <form className="toolbar" method="get" action="/admin/audit" role="search">
        <div className="field"><label htmlFor="q">Search</label><input id="q" name="q" defaultValue={sp.q ?? ""} maxLength={80} placeholder="Summary, record id, admin…" /></div>
        <div className="field"><label htmlFor="type">Event</label>
          <select id="type" name="type" defaultValue={sp.type ?? ""}><option value="">All events</option>{EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
        <div className="field"><label htmlFor="outcome">Outcome</label>
          <select id="outcome" name="outcome" defaultValue={sp.outcome ?? ""}><option value="">All</option>{OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
        <div className="field"><label htmlFor="from">From</label><input id="from" name="from" type="date" defaultValue={sp.from ?? ""} /></div>
        <div className="field"><label htmlFor="to">To</label><input id="to" name="to" type="date" defaultValue={sp.to ?? ""} /></div>
        <button className="btn btn-primary btn-sm" type="submit">Filter</button>
        {(sp.q || sp.type || sp.outcome || sp.from || sp.to) && <Link className="btn btn-outline btn-sm" href="/admin/audit">Clear</Link>}
      </form>

      {data && data.rows.length === 0 ? (
        <div className="empty"><p>{data.total === 0 && !(sp.q || sp.type || sp.outcome || sp.from || sp.to) ? "No events recorded yet." : "No events match this filter."}</p></div>
      ) : data && (
        <>
          <p className="muted">{data.total} event(s) · page {data.page} of {data.pages} · times shown in Lagos time</p>
          <div className="table-wrap">
            <table>
              <caption className="sr-only">Audit events, newest first</caption>
              <thead><tr><th scope="col">When</th><th scope="col">Event</th><th scope="col">Outcome</th><th scope="col">Administrator</th><th scope="col">Record</th><th scope="col">Summary</th></tr></thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{fmt(r.created_at)}</td>
                    <td><code>{r.event_type}</code></td>
                    <td><span className={`flag ${r.outcome === "success" ? "good" : r.outcome === "denied" ? "warn" : "bad"}`}>{r.outcome}</span></td>
                    <td>{r.actor || "—"}</td>
                    <td>{r.target_type ? `${r.target_type}${r.target_id ? ` · ${r.target_id.slice(0, 12)}` : ""}` : "—"}</td>
                    <td>{r.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pages > 1 && (
            <nav className="pager" aria-label="Pages" style={{ display: "flex", gap: 12, marginTop: 16 }}>
              {data.page > 1 && <Link className="btn btn-outline btn-sm" href={link(data.page - 1)}>← Newer</Link>}
              {data.page < data.pages && <Link className="btn btn-outline btn-sm" href={link(data.page + 1)}>Older →</Link>}
            </nav>
          )}
        </>
      )}
    </>
  );
}
