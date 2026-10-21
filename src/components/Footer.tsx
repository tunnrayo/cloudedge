import Link from "next/link";
import Image from "next/image";
import { company, nav, social, services } from "@/lib/site";
import { Svg } from "@/components/Icon";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Link href="/" className="footer-logo" aria-label={`${company.name} — home`}>
            <Image src="/brand/logo-full.png" alt={company.name} width={1640} height={390} sizes="170px" />
          </Link>
          <p style={{ marginTop: 18, maxWidth: 340 }}>{company.tagline}</p>
          {social.length > 0 && (
            <ul aria-label="Social media" style={{ display: "flex", gap: 12 }}>
              {social.map((s) => <li key={s.href}><a href={s.href} rel="noopener noreferrer" target="_blank">{s.label}</a></li>)}
            </ul>
          )}
        </div>

        <div>
          <h2>Quick links</h2>
          <ul className="footer-links">
            {nav.map((n) => <li key={n.href}><Link href={n.href}>{n.label}</Link></li>)}
            <li><Link href="/quote">Request a Quote</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <h2>Contact us</h2>
          <ul className="footer-contact">
            <li><Svg name="mail" /><a href={`mailto:${company.email}`}>{company.email}</a></li>
            <li><Svg name="pin" /><address style={{ fontStyle: "normal" }}>{company.address.join(", ")}</address></li>
            <li><Svg name="id" /><span>RC {company.rc}</span></li>
          </ul>
        </div>

        <div>
          <h2>Services</h2>
          <ul>
            {services.slice(0, 5).map((s) => <li key={s.slug}><Link href={`/services/${s.slug}`}>{s.title}</Link></li>)}
            <li><Link href="/services">All services</Link></li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {year} {company.name}. All rights reserved.</span>
        <span><Link href="/privacy">Privacy Policy</Link> · <Link href="/terms">Terms of Use</Link> · <Link href="/refund-policy">Refund &amp; Delivery</Link></span>
      </div>
    </footer>
  );
}
