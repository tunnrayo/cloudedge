"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";
import { audit } from "@/lib/audit-server";
import { getDb } from "@/lib/db";
import { readImageUpload } from "@/lib/image-upload";
import { clearServicesCache } from "@/lib/services";
import { STATUSES, deleteService, moveService, saveService, setServiceStatus, validateService, type ServiceStatus } from "@/lib/services-core";

export type SaveState = { error?: string; errors?: Record<string, string>; values?: Record<string, string>; nonce?: number };
const s = (f: FormData, k: string) => String(f.get(k) ?? "");

export async function saveServiceAction(_prev: SaveState, f: FormData): Promise<SaveState> {
  const admin = await requireAdmin();
  const id = s(f, "id").trim() || null;
  const raw = { slug: s(f, "slug"), title: s(f, "title"), icon: s(f, "icon"), category: s(f, "category"), summary: s(f, "summary"), problem: s(f, "problem"), what: s(f, "what"), items: s(f, "items"), goodFor: s(f, "goodFor"), inquiryType: s(f, "inquiryType"), status: s(f, "status"), sortOrder: s(f, "sortOrder"), priceText: s(f, "priceText"), imageAlt: s(f, "imageAlt") };
  const keep = { ...raw, nonce: Date.now() };
  const { errors, value } = validateService(raw);
  const up = await readImageUpload(f.get("image"));
  if ("error" in up) errors.image = up.error;
  if (Object.keys(errors).length) return { error: "Please correct the highlighted fields. Nothing was saved.", errors, values: raw, nonce: keep.nonce };

  const db = await getDb();
  let imageId: string | null | undefined;
  if ("bytes" in up) {
    imageId = randomUUID();
    await db.query("INSERT INTO product_images (id, content_type, bytes, filename) VALUES ($1,$2,$3,$4)", [imageId, up.type, up.bytes, up.name]);
  } else if (f.get("removeImage") === "on") imageId = null;

  let res;
  try { res = await saveService(db, id, value, admin.actor, imageId); }
  catch (e) {
    console.error("[services] save failed:", (e as Error).name);
    await audit({ type: id ? "service.update" : "service.create", outcome: "failure", target: "service", targetId: id ?? "", summary: "Saving a service failed (database error)" });
    return { error: "The service could not be saved because of a database problem. Nothing was changed. Please try again.", values: raw, nonce: keep.nonce };
  }
  if (!res.ok) return { error: res.error, errors: res.field ? { [res.field]: res.error } : undefined, values: raw, nonce: keep.nonce };
  clearServicesCache(); revalidatePath("/", "layout");
  redirect(`/admin/services/${res.id}?ok=${encodeURIComponent("Saved.")}`);
}

export async function serviceStatusAction(f: FormData) {
  const admin = await requireAdmin();
  const id = s(f, "id"); const status = s(f, "status") as ServiceStatus;
  const r = (STATUSES as readonly string[]).includes(status) ? await setServiceStatus(await getDb(), id, status, admin.actor) : { ok: false, error: "Unknown status." };
  clearServicesCache(); revalidatePath("/", "layout");
  redirect(`/admin/services?${r.ok ? "ok" : "err"}=${encodeURIComponent(r.ok ? `Service set to ${status}.` : r.error ?? "Could not change the status.")}`);
}

export async function deleteServiceAction(f: FormData) {
  const admin = await requireAdmin();
  const id = s(f, "id");
  if (f.get("confirm") !== "yes") redirect(`/admin/services/${id}?err=${encodeURIComponent("Tick the confirmation box to delete.")}`);
  const r = await deleteService(await getDb(), id, admin.actor);
  if (!r.ok) {
    await audit({ type: "service.delete", outcome: "denied", target: "service", targetId: id, summary: r.error ?? "Delete refused" });
    redirect(`/admin/services/${id}?err=${encodeURIComponent(r.error ?? "Could not delete.")}`);
  }
  clearServicesCache(); revalidatePath("/", "layout");
  redirect(`/admin/services?ok=${encodeURIComponent("Service deleted.")}`);
}

export async function moveServiceAction(f: FormData) {
  const admin = await requireAdmin();
  await moveService(await getDb(), s(f, "id"), s(f, "dir") === "up" ? "up" : "down", admin.actor);
  clearServicesCache(); revalidatePath("/", "layout");
  redirect("/admin/services");
}
