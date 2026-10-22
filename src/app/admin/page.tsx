import Link from "next/link";
import { requireAdmin } from "@/lib/admin-session";
import { getDb } from "@/lib/db";
import { getStore } from "@/lib/inquiries";
import { orderCounts } from "@/lib/shop/orders";
import { paystackMode } from "@/lib/shop/paystack";
import { QUEUES, paymentsAvailability } from "@/lib/shop/orders";
import { shopEmailConfigured } from "@/lib/shop/mail";
import { ORDER_STATUS_LABEL, nairaFromKobo, type OrderStatus } from "@/lib/shop/format";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  await requireAdmin();
  let dbError = "";
  let counts: Record<string, number> = {};
  let stats = { revenue: "0", products: 0, unavailable: 0, needsPrice: 0, unconfirmed: 0, dbKind: "" };
  const queues: Record<string, number> = {};
  try {
    const db = await getDb();
    counts = await orderCounts();
    const one = async (sql: string) => Number((await db.query<{ n: number }>(sql)).rows[0]?.n ?? 0);
    stats = {
      revenue: String((await db.query<{ n: string }>(`SELECT COALESCE(SUM(total_kobo - refunded_kobo), 0)::text AS n FROM orders WHERE payment_status IN ('paid','partially_refunded') AND payment_mode = 'live'`)).rows[0].n),
      products: await one(`SELECT COUNT(*)::int AS n FROM products WHERE status = 'published'`),
      unavailable: await one(`SELECT COUNT(*)::int AS n FROM products WHERE status = 'published' AND fulfilment_type = 'unavailable'`),
      needsPrice: await one(`SELECT COUNT(*)::int AS n FROM products WHERE price_verification = 'needs_verification' AND status <> 'archived'`),
      unconfirmed: await one(`SELECT COUNT(*)::int AS n FROM products WHERE resale_status = 'unconfirmed' AND status <> 'archived'`),
      dbKind: db.kind,
    };
    for (const [k, v] of Object.entries(QUEUES)) queues[k] = await one(`SELECT COUNT(*)::int AS n FROM orders o WHERE ${v.where}`);
  } catch (e) {
    dbError = (e as Error).message;
  }
  const mode = paystackMode();
  const pay = paymentsAvailability();
  const inquiryStore = getStore();
  return (
    <>
      <h1 style={{ fontSize: "1.8rem" }}>Dashboard</h1>
      {dbError && <div className="alert bad" role="alert"><p><strong>Database unavailable.</strong> Check DATABASE_URL and that the database is running. ({dbError})</p></div>}
      <div className="card" style={{ marginBottom: 22 }}>
        <h2 className="h-small">Setup status</h2>
        <ul className="feature-list">
          <li><span className={`flag ${stats.dbKind === "postgres" ? "good" : "warn"}`}>{stats.dbKind === "postgres" ? "OK" : stats.dbKind ? "LOCAL" : "OFF"}</span> Database: {stats.dbKind === "postgres" ? "PostgreSQL" : stats.dbKind === "pglite" ? "local development database (.data/pglite)" : "not connected"}</li>
          <li><span className={`flag ${mode === "live" ? "good" : mode === "test" ? "warn" : "bad"}`}>{mode.toUpperCase()}</span> Payments (Paystack): {mode === "live" ? (pay.ok ? "live mode — real payments enabled" : "live key set but PAYMENTS_LIVE_ENABLED is not true — online payment is switched off") : mode === "test" ? "test mode — no real money is charged" : "not configured — customers receive manual payment instructions"}</li>
          <li><span className={`flag ${shopEmailConfigured() ? "good" : "warn"}`}>{shopEmailConfigured() ? "OK" : "OFF"}</span> Customer emails (Resend): {shopEmailConfigured() ? "configured" : "not configured — emails are recorded as not sent"}</li>
          <li><span className={`flag ${inquiryStore ? "good" : "warn"}`}>{inquiryStore ? "OK" : "OFF"}</span> Inquiry storage: {inquiryStore?.kind ?? "none"}</li>
        </ul>
      </div>
      <div className="stats">
        {Object.entries(QUEUES).map(([k, v]) => <Link key={k} className="stat" href={`/admin/orders?queue=${k}`}><b>{queues[k] ?? 0}</b><span>{v.label}</span></Link>)}
        <div className="stat"><b>{nairaFromKobo(stats.revenue)}</b><span>Live revenue (net of refunds)</span></div>
      </div>
      <div className="stats">
        <Link className="stat" href="/admin/products"><b>{stats.products}</b><span>Published products</span></Link>
        <Link className="stat" href="/admin/products?flag=unavailable"><b>{stats.unavailable}</b><span>Marked unavailable</span></Link>
        <Link className="stat" href="/admin/products?flag=price"><b>{stats.needsPrice}</b><span>Prices needing verification</span></Link>
        <Link className="stat" href="/admin/products?flag=resale"><b>{stats.unconfirmed}</b><span>Resale permission unconfirmed</span></Link>
      </div>
      <h2 className="h-small" style={{ marginTop: 10 }}>Requests by status</h2>
      <div className="stats">{(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((s) => <Link key={s} className="stat" href={`/admin/orders?status=${s}`}><b>{counts[s] ?? 0}</b><span>{ORDER_STATUS_LABEL[s]}</span></Link>)}</div>
    </>
  );
}
