import type { Metadata } from "next";
import Cta from "@/components/Cta";
export const metadata: Metadata = { title: "Projects", description: "Project showcase for Cloud Edge Technology Services Limited." };
// Add genuine, approved projects here.
const projects: { title: string; client: string; summary: string; year: string }[] = [];

export default function Portfolio() {
  return (<>
    <section className="section"><div className="wrap" style={{ maxWidth: 820 }}>
      <p className="eyebrow">Projects</p><h1>Our work</h1>
      {projects.length ? (<div className="cards">{projects.map((p) => <article className="card" key={p.title}><h2 style={{ fontSize: "1.2rem" }}>{p.title}</h2><p>{p.client} · {p.year}</p><p>{p.summary}</p></article>)}</div>) : <p>Completed project case studies will be published here once approved. To discuss a project, use the quote form.</p>}
    </div></section><Cta /></>);
}
