import Link from "next/link";
import { company, nav } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="site">
      <div className="wrap fgrid">
        <div><h2>{company.name}</h2><p>Software, web and mobile applications, internet-related services, digital products and technology solutions.</p></div>
        <div><h2>Quick links</h2><ul>{nav.map((n) => <li key={n.href}><Link href={n.href}>{n.label}</Link></li>)}<li><Link href="/quote">Request a quote</Link></li><li><Link href="/faq">FAQ</Link></li></ul></div>
        <div><h2>Contact</h2>
          <p><a href={`mailto:${company.email}`}>{company.email}</a></p>
          <address style={{ fontStyle: "normal" }}>{company.address.map((l) => <div key={l}>{l}</div>)}</address></div>
        <div><h2>Legal</h2><ul><li><Link href="/privacy">Privacy Policy</Link></li><li><Link href="/terms">Terms of Use</Link></li></ul></div>
      </div>
      <div className="wrap legal">© {new Date().getFullYear()} {company.name}. RC {company.rc}. All rights reserved.</div>
    </footer>
  );
}
