"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { nav, company } from "@/lib/site";
import { Svg } from "@/components/Icon";
import CartIcon from "@/components/shop/CartIcon";

export default function Header() {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  // Close the mobile menu whenever the page changes.
  const [lastPath, setLastPath] = useState(path);
  if (path !== lastPath) { setLastPath(path); setOpen(false); }

  useEffect(() => {
    document.body.classList.toggle("nav-open", open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

  return (
    <header className="site-header">
      <a className="skip-link" href="#main">Skip to main content</a>
      <div className="container header-bar">
        <Link href="/" className="brand" aria-label={`${company.name} — home`}>
          <Image src="/brand/logo-full.png" alt={company.name} width={1640} height={390} priority sizes="200px" />
        </Link>

        <nav id="main-nav" className={`main-nav${open ? " open" : ""}`} aria-label="Main">
          <ul>
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} aria-current={isActive(n.href) ? "page" : undefined}>{n.label}</Link>
              </li>
            ))}
          </ul>
          <div className="nav-mobile-extra">
            <Link className="btn btn-primary" href="/quote">Get a Quote <Svg name="arrow" /></Link>
            <Link className="btn btn-outline" href="/search">Search the site</Link>
            <Link className="btn btn-outline" href="/account">Your account &amp; orders</Link>
          </div>
        </nav>

        <div className="header-tools">
          <Link className="icon-btn hide-sm" href="/search" aria-label="Search the website"><Svg name="search" /></Link>
          <Link className="icon-btn" href="/account" aria-label="Your account and orders"><Svg name="user" /></Link>
          <CartIcon />
          <Link className="btn btn-primary btn-sm" href="/quote">Get a Quote <Svg name="arrow" /></Link>
          <button
            type="button" className="icon-btn menu-btn" aria-expanded={open} aria-controls="main-nav"
            aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)}
          >
            <Svg name={open ? "close" : "menu"} />
          </button>
        </div>
      </div>
    </header>
  );
}
