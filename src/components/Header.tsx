"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { nav, company } from "@/lib/site";

export default function Header() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  return (
    <header className="site">
      <a className="skip" href="#main">Skip to content</a>
      <div className="wrap bar">
        <Link href="/" aria-label={`${company.short} home`} onClick={() => setOpen(false)}>
          <Image src="/brand/logo-full.png" alt={company.name} width={1640} height={390} priority style={{ height: 42, width: "auto" }} />
        </Link>
        <button className="menu" aria-expanded={open} aria-controls="mainnav" onClick={() => setOpen(!open)}>{open ? "Close" : "Menu"}</button>
        <nav id="mainnav" className={open ? "open" : ""} aria-label="Main">
          <ul>
            {nav.map((n) => (
              <li key={n.href}><Link className="l" href={n.href} aria-current={path === n.href ? "page" : undefined} onClick={() => setOpen(false)}>{n.label}</Link></li>
            ))}
          </ul>
        </nav>
        <Link className="btn hd" href="/quote">Get a Quote</Link>
      </div>
    </header>
  );
}
