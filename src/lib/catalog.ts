/**
 * DATA ACCESS FOR PORTFOLIO PROJECTS.
 * (Products now live in the database — see src/lib/shop/products.ts and Admin → Products.)
 */
import { projects, type Project } from "@/content/projects";
import { settings } from "@/lib/site";

export async function getProjects(): Promise<Project[]> {
  return projects.filter((p) => p.kind === "client" || settings.showDemoProjects);
}
