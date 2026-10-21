/**
 * PRODUCT CATALOGUE DATA
 *
 * Every item below is SAMPLE DATA for demonstration only (sample: true).
 * Names, descriptions and prices are illustrative and are NOT real offers, stock or supplier relationships.
 * The website shows a "Sample" badge and notice on every sample item.
 *
 * To add a real product: copy one object, set sample: false, write real details and price,
 * optionally add a photo to public/products/ and set image: "/products/your-file.jpg".
 * When all real products are in place, set settings.showSampleProducts = false in src/lib/site.ts.
 */

export type Price =
  | { kind: "fixed"; amount: number; currency: "NGN" | "USD"; unit?: string; from?: boolean }
  | { kind: "on-request" };

export type Product = {
  slug: string;
  name: string;
  category: ProductCategory;
  icon: string;
  summary: string;
  description: string;
  features: string[];
  price: Price;
  /** Call to action. Defaults to "Enquire about this" which opens the quote form with this product pre-selected. */
  cta?: { label: string; href: string };
  /** Optional real product image in /public. Without it, a branded illustration is shown. */
  image?: string;
  imageAlt?: string;
  featured?: boolean;
  sample: boolean;
};

export const productCategories = ["Websites", "E-commerce", "Business Software", "Apps", "Internet Services", "Digital Resources"] as const;
export type ProductCategory = (typeof productCategories)[number];

export const products: Product[] = [
  {
    slug: "business-starter-website", name: "Business Starter Website", category: "Websites", icon: "globe", featured: true, sample: true,
    summary: "A professional multi-page website for a small business, with contact form and mobile layout.",
    description: "An example of a packaged website offer: a clear, responsive company website with the essential pages a new business needs to look credible online.",
    features: ["Up to 5 pages", "Mobile-friendly layout", "Working contact form", "Basic search engine setup"],
    price: { kind: "fixed", amount: 350000, currency: "NGN", from: true },
  },
  {
    slug: "online-store-setup", name: "Online Store Setup", category: "E-commerce", icon: "cart", featured: true, sample: true,
    summary: "Catalogue, cart and ordering flow for businesses ready to sell online.",
    description: "An example of an e-commerce package: a structured product catalogue with ordering or enquiry flow and guidance on managing the store.",
    features: ["Product catalogue structure", "Cart and order flow", "Payment option guidance", "Store management walkthrough"],
    price: { kind: "fixed", amount: 750000, currency: "NGN", from: true },
  },
  {
    slug: "inventory-sales-tracker", name: "Inventory & Sales Tracker", category: "Business Software", icon: "chart", featured: true, sample: true,
    summary: "Track stock, sales and daily totals in one simple dashboard.",
    description: "An example of a business software product: a web-based tool replacing stock notebooks and spreadsheets with a shared, searchable record.",
    features: ["Stock in / stock out records", "Daily and monthly sales totals", "Low-stock alerts", "Staff accounts"],
    price: { kind: "fixed", amount: 1200000, currency: "NGN", from: true },
  },
  {
    slug: "appointment-booking-app", name: "Appointment Booking App", category: "Apps", icon: "phone", sample: true,
    summary: "Let customers book appointments online and receive confirmations.",
    description: "An example of an application product for service businesses such as clinics, salons and consultancies.",
    features: ["Online booking calendar", "Customer confirmations", "Staff schedule view", "Admin dashboard"],
    price: { kind: "fixed", amount: 900000, currency: "NGN", from: true },
  },
  {
    slug: "domain-hosting-email", name: "Domain, Hosting & Business Email Setup", category: "Internet Services", icon: "cloud", sample: true,
    summary: "Get a domain, hosting and professional email addresses configured correctly.",
    description: "An example of an internet services package covering the setup most organisations need before launching a website.",
    features: ["Domain registration guidance", "DNS configuration", "Business email setup", "Handover notes"],
    price: { kind: "fixed", amount: 85000, currency: "NGN" },
  },
  {
    slug: "website-care-plan", name: "Website Care Plan", category: "Internet Services", icon: "shield", sample: true,
    summary: "Monthly updates, backups and small content changes for your website.",
    description: "An example of a recurring support plan that keeps a website current and backed up.",
    features: ["Monthly updates", "Regular backups", "Small content edits", "Uptime checks"],
    price: { kind: "fixed", amount: 40000, currency: "NGN", unit: "month" },
  },
  {
    slug: "customer-portal", name: "Customer Portal", category: "Business Software", icon: "users", sample: true,
    summary: "A secure area where customers can view requests, documents and updates.",
    description: "An example of a custom portal product, scoped to each organisation's customers and processes.",
    features: ["Customer accounts", "Request tracking", "Document sharing", "Notifications"],
    price: { kind: "on-request" },
  },
  {
    slug: "business-templates-pack", name: "Business Templates Pack", category: "Digital Resources", icon: "doc", sample: true,
    summary: "Ready-to-use digital templates for invoices, proposals and reports.",
    description: "An example of a downloadable digital product.",
    features: ["Invoice and receipt templates", "Proposal template", "Report template", "Editable formats"],
    price: { kind: "fixed", amount: 25000, currency: "NGN" },
  },
];

export function formatPrice(p: Price): string {
  if (p.kind === "on-request") return "Price on request";
  const amount = new Intl.NumberFormat("en-NG", { style: "currency", currency: p.currency, maximumFractionDigits: 0 }).format(p.amount);
  return `${p.from ? "From " : ""}${amount}${p.unit ? ` / ${p.unit}` : ""}`;
}
