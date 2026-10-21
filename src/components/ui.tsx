import Link from "next/link";
import Image from "next/image";
import Icon, { Svg, iconPath } from "@/components/Icon";
import type { Service } from "@/lib/site";
import { formatPrice, type Product } from "@/content/products";
import type { Project } from "@/content/projects";

export function PageHero({ eyebrow, title, intro, crumbs }: { eyebrow?: string; title: string; intro?: React.ReactNode; crumbs?: { href?: string; label: string }[] }) {
  return (
    <section className="page-hero">
      <div className="container">
        {crumbs && (
          <nav aria-label="Breadcrumb">
            <ol className="crumbs">
              <li><Link href="/">Home</Link></li>
              {crumbs.map((c) => <li key={c.label}>{c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}</li>)}
            </ol>
          </nav>
        )}
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
    </section>
  );
}

export function SectionHead({ eyebrow, title, children, center, id }: { eyebrow?: string; title: string; children?: React.ReactNode; center?: boolean; id?: string }) {
  return (
    <div className={`section-head${center ? " center" : ""}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 id={id}>{title}</h2>
      {children}
    </div>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return <div className="note" role="note"><Svg name="info" /><div>{children}</div></div>;
}

export function Cta({ title = "Let's build something great", text = "Tell us about your project and we will reply by email to discuss next steps." }: { title?: string; text?: string }) {
  return (
    <section className="cta-band" aria-labelledby="cta-title">
      <div className="container cta-inner">
        <div className="cta-text">
          <Image src="/brand/icon-512.png" alt="" width={56} height={56} loading="eager" />
          <div><h2 id="cta-title">{title}</h2><p>{text}</p></div>
        </div>
        <div className="actions" style={{ marginTop: 0 }}>
          <Link className="btn btn-primary" href="/quote">Request a Quote <Svg name="arrow" /></Link>
          <Link className="btn btn-light" href="/contact">Get in Touch</Link>
        </div>
      </div>
    </section>
  );
}

export function ServiceCard({ s, headingLevel = 3 }: { s: Service; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="card hover">
      <Icon name={s.icon} />
      <H style={headingLevel === 2 ? { fontSize: "1.15rem", marginTop: 18 } : undefined}>
        <Link className="card-link" href={`/services/${s.slug}`} style={{ color: "inherit", textDecoration: "none" }}>{s.title}</Link>
      </H>
      <p>{s.summary}</p>
      <span className="link-arrow" aria-hidden="true" style={{ color: "var(--blue)" }}>Learn more <Svg name="arrow" /></span>
    </article>
  );
}

/** Branded illustration used when a product or project has no real photo yet. */
export function MediaArt({ icon, label, seed = 0 }: { icon: string; label: string; seed?: number }) {
  const hue = [0, 1, 2, 3][seed % 4];
  const glowX = [70, 30, 60, 40][hue];
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label={label} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`bg${seed}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#061433" /><stop offset="1" stopColor="#0b2d76" /></linearGradient>
        <radialGradient id={`gl${seed}`} cx={`${glowX}%`} cy="45%" r="55%"><stop offset="0" stopColor="#0b66f5" stopOpacity=".55" /><stop offset="1" stopColor="#0b66f5" stopOpacity="0" /></radialGradient>
        <pattern id={`dots${seed}`} width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="#7fdcff" opacity=".18" /></pattern>
      </defs>
      <rect width="320" height="200" fill={`url(#bg${seed})`} />
      <rect width="320" height="200" fill={`url(#dots${seed})`} />
      <rect width="320" height="200" fill={`url(#gl${seed})`} />
      <g fill="none" stroke="#3d8bff" strokeOpacity=".45" strokeWidth="1.2">
        <path d={`M0 ${150 - hue * 6} C 80 ${120 + hue * 4}, 140 ${180 - hue * 5}, 320 ${110 + hue * 8}`} />
        <path d={`M0 ${170 - hue * 3} C 90 ${150 + hue * 2}, 170 ${195}, 320 ${140 + hue * 5}`} strokeOpacity=".25" />
      </g>
      <g transform="translate(130 70)">
        <rect width="60" height="60" rx="14" fill="#061433" fillOpacity=".7" stroke="#40a0ff" strokeWidth="1.5" />
        <g transform="translate(15 15) scale(1.25)" fill="none" stroke="#8fd0ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d={iconPath(icon)} />
        </g>
      </g>
    </svg>
  );
}
export function ProductCard({ p, index = 0 }: { p: Product; index?: number }) {
  return (
    <article className="card hover product-card">
      <div className="product-media">
        {p.image ? <Image src={p.image} alt={p.imageAlt ?? p.name} fill sizes="(max-width: 640px) 100vw, 33vw" style={{ objectFit: "cover" }} /> : <MediaArt icon={p.icon} label={`Illustration for ${p.name}`} seed={index} />}
        {p.sample && <span className="badge sample">Sample listing</span>}
      </div>
      <div className="product-body">
        <div className="meta"><span className="badge cat">{p.category}</span></div>
        <h3><Link className="card-link" href={`/products/${p.slug}`} style={{ color: "inherit", textDecoration: "none" }}>{p.name}</Link></h3>
        <p>{p.summary}</p>
        <div className="price">
          <strong>{formatPrice(p.price)}</strong>
          {p.sample && <small>Sample price — not a real offer</small>}
        </div>
      </div>
    </article>
  );
}

export function ProjectCard({ p, index = 0 }: { p: Project; index?: number }) {
  return (
    <article className="card product-card" id={p.slug}>
      <div className="product-media">
        {p.image ? <Image src={p.image} alt={p.imageAlt ?? p.title} fill sizes="(max-width: 640px) 100vw, 33vw" style={{ objectFit: "cover" }} /> : <MediaArt icon={p.icon} label={`Illustration for ${p.title}`} seed={index + 1} />}
        {p.kind === "demo" ? <span className="badge demo">Demo concept</span> : <span className="badge client">Client project</span>}
      </div>
      <div className="product-body">
        <div className="meta"><span className="badge cat">{p.sector}</span>{p.year && <span className="muted" style={{ fontSize: ".85rem" }}>{p.year}</span>}</div>
        <h3>{p.title}</h3>
        <p>{p.summary}</p>
        <details style={{ marginTop: 14 }}>
          <summary className="link-arrow" style={{ cursor: "pointer", color: "var(--blue)" }}>View concept details</summary>
          <div style={{ marginTop: 12, fontSize: ".93rem" }}>
            <p className="mb-0"><strong>Challenge:</strong> {p.challenge}</p>
            <p style={{ marginTop: 8 }}><strong>Approach:</strong> {p.approach}</p>
            <ul className="feature-list">{p.features.map((f) => <li key={f}><Svg name="check" />{f}</li>)}</ul>
          </div>
        </details>
        {p.kind === "demo" && <p className="muted" style={{ marginTop: 14, fontSize: ".82rem" }}>Illustrative concept prepared to show capability. Not a client project.</p>}
      </div>
    </article>
  );
}

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="faq">
      {items.map((f) => (
        <details key={f.q}><summary>{f.q}</summary><div className="answer"><p>{f.a}</p></div></details>
      ))}
    </div>
  );
}
