/**
 * DATA ACCESS FOR PORTFOLIO PROJECTS.
 * (Products now live in the database — see src/lib/shop/products.ts and Admin → Products.)
 */
import { projects, type Project } from "../content/projects.ts";
import { settings } from "./site.ts";

/** Client projects are always shown; demo concepts only when switched on. */
export function visibleProjects(list: Project[], showDemos: boolean): Project[] {
  return list.filter((p) => p.kind === "client" || showDemos);
}

export async function getProjects(): Promise<Project[]> {
  return visibleProjects(projects, settings.showDemoProjects);
}
