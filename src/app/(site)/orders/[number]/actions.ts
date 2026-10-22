"use server";
import { redirect } from "next/navigation";
import { canView, decideQuote, getOrderByNumber, WorkflowError } from "@/lib/shop/orders";
import { currentCustomer } from "@/lib/shop/customers";

/** Customer accepts or declines a quotation. Requires the secret link or the logged-in owner. */
export async function decide(form: FormData) {
  const number = String(form.get("number") ?? "");
  const t = String(form.get("t") ?? "");
  const quoteId = String(form.get("quote") ?? "");
  const decision = form.get("decision") === "accept" ? "accept" : "decline";
  const order = await getOrderByNumber(number);
  const me = await currentCustomer();
  if (!order || !canView(order, t || undefined, me?.id ?? null)) redirect("/");
  if (decision === "accept" && form.get("confirm") !== "on") {
    redirect(`/orders/${number}?${new URLSearchParams({ ...(t ? { t } : {}), err: "Please tick the box to confirm you accept the quotation." })}`);
  }
  const q = new URLSearchParams();
  if (t) q.set("t", t);
  try {
    await decideQuote(order, quoteId, decision, "customer", String(form.get("note") ?? "").slice(0, 1000));
    q.set("done", decision);
  } catch (e) {
    q.set("err", e instanceof WorkflowError ? e.message : "Something went wrong. Please try again.");
  }
  redirect(`/orders/${number}?${q.toString()}`);
}
