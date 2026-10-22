import type { Metadata } from "next";
import Link from "next/link";
import { company } from "@/lib/site";
import { isAdmin } from "@/lib/admin-session";
import { logout } from "./actions";

export const metadata: Metadata = { title: { default: "Admin", template: `%s | ${company.short} Admin` }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const signedIn = await isAdmin();
  return (
    <div className="admin-shell">
      <header className="admin-top">
        <div className="container">
          <Link href="/admin">{company.short} · Admin</Link>
          <nav aria-label="Admin">
            {signedIn && <><Link href="/admin">Dashboard</Link><Link href="/admin/orders">Orders</Link><Link href="/admin/orders?queue=sourcing">Sourcing queue</Link><Link href="/admin/products">Products</Link><Link href="/admin/inquiries">Inquiries</Link><Link href="/admin/services">Services</Link><Link href="/admin/health">Health</Link><Link href="/admin/audit">Audit log</Link></>}
            <Link href="/">View website</Link>
            {signedIn && <form action={logout}><button type="submit">Sign out</button></form>}
          </nav>
        </div>
      </header>
      <main id="main" className="admin-main"><div className="container">{children}</div></main>
    </div>
  );
}
