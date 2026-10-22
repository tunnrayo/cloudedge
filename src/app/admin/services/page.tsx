import Link from "next/link";
import { requireAdmin } from "@/lib/admin-session";
import { getDb } from "@/lib/db";
import { SERVICE_STATUS_LABEL, listServices, type ServiceRecord } from "@/lib/services-core";
import { moveServiceAction, serviceStatusAction } from "./actions";

export const metadata = { title: "Services" };

export default async function ServicesAdmin({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; status?: string; category?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  let all: ServiceRecord[] = []; let failed = false;
  try { all = await listServices(await getDb()); } catch (e) { console.error("[admin] services list failed:", (e as Error).name); failed = true; }
  const categories = [...new Set(all.map((s) => s.category))].sort();
  const rows = all.filter((s) => (!sp.status || s.status === sp.status) && (!sp.category || s.category === sp.category));
  return (
    <>
      <h1 style={{ fontSize: "1.8rem" }}>Services</h1>
      <p className="muted">The services shown on the public website. Changes appear immediately and are recorded in the audit log.</p>
      {sp.ok && <div className="alert ok" role="status"><p>{sp.ok.slice(0, 200)}</p></div>}
      {sp.err && <div className="alert bad" role="alert"><p>{sp.err.slice(0, 300)}</p></div>}
      {failed && <div className="alert bad" role="alert"><p>Services could not be loaded. Check the database on the Health page.</p></div>}
      <div className="actions" style={{ marginTop: 0 }}><Link className="btn btn-primary btn-sm" href="/admin/services/new">Add a service</Link></div>
      <form className="toolbar" method="get" action="/admin/services">
        <div className="field"><label htmlFor="status">Status</label><select id="status" name="status" defaultValue={sp.status ?? ""}><option value="">All</option>{Object.entries(SERVICE_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="field"><label htmlFor="category">Category</label><select id="category" name="category" defaultValue={sp.category ?? ""}><option value="">All</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></div>
        <button className="btn btn-outline btn-sm" type="submit">Filter</button>
      </form>
      {rows.length === 0 ? <div className="empty"><p>No services match.</p></div> : (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Services in display order</caption>
            <thead><tr><th scope="col">Order</th><th scope="col">Service</th><th scope="col">Category</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>{s.sortOrder}
                    <form action={moveServiceAction} style={{ display: "inline-flex", gap: 4, marginLeft: 6 }}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="btn btn-outline btn-sm" name="dir" value="up" aria-label={`Move ${s.title} up`} type="submit">↑</button>
                      <button className="btn btn-outline btn-sm" name="dir" value="down" aria-label={`Move ${s.title} down`} type="submit">↓</button>
                    </form></td>
                  <td><Link href={`/admin/services/${s.id}`}>{s.title}</Link><br /><span className="muted small">/services/{s.slug}</span></td>
                  <td>{s.category}</td>
                  <td><span className={`flag ${s.status === "published" ? "good" : s.status === "draft" ? "warn" : "muted"}`}>{SERVICE_STATUS_LABEL[s.status]}</span></td>
                  <td>
                    <Link href={`/admin/services/${s.id}/preview`}>Preview</Link>{" · "}<Link href={`/admin/services/${s.id}`}>Edit</Link>
                    <form action={serviceStatusAction} style={{ display: "inline", marginLeft: 8 }}>
                      <input type="hidden" name="id" value={s.id} />
                      {s.status !== "published" ? <button className="btn btn-outline btn-sm" name="status" value="published" type="submit">Publish</button> : <button className="btn btn-outline btn-sm" name="status" value="inactive" type="submit">Make inactive</button>}
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
