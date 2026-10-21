import type { Metadata } from "next";
import CartView from "@/components/shop/CartView";
import { PageHero } from "@/components/ui";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default function CartPage() {
  return (
    <>
      <PageHero eyebrow="Shop" title="Your cart" crumbs={[{ href: "/products", label: "Products" }, { label: "Cart" }]} />
      <section className="section tight"><div className="container"><CartView /></div></section>
    </>
  );
}
