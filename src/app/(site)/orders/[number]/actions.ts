"use server";
import { redirect } from "next/navigation";
import { canView, customerDecision, getOrderByNumber } from "@/lib/shop/orders";
import { currentCustomer } from "@/lib/shop/customers";

export async function decide(form: FormData) {
  const number = String(form.get("number") ?? "");
  const t = String(form.get("t") ?? "");
  const decision = form.get("decision") === "approve" ? "approve" : "cancel";
  const order = await getOrderByNumber(number);
  const me = await currentCustomer();
  if (!order || !canView(order, t || undefined, me?.id ?? null)) redirect("/");
  await customerDecision(order, decision, String(form.get("note") ?? "").slice(0, 1000));
  const q = new URLSearchParams();
  if (t) q.set("t", t);
  q.set("sent", "1");
  redirect(`/orders/${number}?${q.toString()}`);
}
