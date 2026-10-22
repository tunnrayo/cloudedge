import type { Metadata } from "next";
import Catalogue, { type CatalogueParams } from "@/components/shop/Catalogue";
import { Cta, PageHero } from "@/components/ui";
import { ShopNotice } from "@/components/shop/ShopNotice";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Request Software & Digital Products",
  description: "Microsoft 365, Google Workspace, Adobe, Norton, Bitdefender, developer tools, VPN, backup and cloud services, sourced on request by Cloud Edge Technology Services Limited, with indicative naira prices and a quotation before you pay.",
  alternates: { canonical: "/products" },
};

export default async function Products({ searchParams }: { searchParams: Promise<CatalogueParams> }) {
  return (
    <>
      <PageHero eyebrow="Shop" title="Software, subscriptions & digital products" crumbs={[{ label: "Products" }]}
        intro="Business software, security, creative, developer and cloud products, sourced on request. Indicative naira prices are shown; we confirm availability and the final price in a quotation before you pay." />
      <section className="section tight">
        <div className="container">
          <ShopNotice />
          <Catalogue params={await searchParams} />
        </div>
      </section>
      <Cta title="Can't find what you need?" text="Tell us the product or plan and we will reply with availability and a naira price." />
    </>
  );
}
