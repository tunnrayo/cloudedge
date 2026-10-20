import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import Cta from "@/components/Cta";
import { services } from "@/lib/site";
export const metadata: Metadata = { title: "Services", description: "Software development, web and mobile applications, e-commerce, internet-related services and digital solutions from Cloud Edge." };

export default function Services() {
  return (<>
    <section className="section"><div className="wrap">
      <p className="eyebrow">Services</p><h1>What we can help you with</h1>
      <div className="note" role="note" style={{ margin: "12px 0 24px" }}>These are proposed service categories. Availability of each is confirmed during your inquiry.</div>
      <div className="cards">{services.map((s) => (
        <article className="card" key={s.slug}><Icon name={s.icon} /><h2 style={{ fontSize: "1.2rem" }}>{s.title}</h2><p>{s.summary}</p><Link className="more" href={`/services/${s.slug}`}>Details →</Link></article>))}</div>
    </div></section><Cta /></>);
}
