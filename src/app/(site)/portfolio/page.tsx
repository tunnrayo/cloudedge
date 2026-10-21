import type { Metadata } from "next";
import Link from "next/link";
import { Svg } from "@/components/Icon";
import { Cta, Note, PageHero, ProjectCard } from "@/components/ui";
import { getProjects } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Project showcase for Cloud Edge Technology Services Limited, including clearly labelled demo concepts.",
  alternates: { canonical: "/portfolio" },
};

export default async function Portfolio() {
  const projects = await getProjects();
  const demos = projects.filter((p) => p.kind === "demo");
  const clients = projects.filter((p) => p.kind === "client");
  return (
    <>
      <PageHero eyebrow="Portfolio" title="Our work" crumbs={[{ label: "Portfolio" }]}
        intro="Examples of the kinds of solutions we design and build." />
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
              <p>Completed projects will be published here once approved by our clients.</p>
              <Link className="btn btn-primary" href="/quote">Discuss your project <Svg name="arrow" /></Link>
            </div>
          )}
        </div>
      </section>
      <Cta />
    </>
  );
}
