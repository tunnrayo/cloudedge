"use server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-session";
import { audit } from "@/lib/audit-server";
import { lastTests } from "@/lib/health";
import { testEmailConnection, testPaystackConnection } from "@/lib/health-core";

export async function testEmailAction() {
  await requireAdmin();
  const r = await testEmailConnection(process.env);
  lastTests().email = { ...r, at: new Date().toISOString() };
  await audit({ type: "health.check", outcome: r.ok ? "success" : "failure", target: "email", summary: `Email connection test: ${r.note}` });
  redirect("/admin/health");
}

export async function testPaystackAction() {
  await requireAdmin();
  const r = await testPaystackConnection(process.env);
  lastTests().paystack = { ...r, at: new Date().toISOString() };
  await audit({ type: "health.check", outcome: r.ok ? "success" : "failure", target: "paystack", summary: `Paystack connection test: ${r.note}` });
  redirect("/admin/health");
}
