import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui";
import { company } from "@/lib/site";

export const metadata: Metadata = { title: "Request not found", robots: { index: false, follow: false } };

export default function RequestNotFound() {
  return (
    <>
      <PageHero title="Request not found" />
      <section className="section"><div className="container narrow">
        <p>We could not open this request. Use the link from your acknowledgement email, or <Link href="/account/login">sign in</Link> if you sent it with an account.</p>
        <p>Need help? Email <a href={`mailto:${company.email}`}>{company.email}</a>.</p>
      </div></section>
    </>
  );
}
