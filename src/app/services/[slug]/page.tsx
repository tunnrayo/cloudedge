import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Cta from "@/components/Cta";
import { services } from "@/lib/site";

type P = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return services.map((s) => ({ slug: s.slug })); }
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const s = services.find((x) => x.slug === slug);
  return s ? { title: s.title, description: s.summary } : {};
}
export default async function Service({ params }: P) {
  const { slug } = await params;
  const s = services.find((x) => x.slug === slug);
  if (!s) notFound();
  return (<>
    <section className="section"><div className="wrap" style={{ maxWidth: 820 }}>
      <p className="eyebrow"><Link href="/services">Services</Link></p><h1>{s.title}</h1>
      <h2>The problem</h2><p>{s.problem}</p>
      <h2>What we do</h2><p>{s.what}</p>
      <h2>What this can include</h2><ul className="tick">{s.items.map((i) => <li key={i}>{i}</li>)}</ul>
      <h2>Typical engagement</h2><p>Inquiry, scope discussion, agreed plan, build with feedback, launch and handover.</p>
      <div className="actions"><Link className="btn" href={`/quote?service=${s.slug}`}>Request a quote for this service</Link></div>
    </div></section><Cta /></>);
}
