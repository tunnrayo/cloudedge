import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ServiceView from "@/components/ServiceView";
import { getPublicService, getPublishedServices } from "@/lib/services";

type P = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const s = await getPublicService(slug);
  if (!s) return {};
  return {
    title: s.title, description: `${s.summary} ${s.what}`.slice(0, 160), alternates: { canonical: `/services/${s.slug}` },
    ...(s.status === "inactive" ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ServicePage({ params }: P) {
  const { slug } = await params;
  const s = await getPublicService(slug);
  if (!s) notFound();
  const others = (await getPublishedServices()).filter((x) => x.slug !== s.slug).slice(0, 3);
  return <ServiceView s={s} others={others} />;
}
