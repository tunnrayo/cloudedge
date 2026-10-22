import type { Metadata } from "next";
import CartView from "@/components/shop/CartView";
import { PageHero } from "@/components/ui";

export const metadata: Metadata = { title: "Your request list", robots: { index: false } };

export default function CartPage() {
  return (
    <>
      <PageHero eyebrow="Request a quotation" title="Your request list" intro="Software you would like us to source. Nothing is charged at this stage." crumbs={[{ href: "/products", label: "Products" }, { label: "Request list" }]} />
      <section className="section tight"><div className="container"><CartView /></div></section>
    </>
  );
}
