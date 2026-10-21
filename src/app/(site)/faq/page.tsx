import type { Metadata } from "next";
import { Cta, FaqList, PageHero } from "@/components/ui";
import { faqs } from "@/lib/site";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about working with Cloud Edge Technology Services Limited.",
  alternates: { canonical: "/faq" },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export default function Faq() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <PageHero eyebrow="FAQ" title="Frequently asked questions" crumbs={[{ label: "FAQ" }]} intro="Answers to common questions about our services and how to get started." />
      <section className="section"><div className="container narrow"><FaqList items={faqs} /></div></section>
      <Cta />
    </>
  );
}
