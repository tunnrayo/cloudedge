import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-session";
import { getDb } from "@/lib/db";
import ServiceView from "@/components/ServiceView";
import { getServiceById, listServices } from "@/lib/services-core";

export const metadata = { title: "Service preview" };

export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const db = await getDb();
  const s = await getServiceById(db, id);
  if (!s) notFound();
  const others = (await listServices(db, { publishedOnly: true })).filter((x) => x.id !== s.id).slice(0, 3);
  return (
    <>
      <div className="alert info" role="note"><p><strong>Preview.</strong> This is how the page looks to visitors. Status: {s.status}. {s.status === "published" ? "It is live." : "Visitors cannot see it until you publish it."} <Link href={`/admin/services/${s.id}`}>← Back to editing</Link></p></div>
      <ServiceView s={s} others={others} />
    </>
  );
}
