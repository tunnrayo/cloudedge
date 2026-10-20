import type { Metadata } from "next";
import Link from "next/link";
import Cta from "@/components/Cta";
import { services } from "@/lib/site";
export const metadata: Metadata = { title: "Solutions & Products", description: "Technology solution capabilities from Cloud Edge Technology Services Limited." };
// Add real products here when approved. Empty array shows the capability view.
const products: { name: string; summary: string; status: string }[] = [];

export default function Solutions() {
  return (<>
    <section className="section"><div className="wrap" style={{ maxWidth: 900 }}>
      <p className="eyebrow">Solutions &amp; products</p><h1>Solutions we can build with you</h1>
      {products.length ? (<div className="cards">{products.map((p) => <article className="card" key={p.name}><h2 style={{ fontSize: "1.2rem" }}>{p.name}</h2><p>{p.summary}</p><p><strong>{p.status}</strong></p></article>)}</div>) : (
        <><p>Cloud Edge has no public digital products listed yet. Until products are announced, this page describes the kinds of solutions we can design with you.</p>
        <ul className="tick">{services.map((s) => <li key={s.slug}><Link href={`/services/${s.slug}`}>{s.title}</Link>: {s.summary}</li>)}</ul></>)}
    </div></section><Cta /></>);
}
