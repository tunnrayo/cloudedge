import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { company } from "@/lib/site";

const desc = "Cloud Edge Technology Services Limited is a Nigerian technology and e-commerce company offering software, web and mobile application development, internet-related services and digital solutions.";
export const metadata: Metadata = {
  metadataBase: new URL(company.siteUrl),
  title: { default: `${company.short} | Technology & E-Commerce Solutions, Abuja Nigeria`, template: `%s | ${company.short}` },
  description: desc,
  openGraph: { title: company.name, description: desc, siteName: company.name, type: "website", locale: "en_NG", images: ["/brand/icon-512.png"] },
  twitter: { card: "summary", title: company.name, description: desc },
};
export const viewport: Viewport = { themeColor: "#0a1f4d", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body><Header /><main id="main">{children}</main><Footer /></body></html>);
}
