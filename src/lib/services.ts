import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { getServiceBySlugDb, listServices, type ServiceRecord } from "@/lib/services-core";
import { defaultServices, type Service } from "@/lib/site";

/**
 * Services for the PUBLIC website. If the database cannot be read, the built-in descriptions are shown so the
 * marketing pages stay up (the problem is logged and visible on the admin Health page).
 */
const TTL_MS = 30_000;
const cached = globalThis as unknown as { __ceServices?: { at: number; data: Service[] } };
/** Called after an admin change so this instance shows it immediately (other instances catch up within 30 seconds). */
export function clearServicesCache() { cached.__ceServices = undefined; }

export const getPublishedServices = cache(async (): Promise<Service[]> => {
  await connection(); // never freeze these pages at build time
  const hit = cached.__ceServices;
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  try {
    const data = await listServices(await getDb(), { publishedOnly: true });
    cached.__ceServices = { at: Date.now(), data };
    return data;
  } catch (e) {
    console.error("[services] using built-in list because the database could not be read:", (e as Error).name);
    return defaultServices;
  }
});

/** One service for the public page. Draft services return null (404). Inactive ones are returned so the page can say so. */
export async function getPublicService(slug: string): Promise<ServiceRecord | Service | null> {
  await connection();
  try {
    const s = await getServiceBySlugDb(await getDb(), slug);
    return s && s.status !== "draft" ? s : null;
  } catch (e) {
    console.error("[services] using built-in service because the database could not be read:", (e as Error).name);
    return defaultServices.find((x) => x.slug === slug) ?? null;
  }
}
