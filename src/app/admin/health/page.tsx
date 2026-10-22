import { requireAdmin } from "@/lib/admin-session";
import { runHealth } from "@/lib/health";
import type { HealthStatus } from "@/lib/health-core";
import { testEmailAction, testPaystackAction } from "./actions";

export const metadata = { title: "Health" };
export const dynamic = "force-dynamic";
const fmt = (iso: string) => new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "medium", timeZone: "Africa/Lagos" });
const cls: Record<HealthStatus, string> = { PASS: "good", FAIL: "bad", WARNING: "warn", "NOT CONFIGURED": "muted", "NOT TESTED": "muted" };

export default async function HealthPage() {
  await requireAdmin();
  const r = await runHealth();
  return (
    <>
      <h1 style={{ fontSize: "1.8rem" }}>Health</h1>
      <p className="muted">Live checks of this running website. A check says PASS only when it was actually tested; settings that exist but were not tested show NOT TESTED. Secret values are never shown.</p>
      <div className={`alert ${r.status === "FAIL" ? "bad" : r.status === "WARNING" ? "info" : "ok"}`} role={r.status === "FAIL" ? "alert" : "status"}>
        <p><strong>Overall: {r.status}.</strong> Checked {fmt(r.checkedAt)}.{r.lastOkAt ? ` Last time the critical checks passed: ${fmt(r.lastOkAt)}.` : " The critical checks have not passed yet."}</p>
      </div>
      <div className="table-wrap">
        <table>
          <caption className="sr-only">Health checks</caption>
          <thead><tr><th scope="col">Check</th><th scope="col">Status</th><th scope="col">Result</th><th scope="col">Next action</th></tr></thead>
          <tbody>
            {r.checks.map((c) => (
              <tr key={c.id}>
                <th scope="row" style={{ textAlign: "left" }}>{c.label}</th>
                <td><span className={`flag ${cls[c.status]}`}>{c.status}</span></td>
                <td>{c.detail}<br /><span className="muted" style={{ fontSize: ".8rem" }}>Checked {fmt(c.checkedAt)}</span></td>
                <td>{c.action ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card" style={{ marginTop: 20 }}>
        <h2 className="h-small">Connection tests</h2>
        <p className="muted small">These make one safe, read-only call to the provider. They send no email and create no payment.</p>
        <div className="actions" style={{ marginTop: 0 }}>
          <form action={testEmailAction}><button className="btn btn-outline btn-sm" type="submit">Test email connection</button></form>
          <form action={testPaystackAction}><button className="btn btn-outline btn-sm" type="submit">Test Paystack connection</button></form>
        </div>
      </div>
      <div className="card" style={{ marginTop: 20 }}>
        <h2 className="h-small">Deployment information</h2>
        <dl className="sum">{Object.entries(r.info).map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        <p className="muted small">No background workers run. Expired quotations are closed when you press “Close expired quotations” in the Orders area.</p>
      </div>
    </>
  );
}
