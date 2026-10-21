import Link from "next/link";
import Image from "next/image";
import HeroArt from "@/components/HeroArt";
import Icon, { Svg } from "@/components/Icon";
import { Cta, FaqList, SectionHead, ServiceCard } from "@/components/ui";
import ProductCard from "@/components/shop/ProductCard";
import { company, faqs, processSteps, services, solutions, values } from "@/lib/site";
import { listProducts, categoryCounts, categorySlug } from "@/lib/shop/products";

export const dynamic = "force-dynamic";

export const metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  // The shop sections are skipped (not broken) if the database is temporarily unavailable.
  const [featured, cats] = await Promise.all([
    listProducts({ sort: "featured" }).then((all) => all.filter((p) => p.featured).slice(0, 6)).catch(() => []),
    categoryCounts().catch(() => []),
  ]);
  return (
    <>
      {/* HERO */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero-grid">
          <div>
            <p className="eyebrow">Software <span className="sep">/</span> Applications <span className="sep">/</span> E-commerce</p>
            <h1 id="hero-title">Building Smarter <span className="accent">Digital</span> Solutions</h1>
            <p className="lead">
              {company.name} is a Nigerian technology and e-commerce company delivering software, web and mobile
              applications, internet-related services, digital products and technology solutions for businesses and individuals.
            </p>
            <div className="actions">
              <Link className="btn btn-primary" href="/services">Explore Our Services <Svg name="arrow" /></Link>
              <Link className="btn btn-light" href="/quote">Discuss Your Project</Link>
            </div>
            <ul className="hero-facts">
              <li><Svg name="checkCircle" />Registered company · RC {company.rc}</li>
              <li><Svg name="pin" />Wuse Zone 5, Abuja</li>
            </ul>
          </div>
          <HeroArt />
        </div>
      </section>

      {/* TRUST STRIP — confirmed facts only */}
      <section className="trust" aria-label="Company facts">
        <div className="container">
          <ul>
            <li><Icon name="id" size="sm" /><span><strong>Registered in Nigeria</strong>RC {company.rc}</span></li>
            <li><Icon name="pin" size="sm" /><span><strong>Abuja office</strong>Samfa Plaza, Wuse Zone 5</span></li>
            <li><Icon name="briefcase" size="sm" /><span><strong>Business &amp; individual clients</strong>Nigeria and international</span></li>
            <li><Icon name="mail" size="sm" /><span><strong>Easy to reach</strong>Online inquiry or email</span></li>
          </ul>
        </div>
      </section>

      {/* SERVICES */}
      <section className="section" aria-labelledby="services-title">
        <div className="container split services-split">
          <div>
            <p className="eyebrow">Our services</p>
            <h2 id="services-title">Technology solutions for a digital world</h2>
            <hr className="rule" />
            <p className="lead">We provide end-to-end technology and e-commerce services to help businesses grow, operate efficiently and serve customers in a connected world.</p>
            <div className="actions"><Link className="btn btn-primary" href="/services">View All Services <Svg name="arrow" /></Link></div>
          </div>
          <div className="grid grid-3">
            {services.slice(0, 6).map((s) => <ServiceCard key={s.slug} s={s} />)}
          </div>
        </div>
      </section>

      {/* PROBLEMS WE SOLVE */}
      <section className="section navy" aria-labelledby="solve-title">
        <div className="container">
          <SectionHead eyebrow="Business value" title="The problems we help you solve" id="solve-title">
            <p style={{ color: "#b5c6e6" }}>Technology is only useful when it removes friction for your team and your customers. These are common situations we can help with.</p>
          </SectionHead>
          <div className="grid grid-3">
            {solutions.map((s) => (
              <article className="card dark" key={s.title}>
                <Icon name={s.icon} tone="dark" />
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
          <div className="actions"><Link className="btn btn-light" href="/solutions">See how we approach solutions <Svg name="arrow" /></Link></div>
        </div>
      </section>

      {/* ABOUT BAND */}
      <section className="section soft" aria-labelledby="about-title">
        <div className="container split even">
          <div className="device" aria-hidden="true">
            <div className="device-bar"><span /><span /><span /></div>
            <div className="device-screen">
              <Image src="/brand/icon-512.png" alt="" width={200} height={200} loading="eager" />
              <div className="lines"><span /><span /><span /></div>
            </div>
          </div>
          <div>
            <p className="eyebrow">About Cloud Edge</p>
            <h2 id="about-title">Your technology partner in Nigeria and beyond</h2>
            <p className="lead">{company.name} is committed to delivering reliable, practical and scalable technology that helps businesses, organisations and individuals achieve more.</p>
            <ul className="value-list" style={{ margin: "28px 0" }}>
              {values.map((v) => (
                <li key={v.title}><Icon name={v.icon} size="sm" /><div><h3>{v.title}</h3><p>{v.text}</p></div></li>
              ))}
            </ul>
            <Link className="btn btn-primary" href="/about">Learn More About Us <Svg name="arrow" /></Link>
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      {featured.length > 0 && (
        <section className="section" aria-labelledby="products-title">
          <div className="container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 20, flexWrap: "wrap" }}>
              <SectionHead eyebrow="Shop" title="Software & digital products" id="products-title">
                <p>Productivity, security, creative, developer and cloud products — priced in naira with the vendor reference price shown.</p>
              </SectionHead>
              <Link className="link-arrow" href="/products" style={{ marginBottom: 40 }}>Browse all products <Svg name="arrow" /></Link>
            </div>
            <div className="grid grid-3">{featured.map((p) => <ProductCard key={p.id} p={p} />)}</div>
            {cats.length > 0 && (
              <ul className="tag-list" style={{ marginTop: 28 }} aria-label="Shop by category">
                {cats.map((c) => <li key={c.category}><Link href={`/products/category/${categorySlug(c.category)}`}>{c.category} ({c.count})</Link></li>)}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* PROCESS */}
      <section className="section soft" aria-labelledby="process-title">
        <div className="container">
          <SectionHead eyebrow="How we work" title="A clear process from first message to launch" id="process-title" center>
            <p>Every engagement follows the same simple steps, so you always know what happens next.</p>
          </SectionHead>
          <ol className="steps">{processSteps.map((s) => <li key={s.title}><h3>{s.title}</h3><p>{s.text}</p></li>)}</ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" aria-labelledby="faq-title">
        <div className="container split">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2 id="faq-title">Questions before you get in touch</h2>
            <p className="lead">Short answers to common questions. If yours is not here, just ask.</p>
            <Link className="link-arrow" href="/faq">See all questions <Svg name="arrow" /></Link>
          </div>
          <FaqList items={faqs.slice(0, 4)} />
        </div>
      </section>

      <Cta />
    </>
  );
}
