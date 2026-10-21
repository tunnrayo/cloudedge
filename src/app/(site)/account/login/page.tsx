import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/ui";
import { LoginForm } from "@/components/shop/AuthForms";
import { currentCustomer } from "@/lib/shop/customers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await currentCustomer()) redirect("/account");
  const next = (await searchParams).next ?? "/account";
  return (<><PageHero eyebrow="Account" title="Sign in" /><section className="section tight"><div className="container" style={{ maxWidth: 520 }}><LoginForm next={next} /></div></section></>);
}
