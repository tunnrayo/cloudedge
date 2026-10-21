import type { Metadata } from "next";
import Icon from "@/components/Icon";
import InquiryForm from "@/components/InquiryForm";
import { PageHero } from "@/components/ui";
import { company, processSteps, services } from "@/lib/site";
import { getProduct } from "@/lib/shop/products";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Request a Quote",
  description: "Describe your project and request a quote from Cloud Edge Technology Services Limited.",
  alternates: { canonical: "/quote" },
};

export default async function Quote({ searchParams }: { searchParams: Promise<{ service?: string; product?: string }> }) {
  const { service, product: productSlug } = await searchParams;
  const svc = services.find((s) => s.slug === service);
  const product = productSlug ? await getProduct(productSlug).catch(() => null) : null;
  const defaultType = product ? "Product enquiry" : svc?.inquiryType;
  return (
    <>
      <PageHero eyebrow="Project inquiry" title="Request a quote" crumbs={[{ label: "Request a Quote" }]}
        intro="Tell us what you need. Only your name, email and a short project description are required." />
      <section className="section">
        <div className="container split form-split">
          <div className="form-card">
            <InquiryForm mode="quote" defaultType={defaultType} product={product ? { slug: product.slug, name: product.name } : undefined} />
          </div>
          <aside aria-labelledby="next-title">
            <h2 id="next-title" style={{ fontSize: "1.3rem" }}>What happens next</h2>
            <ol className="value-list" style={{ marginTop: 20 }}>
              {processSteps.map((s, i) => (
                <li key={s.title}><span className="ico sm" aria-hidden="true" style={{ fontFamily: "var(--font-head)", fontWeight: 700 }}>{i + 1}</span><div><h3>{s.title}</h3><p>{s.text}</p></div></li>
              ))}
            </ol>
            <div className="card" style={{ marginTop: 28, background: "var(--soft)" }}>
              <Icon name="mail" size="sm" />
              <h3>Prefer email?</h3>
              <p>Write to <a href={`mailto:${company.email}`} style={{ wordBreak: "break-all" }}>{company.email}</a>.</p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
