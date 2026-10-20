import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/Icon";
import Cta from "@/components/Cta";
import { services, faqs } from "@/lib/site";

const steps = [["Discuss", "You tell us the problem and goals through the inquiry form."], ["Scope", "We agree on what will be built, how, and what it needs."], ["Build", "We design and develop, sharing progress for your feedback."], ["Launch & support", "We deploy, hand over documentation and plan ongoing support."]];

export default function Home() {
  return (<>
    <section className="hero"><div className="wrap grid">
      <div>
        <p className="eyebrow">Technology · E-commerce · Digital solutions</p>
        <h1>Building Smarter <span>Digital</span> Solutions</h1>
        <p>Cloud Edge Technology Services Limited is a Nigerian technology and e-commerce company focused on software, web and mobile application development, internet-related services, digital products and technology solutions for businesses and individuals.</p>
        <div className="actions"><Link className="btn" href="/quote">Discuss Your Project</Link><Link className="btn ghost" href="/services">Explore Our Services</Link></div>
      </div>
      <Image className="mark" src="/brand/icon-512.png" alt="Cloud Edge app icon" width={300} height={300} priority />
    </div></section>

    <section className="section"><div className="wrap">
      <p className="eyebrow">Our services</p><h2>Technology solutions for a digital world</h2>
      <p style={{ maxWidth: 680 }}>Many businesses need reliable software and a clear online presence but are unsure where to start. These are the areas we help with.</p>
      <div className="cards">{services.map((s) => (
        <article className="card" key={s.slug}><Icon name={s.icon} /><h3>{s.title}</h3><p>{s.summary}</p><Link className="more" href={`/services/${s.slug}`}>Learn more<span className="sr"> about {s.title}</span> →</Link></article>))}</div>
    </div></section>

    <section className="section soft"><div className="wrap">
      <p className="eyebrow">How we work</p><h2>A clear process from first message to launch</h2>
      <ol className="steps">{steps.map(([t, d]) => <li key={t}><h3>{t}</h3><p>{d}</p></li>)}</ol>
    </div></section>

    <section className="section"><div className="wrap two">
      <div><p className="eyebrow">About Cloud Edge</p><h2>A technology partner based in Abuja</h2>
        <p>Cloud Edge Technology Services Limited is a registered Nigerian company (RC 9922715). We aim to give businesses and organizations dependable, practical technology.</p>
        <Link className="btn outline" href="/about">Learn more about us</Link></div>
      <div><h3>Frequently asked</h3>{faqs.slice(0, 3).map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}<Link href="/faq">See all questions</Link></div>
    </div></section>
    <Cta />
  </>);
}
