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
          <Link href="/admin">{company.short} · Inquiries admin</Link>
          <nav aria-label="Admin">
            <Link href="/">View website</Link>
            {signedIn && <Link href="/admin/export">Export CSV</Link>}
            {signedIn && <form action={logout}><button type="submit">Sign out</button></form>}
          </nav>
        </div>
      </header>
      <main id="main" className="admin-main"><div className="container">{children}</div></main>
    </div>
  );
}
