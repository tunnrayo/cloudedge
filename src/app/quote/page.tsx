import type { Metadata } from "next";
import InquiryForm from "@/components/InquiryForm";
import { services } from "@/lib/site";
export const metadata: Metadata = { title: "Request a Quote", description: "Describe your project and request a quote from Cloud Edge Technology Services Limited." };
const map: Record<string, string> = { "software-development": "Software development", "web-development": "Website design & development", "application-development": "Web or mobile application", ecommerce: "E-commerce solution", "internet-services": "Internet-related services", "digital-products": "Digital product or technology solution" };

export default async function Quote({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  const known = services.some((s) => s.slug === service);
  return (
    <section className="section"><div className="wrap" style={{ maxWidth: 760 }}>
      <p className="eyebrow">Project inquiry</p><h1>Request a quote</h1>
      <p>Tell us what you need. Only name, email and a description are required; budget is optional.</p>
      <InquiryForm mode="quote" defaultType={known ? map[service!] : undefined} />
    </div></section>
  );
}
