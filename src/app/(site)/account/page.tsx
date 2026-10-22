import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/ui";
import { currentCustomer } from "@/lib/shop/customers";
import { customerOrders } from "@/lib/shop/orders";
import { ORDER_STATUS_LABEL, formatDate, nairaFromKobo, type OrderStatus } from "@/lib/shop/format";
import { logout } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default async function Account() {
  const me = await currentCustomer();
  if (!me) redirect("/account/login");
  const orders = await customerOrders(me.id);
  return (
    <>
      <PageHero eyebrow="Account" title={`Hello, ${me.name.split(" ")[0]}`} intro={me.email} />
      <section className="section tight"><div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: "1.4rem", margin: 0 }}>Your requests and orders</h2>
          <form action={logout}><button type="submit" className="btn btn-outline btn-sm">Sign out</button></form>
        </div>
        {orders.length ? (
          <div className="table-wrap" style={{ marginTop: 18 }}>
            <table>
              <thead><tr><th scope="col">Reference</th><th scope="col">Date</th><th scope="col">Total</th><th scope="col">Status</th></tr></thead>
              <tbody>{orders.map((o) => (
                <tr key={o.id}><td><Link href={`/orders/${o.number}`}>{o.number}</Link>{o.payment_mode === "test" && o.payment_status === "paid" ? <span className="muted small"> (test payment)</span> : null}</td><td>{formatDate(o.created_at)}</td><td>{o.accepted_quote_id ? nairaFromKobo(o.total_kobo) : <span className="muted small">Indicative {nairaFromKobo(o.indicative_total_kobo ?? o.total_kobo)}</span>}</td><td><span className={`status-pill ${o.status}`}>{ORDER_STATUS_LABEL[o.status as OrderStatus] ?? o.status}</span></td></tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <div className="empty" style={{ marginTop: 18 }}><p>No requests yet. Requests you send while signed in appear here.</p><Link className="btn btn-primary" href="/products">Browse products</Link></div>
        )}
        <p className="muted small" style={{ marginTop: 16 }}>Sent a request as a guest? Use the link in your acknowledgement email to view it.</p>
      </div></section>
    </>
  );
}
