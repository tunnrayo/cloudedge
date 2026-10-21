import Link from "next/link";
import { requireAdmin } from "@/lib/admin-session";
import { listOrders } from "@/lib/shop/orders";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, formatDate, nairaFromKobo, type OrderStatus } from "@/lib/shop/format";
import { cancelAbandonedAction } from "../shop-actions";

export const metadata = { title: "Orders" };
const PAGE = 25;
const QUEUES: Record<string, string> = { sourcing: "Sourcing queue — paid orders with items still to deliver", abandoned: "Abandoned checkouts — unpaid for over 24 hours", review: "Payments needing review" };

export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; queue?: string; page?: string; ok?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const queue = sp.queue && sp.queue in QUEUES ? (sp.queue as "sourcing" | "abandoned" | "review") : undefined;
  const status = sp.status && (ORDER_STATUSES as readonly string[]).includes(sp.status) ? sp.status : undefined;
  const q = (sp.q ?? "").trim().slice(0, 80) || undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  let data: Awaited<ReturnType<typeof listOrders>> | null = null; let err = "";
  try { data = await listOrders({ status, q, queue, limit: PAGE, offset: (page - 1) * PAGE }); } catch (e) { err = (e as Error).message; }
  const qs = (extra: Record<string, string | undefined>) => { const u = new URLSearchParams(); Object.entries({ status, q, queue, ...extra }).forEach(([k, v]) => v && u.set(k, v)); return `/admin/orders?${u}`; };
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1;
  return (
    <>
      <h1 style={{ fontSize: "1.8rem" }}>{queue ? QUEUES[queue] : "Orders"}</h1>
      <nav className="admin-tabs" aria-label="Order views">
        <Link href="/admin/orders" aria-current={!queue && !status ? "page" : undefined}>All</Link>
        <Link href="/admin/orders?queue=sourcing" aria-current={queue === "sourcing" ? "page" : undefined}>Sourcing queue</Link>
        <Link href="/admin/orders?status=on_hold" aria-current={status === "on_hold" ? "page" : undefined}>On hold</Link>
        <Link href="/admin/orders?queue=review" aria-current={queue === "review" ? "page" : undefined}>Payment review</Link>
        <Link href="/admin/orders?queue=abandoned" aria-current={queue === "abandoned" ? "page" : undefined}>Abandoned</Link>
        <a href="/admin/orders/export" download>Export CSV</a>
      </nav>
      {sp.ok && <div className="alert ok" role="status"><p>{sp.ok}</p></div>}
      {err && <div className="alert bad" role="alert"><p>Could not load orders: {err}</p></div>}
      <form className="toolbar" method="get" action="/admin/orders" role="search">
        {queue && <input type="hidden" name="queue" value={queue} />}
        <div className="field"><label htmlFor="q">Search</label><input id="q" name="q" defaultValue={q} placeholder="Order number, name or email" /></div>
        <div className="field"><label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status ?? ""}><option value="">Any</option>{ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}</select></div>
        <button className="btn btn-primary btn-sm" type="submit">Filter</button>
      </form>
      {queue === "abandoned" && (
        <form action={cancelAbandonedAction} style={{ marginBottom: 16 }}>
          <button className="btn btn-outline btn-sm" type="submit">Cancel unpaid orders older than 48 hours</button>
          <span className="muted small"> (customers see “Cancelled”; nothing was charged on these orders)</span>
        </form>
      )}
      {data && (data.rows.length === 0 ? <div className="empty"><p>No orders here.</p></div> : (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Orders, newest first</caption>
            <thead><tr><th scope="col">Order</th><th scope="col">Placed</th><th scope="col">Customer</th><th scope="col">Items</th><th scope="col">Total</th><th scope="col">Status</th></tr></thead>
            <tbody>{data.rows.map((o) => (
              <tr key={String(o.id)}>
                <td><Link href={`/admin/orders/${o.id}`}>{String(o.number)}</Link>{o.payment_mode === "test" && <><br /><span className="flag warn">TEST</span></>}</td>
                <td>{formatDate(String(o.created_at), true)}</td>
                <td>{String(o.name)}<br /><span className="muted small">{String(o.email)}</span></td>
                <td className="small">{String(o.item_names ?? "")}</td>
                <td>{nairaFromKobo(String(o.total_kobo))}</td>
                <td><span className={`status-pill ${o.status}`}>{ORDER_STATUS_LABEL[o.status as OrderStatus] ?? String(o.status)}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ))}
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
