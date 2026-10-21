import type { Metadata, Viewport } from "next";
// Fonts are bundled with the site (no Google Fonts request): Poppins for headings, Inter for body text.
import "@fontsource/poppins/latin-500.css";
import "@fontsource/poppins/latin-600.css";
import "@fontsource/poppins/latin-700.css";
import "@fontsource-variable/inter/index.css";
import "./globals.css";
import { company } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(company.siteUrl),
  title: { default: `${company.short} | Technology & E-Commerce Solutions in Abuja, Nigeria`, template: `%s | ${company.short}` },
  description: company.description,
  applicationName: company.name,
  openGraph: {
    title: company.name, description: company.description, siteName: company.name, type: "website", locale: "en_NG",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: `${company.name} logo` }],
  },
  twitter: { card: "summary_large_image", title: company.name, description: company.description, images: ["/brand/og-image.png"] },
};

export const viewport: Viewport = { themeColor: "#061433", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG">
      <body>{children}</body>
    </html>
  );
}
