import Link from "next/link";
import { requireAdmin } from "@/lib/admin-session";
import ServiceForm from "@/components/admin/ServiceForm";
import { inquiryTypes } from "@/lib/site";

export const metadata = { title: "Add a service" };

export default async function NewService() {
  await requireAdmin();
  return (
    <>
      <p><Link href="/admin/services">← All services</Link></p>
      <h1 style={{ fontSize: "1.8rem" }}>Add a service</h1>
      <p className="muted">New services start as a draft. Use Preview to check the page, then publish. Only describe services Cloud Edge can genuinely provide.</p>
      <ServiceForm inquiryTypes={inquiryTypes} initial={{ id: "", slug: "", title: "", icon: "code", category: "", summary: "", problem: "", what: "", items: "", goodFor: "", inquiryType: "", status: "draft", sortOrder: "999", priceText: "", imageAlt: "", imageId: null, slugLocked: false }} />
    </>
  );
}
