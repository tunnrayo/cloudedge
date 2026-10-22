import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-session";
import { getDb } from "@/lib/db";
import ServiceForm from "@/components/admin/ServiceForm";
import { getServiceById, inquiryUsage } from "@/lib/services-core";
import { inquiryTypes } from "@/lib/site";
import { deleteServiceAction } from "../actions";

export const metadata = { title: "Edit service" };

export default async function EditService({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const db = await getDb();
  const s = await getServiceById(db, id);
  if (!s) notFound();
  const used = await inquiryUsage(db, s.inquiryType).catch(() => 0);
  return (
    <>
      <p><Link href="/admin/services">← All services</Link> · <Link href={`/admin/services/${s.id}/preview`}>Preview</Link>{s.status === "published" && <> · <Link href={`/services/${s.slug}`} target="_blank">View live page</Link></>}</p>
      <h1 style={{ fontSize: "1.8rem" }}>{s.title}</h1>
      {sp.ok && <div className="alert ok" role="status"><p>{sp.ok.slice(0, 200)}</p></div>}
      {sp.err && <div className="alert bad" role="alert"><p>{sp.err.slice(0, 400)}</p></div>}
      <ServiceForm inquiryTypes={inquiryTypes} initial={{
        id: s.id, slug: s.slug, title: s.title, icon: s.icon, category: s.category, summary: s.summary, problem: s.problem, what: s.what, items: s.items.join("\n"), goodFor: s.goodFor.join("\n"),
        inquiryType: s.inquiryType, status: s.status, sortOrder: String(s.sortOrder), priceText: s.priceText, imageAlt: s.imageAlt, imageId: s.imageId, slugLocked: s.status !== "draft",
      }} />
      <div className="card" style={{ marginTop: 24 }}>
        <h2 className="h-small">Delete this service</h2>
        <p className="muted small">{s.status === "published" ? "A published service cannot be deleted. Make it Inactive first." : used > 0 ? `Customers have sent ${used} inquiry(ies) of type “${s.inquiryType}”, so this service is kept for your records. Use Inactive instead.` : "This removes the service permanently. This cannot be undone."}</p>
        <form action={deleteServiceAction} className="stack">
          <input type="hidden" name="id" value={s.id} />
          <label className="check"><input type="checkbox" name="confirm" value="yes" /> <span>I understand this permanently deletes “{s.title}”.</span></label>
          <div className="actions" style={{ marginTop: 0 }}><button className="btn btn-outline btn-sm" type="submit">Delete service</button></div>
        </form>
      </div>
    </>
  );
}
