import Link from "next/link";
import { requireAdmin } from "@/lib/admin-session";
import { getStore, isStatus, STATUSES, STATUS_LABEL } from "@/lib/inquiries";
import { emailConfigured } from "@/lib/email";

export const metadata = { title: "Inquiries" };
const PAGE = 25;
const fmt = (iso: string) => new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" });

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string; deleted?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const store = getStore();
  if (!store) {
    return (
      <div className="alert info">
        <p><strong>No database is configured, so inquiries are not being stored.</strong> They are only emailed (if email is configured). Set <code>DATABASE_URL</code> to store inquiries here. See HANDOVER.md.</p>
      </div>
    );
  }
  const status = isStatus(sp.status) ? sp.status : undefined;
  const q = (sp.q ?? "").trim().slice(0, 100) || undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  let data: { items: Awaited<ReturnType<typeof store.list>>["items"]; total: number } | null = null;
  let counts: Record<string, number> = {};
  let dbError = false;
  try {
    [data, counts] = await Promise.all([store.list({ status, q, limit: PAGE, offset: (page - 1) * PAGE }), store.counts()]);
  } catch (e) {
    console.error("[admin] storage error:", (e as Error).message);
    dbError = true;
  }
  const qs = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    Object.entries({ status, q, ...p }).forEach(([k, v]) => v && u.set(k, v));
    const s = u.toString();
    return s ? `/admin/inquiries?${s}` : "/admin/inquiries";
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1;

  return (
    <>
      <h1 style={{ fontSize: "1.8rem" }}>Inquiries</h1>
      <p className="muted"><a href="/admin/inquiries/export" download>Download all inquiries (CSV)</a></p>
      <p className="muted">Storage: {store.kind === "postgres" ? "PostgreSQL database" : "local file (development)"} · Email notifications: {emailConfigured() ? "on" : "not configured"}</p>
      {sp.deleted && <div className="alert ok" role="status"><p>Inquiry deleted.</p></div>}
      {dbError && <div className="alert bad" role="alert"><p>Could not load inquiries from storage. Check DATABASE_URL and that the database is running. Details are in the server logs.</p></div>}

      <div className="stats">
        <Link className="stat" href="/admin/inquiries"><b>{total}</b><span>All</span></Link>
        {STATUSES.map((s) => <Link key={s} className="stat" href={`/admin/inquiries?status=${s}`}><b>{counts[s] ?? 0}</b><span>{STATUS_LABEL[s]}</span></Link>)}
      </div>

      <form className="toolbar" method="get" action="/admin/inquiries" role="search">
        <div className="field"><label htmlFor="q">Search</label><input id="q" name="q" defaultValue={q} placeholder="Name, email, reference…" /></div>
        <div className="field"><label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status ?? ""}><option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></div>
        <button className="btn btn-primary btn-sm" type="submit">Filter</button>
        {(q || status) && <Link className="btn btn-outline btn-sm" href="/admin/inquiries">Clear</Link>}
      </form>

      {data && data.items.length === 0 ? (
        <div className="empty"><p>{q || status ? "No inquiries match this filter." : "No inquiries yet. New submissions from the Contact and Quote forms will appear here."}</p></div>
      ) : data && (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Inquiries, newest first</caption>
            <thead><tr><th scope="col">Received</th><th scope="col">Reference</th><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {data.items.map((i) => (
                <tr key={i.id}>
                  <td>{fmt(i.createdAt)}</td>
                  <td><Link href={`/admin/inquiries/${i.id}`}>{i.reference}</Link></td>
                  <td>{i.name}<br /><span className="muted" style={{ fontSize: ".85rem" }}>{i.email}</span></td>
                  <td>{i.type}{i.mode === "quote" && <><br /><span className="muted" style={{ fontSize: ".85rem" }}>Quote request</span></>}</td>
                  <td><span className={`status-pill ${i.status}`}>{STATUS_LABEL[i.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <nav aria-label="Pages" className="actions">
          {page > 1 && <Link className="btn btn-outline btn-sm" href={qs({ page: String(page - 1) })}>← Newer</Link>}
          <span className="muted" style={{ alignSelf: "center" }}>Page {page} of {pages}</span>
          {page < pages && <Link className="btn btn-outline btn-sm" href={qs({ page: String(page + 1) })}>Older →</Link>}
        </nav>
      )}
    </>
  );
}
