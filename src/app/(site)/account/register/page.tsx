import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/ui";
import { RegisterForm } from "@/components/shop/AuthForms";
import { currentCustomer } from "@/lib/shop/customers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await currentCustomer()) redirect("/account");
  const next = (await searchParams).next ?? "/account";
  return (<><PageHero eyebrow="Account" title="Create an account" intro="See all your orders and their status in one place." /><section className="section tight"><div className="container" style={{ maxWidth: 620 }}><RegisterForm next={next} /></div></section></>);
}
