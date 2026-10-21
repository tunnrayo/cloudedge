import type { Metadata } from "next";
import Link from "next/link";
import { Svg } from "@/components/Icon";
import { PageHero } from "@/components/ui";
import { faqs, services, solutions } from "@/lib/site";
import { getProducts } from "@/lib/catalog";

export const metadata: Metadata = { title: "Search", description: "Search the Cloud Edge website.", robots: { index: false } };

type Result = { kind: string; title: string; text: string; href: string };
const pages: Result[] = [
  { kind: "Page", title: "About us", text: "Company overview, mission, vision and approach.", href: "/about" },
  { kind: "Page", title: "Contact", text: "Email, registered address and contact form.", href: "/contact" },
  { kind: "Page", title: "Request a quote", text: "Describe your project and request a quote.", href: "/quote" },
  { kind: "Page", title: "Portfolio", text: "Project showcase and demo concepts.", href: "/portfolio" },
  { kind: "Page", title: "Privacy Policy", text: "How information submitted through this website is handled.", href: "/privacy" },
  { kind: "Page", title: "Terms of Use", text: "Terms for using this website.", href: "/terms" },
];

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const terms = q.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  const products = await getProducts();
  const all: Result[] = [
    ...services.map((s) => ({ kind: "Service", title: s.title, text: s.summary, href: `/services/${s.slug}`, body: [s.problem, s.what, ...s.items].join(" ") })),
    ...solutions.map((s) => ({ kind: "Solution", title: s.title, text: s.text, href: "/solutions" })),
    ...products.map((p) => ({ kind: p.sample ? "Product (sample)" : "Product", title: p.name, text: p.summary, href: `/products/${p.slug}`, body: [p.category, ...p.features].join(" ") })),
    ...faqs.map((f) => ({ kind: "FAQ", title: f.q, text: f.a, href: "/faq" })),
    ...pages,
  ];
  const results = terms.length
    ? all
        .map((r) => {
          const hay = `${r.title} ${r.text} ${"body" in r ? (r as { body: string }).body : ""}`.toLowerCase();
          const score = terms.reduce((n, t) => n + (r.title.toLowerCase().includes(t) ? 3 : 0) + (hay.includes(t) ? 1 : 0), 0);
          return { r, score, all: terms.every((t) => hay.includes(t)) };
        })
        .filter((x) => x.all)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.r)
    : [];

  return (
    <>
      <PageHero eyebrow="Search" title="Search the website" crumbs={[{ label: "Search" }]} />
      <section className="section">
        <div className="container narrow">
          <form className="search-form" action="/search" method="get" role="search">
            <label htmlFor="q" className="sr-only">Search for</label>
            <input id="q" name="q" type="search" defaultValue={q} placeholder="e.g. website, mobile app, e-commerce" autoFocus maxLength={100} />
            <button className="btn btn-primary" type="submit"><Svg name="search" /> Search</button>
          </form>
          <div style={{ marginTop: 32 }} aria-live="polite">
            {q && <p className="muted">{results.length} result{results.length === 1 ? "" : "s"} for “{q}”</p>}
            {results.length > 0 && (
              <ul className="results">
                {results.map((r) => (
                  <li key={r.kind + r.title}><Link href={r.href}><span className="kind">{r.kind}</span><h3>{r.title}</h3><p>{r.text}</p></Link></li>
                ))}
              </ul>
            )}
            {q && results.length === 0 && (
              <div className="empty"><p>No results found. Try a different word, or <Link href="/contact">contact us</Link> with your question.</p></div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
