import type { Metadata } from "next";
import Link from "next/link";
import { Svg } from "@/components/Icon";
import { Cta, Note, PageHero, ProjectCard } from "@/components/ui";
import { getProjects } from "@/lib/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const projects = await getProjects();
  const demosOnly = projects.length > 0 && projects.every((p) => p.kind === "demo");
  return {
    title: "Portfolio",
    description: projects.length === 0
      ? "Cloud Edge Technology Services Limited will publish approved client projects here. Contact us to discuss your project."
      : demosOnly ? "Illustrative demo concepts from Cloud Edge Technology Services Limited. These are not client projects." : "Selected projects from Cloud Edge Technology Services Limited.",
    alternates: { canonical: "/portfolio" },
  };
}

export const dynamic = "force-dynamic";

export default async function Portfolio() {
  const projects = await getProjects();
  const demos = projects.filter((p) => p.kind === "demo");
  const clients = projects.filter((p) => p.kind === "client");
  return (
    <>
      <PageHero eyebrow="Portfolio" title="Our work" crumbs={[{ label: "Portfolio" }]}
        intro={projects.length ? "Examples of the kinds of solutions we design and build." : "We are building our portfolio. Approved client projects will be published here."} />
      <section className="section">
        <div className="container">
          {clients.length > 0 && (
            <>
              <h2>Client projects</h2>
              <div className="grid grid-3" style={{ margin: "24px 0 56px" }}>{clients.map((p, i) => <ProjectCard key={p.slug} p={p} index={i} />)}</div>
            </>
          )}
          {demos.length > 0 && (
            <>
              {clients.length > 0 && <h2>Demo concepts</h2>}
              <Note><p><strong>Demo concepts, not client work.</strong> The projects below are illustrative concepts prepared to show the type of solutions Cloud Edge can deliver. They do not represent completed client projects. Approved client case studies will be published here.</p></Note>
              <div className="grid grid-3">{demos.map((p, i) => <ProjectCard key={p.slug} p={p} index={i} />)}</div>
            </>
          )}
          {projects.length === 0 && (
            <div className="empty">
              <p><strong>Case studies coming soon.</strong></p>
              <p>We only publish completed projects with the client&apos;s approval, so nothing is shown here yet. In the meantime, see what we can build for you.</p>
              <div className="actions" style={{ justifyContent: "center" }}>
                <Link className="btn btn-primary" href="/quote">Discuss your project <Svg name="arrow" /></Link>
                <Link className="btn btn-outline" href="/services">Explore our services</Link>
              </div>
            </div>
          )}
        </div>
      </section>
      <Cta />
    </>
  );
}
