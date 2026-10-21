import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-session";
import { getStore, STATUSES, STATUS_LABEL } from "@/lib/inquiries";
import { getProduct } from "@/lib/shop/products";
import { deleteInquiry, updateInquiry } from "../../actions";

export const metadata = { title: "Inquiry" };

export default async function InquiryDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; confirm?: string }> }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const store = getStore();
  if (!store) notFound();
  const i = await store.get(id);
  if (!i) notFound();
  const product = i.product ? await getProduct(i.product, { admin: true }).catch(() => null) : null;
  const subject = encodeURIComponent(`Re: your inquiry ${i.reference} — Cloud Edge`);
  const rows: [string, string][] = [
    ["Received", new Date(i.createdAt).toLocaleString("en-NG", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Lagos" })],
    ["Form", i.mode === "quote" ? "Request a quote" : "Contact"],
    ["Name", i.name], ["Email", i.email], ["Phone", i.phone || "—"], ["Organisation", i.organization || "—"],
    ["Inquiry type", i.type], ["Product", product ? `${product.name}` : i.product || "—"],
    ["Timeline", i.timeline || "—"], ["Budget", i.budget || "—"], ["Project description", i.scope || "—"], ["Message", i.message || "—"],
    ["Email notification", i.emailStatus === "sent" ? "Sent" : i.emailStatus === "failed" ? "Failed" : "Email not configured"],
  ];
  return (
    <>
      <p><Link href="/admin/inquiries">← All inquiries</Link></p>
      <h1 style={{ fontSize: "1.7rem" }}>Inquiry {i.reference} <span className={`status-pill ${i.status}`} style={{ verticalAlign: "middle" }}>{STATUS_LABEL[i.status]}</span></h1>
      {sp.saved && <div className="alert ok" role="status"><p>Changes saved.</p></div>}

      <div className="split wide-left" style={{ alignItems: "start", gap: 24 }}>
        <section className="card" aria-label="Inquiry details">
          <dl className="details">{rows.map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          <div className="actions">
            <a className="btn btn-primary btn-sm" href={`mailto:${i.email}?subject=${subject}`}>Reply by email</a>
          </div>
        </section>

        <div className="stack">
          <form className="card" action={updateInquiry}>
            <input type="hidden" name="id" value={i.id} />
            <h2 style={{ fontSize: "1.1rem" }}>Update</h2>
            <div className="field"><label htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue={i.status}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></div>
            <div className="field"><label htmlFor="notes">Internal notes <span className="opt">(not visible to the customer)</span></label>
              <textarea id="notes" name="notes" defaultValue={i.notes} maxLength={5000} /></div>
            <button className="btn btn-primary btn-sm" type="submit">Save changes</button>
          </form>

          <form className="card danger-zone" action={deleteInquiry}>
            <input type="hidden" name="id" value={i.id} />
            <h2 style={{ fontSize: "1.1rem" }}>Delete inquiry</h2>
            <p>Permanently removes this inquiry, for example when the person asks for their data to be deleted.</p>
            {sp.confirm && <div className="alert bad" role="alert"><p>Tick the box to confirm deletion.</p></div>}
            <label className="check"><input type="checkbox" name="confirm" value="yes" /> I understand this cannot be undone</label>
            <button className="btn btn-danger btn-sm" type="submit" style={{ marginTop: 14 }}>Delete permanently</button>
          </form>
        </div>
      </div>
    </>
  );
}
