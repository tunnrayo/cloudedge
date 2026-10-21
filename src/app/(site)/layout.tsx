import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { company } from "@/lib/site";

// Structured data contains only confirmed company facts.
const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: company.name,
  url: company.siteUrl,
  logo: `${company.siteUrl}/brand/icon-512.png`,
  email: company.email.toLowerCase(),
  address: {
    "@type": "PostalAddress",
    streetAddress: company.addressParts.street,
    addressLocality: company.addressParts.locality,
    addressRegion: company.addressParts.region,
    addressCountry: company.addressParts.country,
  },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <Header />
      <main id="main" tabIndex={-1}>{children}</main>
      <Footer />
    </>
  );
}
