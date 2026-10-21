/**
 * COMBINED PRODUCT CATALOGUE — SEED DATA
 *
 * Source documents (supplied 21 Oct 2026):
 *   A = "CloudEdge_Verified_Priced_Catalogue.docx" (30 products)
 *   B = "CloudEdge_30_Additional_Verified_Priced_Products.docx" (30 products)
 *
 * Pricing rule from both documents:
 *   USD reference:   selling price = round(reference × ₦1,333) + ₦10,000
 *   NGN reference:   selling price = reference + ₦10,000
 * ₦1,333/US$1 was checked on 21 Oct 2026 against the official NFEM rate (₦1,332.47 on 13 Oct 2026).
 *
 * This file is used ONCE to fill the database (see src/lib/shop/seed.ts). After that, products are
 * managed in the admin area (/admin/products). Editing this file does not change existing products.
 *
 * Nothing here establishes reseller authorisation: every product is seeded with
 * resaleStatus "unconfirmed" and saleMode "enquiry" (no direct checkout) until the
 * administrator confirms the vendor allows it.
 */

export const FX_RATE_NGN_PER_USD = 1333;
export const MARKUP_NGN = 10000;
export const CATALOGUE_DATE = "2026-10-21";

export const CATEGORIES = [
  "Productivity & Office",
  "Business & Collaboration",
  "Meetings & Communication",
  "Creative & Design",
  "PDF & Document Tools",
  "Cybersecurity",
  "Privacy & VPN",
  "Developer Tools",
  "Cloud & Hosting",
  "Website Tools",
  "Backup & Recovery",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type BillingPeriod = "month" | "year" | "one_time" | "term";
export type PriceUnit = "subscription" | "user" | "seat" | "licence" | "device_pack" | "site" | "computer" | "editor" | "domain" | "workspace";
export type RefType = "standard" | "renewal" | "promotional" | "introductory" | "starting_from" | "annual_billing_monthly_equivalent";
export type Verification = "verified" | "catalogue" | "needs_verification";

export type Logo = { set: "logos" | "si" | "vscode" | "none"; icon?: string };
export type SeedProduct = {
  sku: string;
  slug: string;
  name: string;
  brand: string;
  category: Category;
  description: string;
  coverage: string;
  platforms?: string;
  billing: BillingPeriod;
  billingNote?: string;
  unit: PriceUnit;
  ref: { amount: number; currency: "USD" | "NGN"; label: string; type: RefType; sourceName: string; sourceUrl: string };
  /** Selling price exactly as printed in the supplied document (kept for audit). */
  listedPrice: number;
  verification: Verification;
  verificationNote?: string;
  quantity?: { max: number; label: string };
  option?: { label: string; required: boolean };
  logo: Logo;
  apps?: Logo[];
  chips: string[];
  doc: "A" | "B";
};

const MS = "https://www.microsoft.com/en-ng/microsoft-365/p/microsoft-365-family/cfq7ttc0k5dm";
const IDX = "https://25idx.ng/";
const GW = "https://workspace.google.com/pricing?hl=en_ng";
const ADOBE = "https://www.adobe.com/creativecloud/plans.html";
const BD_AV = "https://www.bitdefender.com/en-us/consumer/antivirus";
const BD_IND = "https://www.bitdefender.com/en-us/consumer/individual";
const NORTON = "https://us.norton.com/pricing?inid=support-footer_pricing";
const V = "";
const ANNUAL_EQ = "Monthly equivalent of a plan the vendor bills annually. Decide whether to charge 12 months upfront before enabling purchase.";

const app = (set: Logo["set"], icon: string): Logo => ({ set, icon });
const MS_APPS = { word: app("vscode", "file-type-word"), excel: app("vscode", "file-type-excel"), ppt: app("vscode", "file-type-powerpoint"), outlook: app("vscode", "file-type-outlook"), onenote: app("vscode", "file-type-onenote"), onedrive: app("logos", "microsoft-onedrive"), teams: app("logos", "microsoft-teams") };
const G_APPS = [app("logos", "google-gmail"), app("logos", "google-drive"), app("logos", "google-meet")];
const A_APPS = { ps: app("logos", "adobe-photoshop"), ai: app("logos", "adobe-illustrator"), pr: app("logos", "adobe-premiere"), ae: app("logos", "adobe-after-effects"), id: app("logos", "adobe-indesign"), lr: app("logos", "adobe-lightroom") };

export const catalogue: SeedProduct[] = [
  // ───────────── Document A: Productivity & Office ─────────────
  { doc: "A", sku: "CE-001", slug: "microsoft-365-personal", name: "Microsoft 365 Personal", brand: "Microsoft", category: "Productivity & Office",
    description: "One-person subscription for Word, Excel, PowerPoint, Outlook and other Microsoft 365 benefits, with cloud storage and use across supported devices.",
    coverage: "1 user; annual subscription", billing: "year", unit: "subscription",
    ref: { amount: 88999, currency: "NGN", label: "₦88,999/year", type: "standard", sourceName: "Microsoft Nigeria Store", sourceUrl: MS },
    listedPrice: 98999, verification: "needs_verification",
    verificationNote: "The catalogue's source link and price are the same as Microsoft 365 Family. Confirm the Personal plan's own Nigeria price before selling.",
    quantity: { max: 5, label: "Subscriptions" }, logo: { set: "logos", icon: "microsoft" },
    apps: [MS_APPS.word, MS_APPS.excel, MS_APPS.ppt, MS_APPS.outlook, MS_APPS.onedrive], chips: ["1 person", "Annual"] },
  { doc: "A", sku: "CE-002", slug: "microsoft-365-family", name: "Microsoft 365 Family", brand: "Microsoft", category: "Productivity & Office",
    description: "Subscription for 1–6 people, with up to 1 TB of OneDrive storage per person and Microsoft 365 apps across supported devices.",
    coverage: "1–6 people; annual subscription", billing: "year", unit: "subscription",
    ref: { amount: 88999, currency: "NGN", label: "₦88,999/year", type: "standard", sourceName: "Microsoft Nigeria Store", sourceUrl: MS },
    listedPrice: 98999, verification: "catalogue", quantity: { max: 5, label: "Subscriptions" }, logo: { set: "logos", icon: "microsoft" },
    apps: [MS_APPS.word, MS_APPS.excel, MS_APPS.ppt, MS_APPS.outlook, MS_APPS.onedrive], chips: ["Up to 6 people", "1 TB each", "Annual"] },
  { doc: "A", sku: "CE-003", slug: "office-home-2024", name: "Office Home 2024", brand: "Microsoft", category: "Productivity & Office",
    description: "One-time purchase for one PC or Mac. Includes classic Word, Excel, PowerPoint and OneNote for non-commercial use.",
    coverage: "1 PC or Mac; one-time purchase; non-commercial use", platforms: "Windows PC or Mac", billing: "one_time", unit: "licence",
    ref: { amount: 120999, currency: "NGN", label: "₦120,999", type: "standard", sourceName: "Microsoft Nigeria Store", sourceUrl: "https://www.microsoft.com/en-NG/microsoft-365/p/office-home-2024/CFQ7TTC0PQVJ" },
    listedPrice: 130999, verification: "catalogue", quantity: { max: 5, label: "Licences" }, logo: { set: "logos", icon: "microsoft" },
    apps: [MS_APPS.word, MS_APPS.excel, MS_APPS.ppt, MS_APPS.onenote], chips: ["One-time purchase", "1 PC or Mac"] },
  { doc: "A", sku: "CE-004", slug: "office-home-business-2024", name: "Office Home & Business 2024", brand: "Microsoft", category: "Productivity & Office",
    description: "One-time purchase for one PC or Mac. Includes classic Word, Excel, PowerPoint, Outlook and OneNote.",
    coverage: "1 PC or Mac; one-time purchase", platforms: "Windows PC or Mac", billing: "one_time", unit: "licence",
    ref: { amount: 269999, currency: "NGN", label: "₦269,999", type: "standard", sourceName: "Microsoft Nigeria Store", sourceUrl: "https://www.microsoft.com/en-ng/microsoft-365/p/office-home-business-2024/cfq7ttc0pbm7" },
    listedPrice: 279999, verification: "catalogue", quantity: { max: 5, label: "Licences" }, logo: { set: "logos", icon: "microsoft" },
    apps: [MS_APPS.word, MS_APPS.excel, MS_APPS.ppt, MS_APPS.outlook, MS_APPS.onenote], chips: ["One-time purchase", "Business use", "1 PC or Mac"] },

  // ───────────── Document A: Business & Collaboration ─────────────
  { doc: "A", sku: "CE-005", slug: "microsoft-365-business-basic", name: "Microsoft 365 Business Basic", brand: "Microsoft", category: "Business & Collaboration",
    description: "Business email on a custom domain, web and mobile Office apps, Teams and 1 TB OneDrive storage per user.",
    coverage: "Per user; annual upfront", billing: "year", unit: "user",
    ref: { amount: 145200, currency: "NGN", label: "₦145,200/user/year", type: "standard", sourceName: "25IDX Nigeria", sourceUrl: IDX },
    listedPrice: 155200, verification: "catalogue", quantity: { max: 300, label: "Users" }, logo: { set: "logos", icon: "microsoft" },
    apps: [MS_APPS.outlook, MS_APPS.teams, MS_APPS.onedrive], chips: ["Business Basic", "Per user", "Annual"] },
  { doc: "A", sku: "CE-006", slug: "microsoft-365-business-standard", name: "Microsoft 365 Business Standard", brand: "Microsoft", category: "Business & Collaboration",
    description: "Business email and collaboration plus desktop Word, Excel, PowerPoint and Outlook, with installation on supported devices.",
    coverage: "Per user; annual upfront", billing: "year", unit: "user",
    ref: { amount: 290300, currency: "NGN", label: "₦290,300/user/year", type: "standard", sourceName: "25IDX Nigeria", sourceUrl: IDX },
    listedPrice: 300300, verification: "catalogue", quantity: { max: 300, label: "Users" }, logo: { set: "logos", icon: "microsoft" },
    apps: [MS_APPS.word, MS_APPS.excel, MS_APPS.ppt, MS_APPS.outlook, MS_APPS.teams], chips: ["Business Standard", "Desktop apps", "Per user · Annual"] },
  { doc: "A", sku: "CE-007", slug: "google-workspace-business-starter-annual", name: "Google Workspace Business Starter (Annual)", brand: "Google", category: "Business & Collaboration",
    description: "Custom business email, 30 GB pooled storage per user, Google Meet meetings for up to 100 participants and Google Workspace collaboration apps.",
    coverage: "Per user; annual upfront", billing: "year", unit: "user",
    ref: { amount: 145152, currency: "NGN", label: "₦145,152/user/year", type: "standard", sourceName: "25IDX Nigeria", sourceUrl: IDX },
    listedPrice: 155152, verification: "catalogue", quantity: { max: 300, label: "Users" }, logo: { set: "logos", icon: "google-workspace" },
    apps: G_APPS, chips: ["Business Starter", "30 GB", "Annual"] },
  { doc: "A", sku: "CE-008", slug: "google-workspace-business-standard-annual", name: "Google Workspace Business Standard (Annual)", brand: "Google", category: "Business & Collaboration",
    description: "Business email and collaboration with 2 TB pooled storage per user, meeting recording for up to 150 participants and additional productivity features.",
    coverage: "Per user; annual upfront", billing: "year", unit: "user",
    ref: { amount: 326592, currency: "NGN", label: "₦326,592/user/year", type: "standard", sourceName: "25IDX Nigeria", sourceUrl: IDX },
    listedPrice: 336592, verification: "catalogue", quantity: { max: 300, label: "Users" }, logo: { set: "logos", icon: "google-workspace" },
    apps: G_APPS, chips: ["Business Standard", "2 TB", "Annual"] },
  { doc: "A", sku: "CE-009", slug: "google-workspace-business-plus-annual", name: "Google Workspace Business Plus (Annual)", brand: "Google", category: "Business & Collaboration",
    description: "Business email and collaboration with 5 TB pooled storage per user, meetings for up to 500 participants and enhanced security and administration features.",
    coverage: "Per user; annual upfront", billing: "year", unit: "user",
    ref: { amount: 453600, currency: "NGN", label: "₦453,600/user/year", type: "standard", sourceName: "25IDX Nigeria", sourceUrl: IDX },
    listedPrice: 463600, verification: "catalogue", quantity: { max: 300, label: "Users" }, logo: { set: "logos", icon: "google-workspace" },
    apps: G_APPS, chips: ["Business Plus", "5 TB", "Annual"] },
  { doc: "A", sku: "CE-010", slug: "google-workspace-business-starter-monthly", name: "Google Workspace Business Starter (Monthly)", brand: "Google", category: "Business & Collaboration",
    description: "Custom business email, 30 GB pooled storage per user, Meet video meetings for up to 100 participants and collaboration apps.",
    coverage: "Per user per month; USD reference price", billing: "month", unit: "user",
    ref: { amount: 7, currency: "USD", label: "US$7/user/month", type: "standard", sourceName: "Google official pricing", sourceUrl: GW },
    listedPrice: 19331, verification: "verified", verificationNote: `${V} Google also shows a temporary introductory price from 30 Oct 2026.`,
    quantity: { max: 300, label: "Users" }, logo: { set: "logos", icon: "google-workspace" }, apps: G_APPS, chips: ["Business Starter", "30 GB", "Monthly"] },
  { doc: "A", sku: "CE-011", slug: "google-workspace-business-standard-monthly", name: "Google Workspace Business Standard (Monthly)", brand: "Google", category: "Business & Collaboration",
    description: "Business email, 2 TB pooled storage per user, meeting recording for meetings up to 150 participants and expanded collaboration features.",
    coverage: "Per user per month; USD reference price", billing: "month", unit: "user",
    ref: { amount: 14, currency: "USD", label: "US$14/user/month", type: "standard", sourceName: "Google official pricing", sourceUrl: GW },
    listedPrice: 28662, verification: "verified", verificationNote: V, quantity: { max: 300, label: "Users" }, logo: { set: "logos", icon: "google-workspace" },
    apps: G_APPS, chips: ["Business Standard", "2 TB", "Monthly"] },
  { doc: "A", sku: "CE-012", slug: "google-workspace-business-plus-monthly", name: "Google Workspace Business Plus (Monthly)", brand: "Google", category: "Business & Collaboration",
    description: "Business email, 5 TB pooled storage per user, meetings for up to 500 participants and additional administration and security features.",
    coverage: "Per user per month; USD reference price", billing: "month", unit: "user",
    ref: { amount: 22, currency: "USD", label: "US$22/user/month", type: "standard", sourceName: "Google official pricing", sourceUrl: GW },
    listedPrice: 39326, verification: "verified", verificationNote: V, quantity: { max: 300, label: "Users" }, logo: { set: "logos", icon: "google-workspace" },
    apps: G_APPS, chips: ["Business Plus", "5 TB", "Monthly"] },
  { doc: "A", sku: "CE-013", slug: "microsoft-365-business-premium", name: "Microsoft 365 Business Premium", brand: "Microsoft", category: "Business & Collaboration",
    description: "Business productivity apps with device management and advanced security features including Microsoft Intune and Defender for Office 365.",
    coverage: "Per user; annual upfront", billing: "year", unit: "user",
    ref: { amount: 522500, currency: "NGN", label: "₦522,500/user/year", type: "standard", sourceName: "25IDX Nigeria", sourceUrl: IDX },
    listedPrice: 532500, verification: "catalogue", quantity: { max: 300, label: "Users" }, logo: { set: "logos", icon: "microsoft" },
    apps: [MS_APPS.word, MS_APPS.excel, MS_APPS.outlook, MS_APPS.teams], chips: ["Business Premium", "Intune + Defender", "Per user · Annual"] },

  // ───────────── Document A: Creative & Design / PDF ─────────────
  { doc: "A", sku: "CE-014", slug: "adobe-creative-cloud-all-apps", name: "Adobe Creative Cloud All Apps", brand: "Adobe", category: "Creative & Design",
    description: "Subscription bundle providing access to Adobe creative applications for design, photography, video, illustration and publishing.",
    coverage: "Annual price", billing: "year", unit: "subscription",
    ref: { amount: 612000, currency: "NGN", label: "₦612,000/year", type: "standard", sourceName: "25IDX Nigeria", sourceUrl: IDX },
    listedPrice: 622000, verification: "catalogue", quantity: { max: 10, label: "Subscriptions" }, logo: { set: "logos", icon: "adobe" },
    apps: [A_APPS.ps, A_APPS.ai, A_APPS.pr, A_APPS.ae, A_APPS.id], chips: ["All Apps", "Annual"] },
  { doc: "A", sku: "CE-015", slug: "adobe-creative-cloud-single-app", name: "Adobe Creative Cloud Single App", brand: "Adobe", category: "Creative & Design",
    description: "Subscription for one selected Adobe Creative Cloud application, such as Photoshop or Illustrator.",
    coverage: "One selected app; annual price", billing: "year", unit: "subscription",
    ref: { amount: 229500, currency: "NGN", label: "₦229,500/year", type: "standard", sourceName: "25IDX Nigeria", sourceUrl: IDX },
    listedPrice: 239500, verification: "catalogue", quantity: { max: 10, label: "Subscriptions" }, option: { label: "Which Adobe app do you need?", required: true },
    logo: { set: "logos", icon: "adobe" }, apps: [A_APPS.ps, A_APPS.ai, A_APPS.lr], chips: ["Single App", "Your choice of app", "Annual"] },
  { doc: "A", sku: "CE-016", slug: "adobe-creative-cloud-pro-teams", name: "Adobe Creative Cloud Pro for Teams", brand: "Adobe", category: "Creative & Design",
    description: "Access to 20+ Adobe creative applications, including Photoshop, Illustrator, Premiere Pro and Acrobat Pro, plus Firefly AI features.",
    coverage: "Per licence per month; annual commitment; US price", billing: "month", billingNote: "Annual commitment required by Adobe", unit: "licence",
    ref: { amount: 99.99, currency: "USD", label: "US$99.99/licence/month (annual commitment)", type: "standard", sourceName: "Adobe official pricing", sourceUrl: ADOBE },
    listedPrice: 143287, verification: "needs_verification", verificationNote: "Annual commitment plan priced per month. Decide whether to charge 12 months upfront before enabling purchase.",
    quantity: { max: 50, label: "Licences" }, logo: { set: "logos", icon: "adobe" }, apps: [A_APPS.ps, A_APPS.ai, A_APPS.pr, app("vscode", "file-type-pdf2")], chips: ["Pro for Teams", "Per licence", "Monthly · annual term"] },
  { doc: "A", sku: "CE-017", slug: "adobe-creative-cloud-pro-plus-teams", name: "Adobe Creative Cloud Pro Plus for Teams", brand: "Adobe", category: "Creative & Design",
    description: "Access to 20+ Adobe apps, Firefly creative AI features and access to Adobe Stock assets under the listed plan terms.",
    coverage: "Per licence per month; annual commitment; US price", billing: "month", billingNote: "Annual commitment required by Adobe", unit: "licence",
    ref: { amount: 110.49, currency: "USD", label: "US$110.49/licence/month (annual commitment)", type: "standard", sourceName: "Adobe official pricing", sourceUrl: ADOBE },
    listedPrice: 157083, verification: "needs_verification", verificationNote: "Annual commitment plan priced per month. Catalogue listed ₦157,083, but the formula gives ₦157,283 (used here).",
    quantity: { max: 50, label: "Licences" }, logo: { set: "logos", icon: "adobe" }, apps: [A_APPS.ps, A_APPS.ai, A_APPS.pr, A_APPS.ae], chips: ["Pro Plus for Teams", "Adobe Stock", "Monthly · annual term"] },
  { doc: "A", sku: "CE-018", slug: "adobe-acrobat-pro", name: "Adobe Acrobat Pro", brand: "Adobe", category: "PDF & Document Tools",
    description: "Create, edit, convert, sign and manage PDF documents using desktop, web and mobile tools.",
    coverage: "Annual price", billing: "year", unit: "subscription",
    ref: { amount: 210100, currency: "NGN", label: "₦210,100/year", type: "standard", sourceName: "25IDX Nigeria", sourceUrl: IDX },
    listedPrice: 220100, verification: "catalogue", quantity: { max: 10, label: "Subscriptions" }, logo: { set: "logos", icon: "adobe" },
    apps: [app("vscode", "file-type-pdf2")], chips: ["Acrobat Pro", "Edit · Convert · Sign", "Annual"] },
  { doc: "A", sku: "CE-019", slug: "adobe-acrobat-pro-teams", name: "Adobe Acrobat Pro for Teams", brand: "Adobe", category: "PDF & Document Tools",
    description: "PDF creation, editing, signing and document management with team-oriented licensing and administration features.",
    coverage: "Per licence per month; annual commitment; US price", billing: "month", billingNote: "Annual commitment required by Adobe", unit: "licence",
    ref: { amount: 23.99, currency: "USD", label: "US$23.99/licence/month (annual commitment)", type: "standard", sourceName: "Adobe official pricing", sourceUrl: ADOBE },
    listedPrice: 41978, verification: "needs_verification", verificationNote: "Annual commitment plan priced per month. Decide whether to charge 12 months upfront before enabling purchase.",
    quantity: { max: 50, label: "Licences" }, logo: { set: "logos", icon: "adobe" }, apps: [app("vscode", "file-type-pdf2"), MS_APPS.teams], chips: ["Acrobat Pro for Teams", "Per licence", "Monthly · annual term"] },

  // ───────────── Document A: Cybersecurity ─────────────
  { doc: "A", sku: "CE-020", slug: "avast-ultimate-5-devices", name: "Avast Ultimate, 5 Devices", brand: "Avast", category: "Cybersecurity",
    description: "Security suite for up to five devices, combining antivirus protection with additional privacy and device-security tools included in the Ultimate plan.",
    coverage: "5 devices; annual subscription", billing: "year", unit: "device_pack",
    ref: { amount: 85250, currency: "NGN", label: "₦85,250/year", type: "standard", sourceName: "25IDX Nigeria", sourceUrl: IDX },
    listedPrice: 95250, verification: "catalogue", quantity: { max: 10, label: "Subscriptions" }, logo: { set: "si", icon: "avast" }, chips: ["Ultimate", "5 devices", "Annual"] },
  { doc: "A", sku: "CE-021", slug: "avast-ultimate-10-devices", name: "Avast Ultimate, 10 Devices", brand: "Avast", category: "Cybersecurity",
    description: "Security suite for up to ten devices, combining antivirus protection with additional privacy and device-security tools included in the Ultimate plan.",
    coverage: "10 devices; annual subscription", billing: "year", unit: "device_pack",
    ref: { amount: 130680, currency: "NGN", label: "₦130,680/year", type: "standard", sourceName: "25IDX Nigeria", sourceUrl: IDX },
    listedPrice: 140680, verification: "catalogue", quantity: { max: 10, label: "Subscriptions" }, logo: { set: "si", icon: "avast" }, chips: ["Ultimate", "10 devices", "Annual"] },
  { doc: "A", sku: "CE-022", slug: "bitdefender-antivirus-plus", name: "Bitdefender Antivirus Plus", brand: "Bitdefender", category: "Cybersecurity",
    description: "Security software designed to protect supported devices against malware, spyware, adware and ransomware-related threats.",
    coverage: "Up to 3 devices; US reference price", billing: "year", unit: "device_pack",
    ref: { amount: 29.99, currency: "USD", label: "US$29.99/year", type: "standard", sourceName: "Bitdefender official store", sourceUrl: BD_AV },
    listedPrice: 49976, verification: "catalogue", quantity: { max: 10, label: "Subscriptions" }, logo: { set: "si", icon: "bitdefender" }, chips: ["Antivirus Plus", "Up to 3 devices", "Annual"] },
  { doc: "A", sku: "CE-023", slug: "bitdefender-total-security", name: "Bitdefender Total Security", brand: "Bitdefender", category: "Cybersecurity",
    description: "Multi-device security suite with malware protection, ransomware protection, password management and device optimisation features.",
    coverage: "Up to 5 devices; US reference price", platforms: "Windows, macOS, Android, iOS", billing: "year", unit: "device_pack",
    ref: { amount: 59.99, currency: "USD", label: "US$59.99/year (first year)", type: "promotional", sourceName: "Bitdefender official store", sourceUrl: BD_IND },
    listedPrice: 89966, verification: "verified", verificationNote: `${V} This is a first-year price; renewal may be higher.`, quantity: { max: 10, label: "Subscriptions" },
    logo: { set: "si", icon: "bitdefender" }, chips: ["Total Security", "Up to 5 devices", "Annual"] },
  { doc: "A", sku: "CE-024", slug: "bitdefender-premium-security", name: "Bitdefender Premium Security", brand: "Bitdefender", category: "Cybersecurity",
    description: "Security suite for multiple devices with advanced protection features and additional privacy tools.",
    coverage: "Annual; first-year US reference price", billing: "year", unit: "device_pack",
    ref: { amount: 79.99, currency: "USD", label: "US$79.99/year (first year)", type: "promotional", sourceName: "Bitdefender official store", sourceUrl: BD_IND },
    listedPrice: 116613, verification: "needs_verification", verificationNote: "Reference price matches the official page (21 Oct 2026; 1 member & 5 devices). Catalogue listed ₦116,613, but the formula gives ₦116,627 (used here). First-year price; renewal may be higher.",
    quantity: { max: 10, label: "Subscriptions" }, logo: { set: "si", icon: "bitdefender" }, chips: ["Premium Security", "1 member · 5 devices", "Annual"] },
  { doc: "A", sku: "CE-025", slug: "bitdefender-ultimate-security", name: "Bitdefender Ultimate Security", brand: "Bitdefender", category: "Cybersecurity",
    description: "Security suite with malware protection, identity monitoring and additional privacy and security features.",
    coverage: "Annual; first-year US reference price", billing: "year", unit: "device_pack",
    ref: { amount: 89.99, currency: "USD", label: "US$89.99/year (first year)", type: "promotional", sourceName: "Bitdefender official store", sourceUrl: BD_IND },
    listedPrice: 129956, verification: "verified", verificationNote: `${V} First-year price; renewal may be higher.`, quantity: { max: 10, label: "Subscriptions" },
    logo: { set: "si", icon: "bitdefender" }, chips: ["Ultimate Security", "Identity monitoring", "Annual"] },
  { doc: "A", sku: "CE-026", slug: "bitdefender-ultimate-security-plus-extended", name: "Bitdefender Ultimate Security Plus Extended", brand: "Bitdefender", category: "Cybersecurity",
    description: "Premium security and identity-protection plan with additional monitoring and identity-related protection benefits.",
    coverage: "Annual; US reference price", billing: "year", unit: "device_pack",
    ref: { amount: 139.99, currency: "USD", label: "US$139.99/year (first year)", type: "promotional", sourceName: "Bitdefender official store", sourceUrl: BD_IND },
    listedPrice: 196607, verification: "verified", verificationNote: `${V} First-year price; renewal may be higher.`, quantity: { max: 10, label: "Subscriptions" },
    logo: { set: "si", icon: "bitdefender" }, chips: ["Ultimate Plus Extended", "Identity protection", "Annual"] },
  { doc: "A", sku: "CE-027", slug: "norton-360-deluxe", name: "Norton 360 Deluxe", brand: "Norton", category: "Cybersecurity",
    description: "Security suite covering up to five devices, with online threat protection and cloud backup storage under the listed US renewal plan.",
    coverage: "5 devices; annual US renewal price", billing: "year", unit: "device_pack",
    ref: { amount: 124.99, currency: "USD", label: "US$124.99/year (renewal)", type: "renewal", sourceName: "Norton official pricing", sourceUrl: NORTON },
    listedPrice: 176613, verification: "verified", verificationNote: V, quantity: { max: 10, label: "Subscriptions" }, logo: { set: "si", icon: "norton" }, chips: ["360 Deluxe", "5 devices", "Annual"] },
  { doc: "A", sku: "CE-028", slug: "norton-360-deluxe-plus-i", name: "Norton 360 Deluxe Plus I", brand: "Norton", category: "Cybersecurity",
    description: "Norton 360 Deluxe plan variant listed with 100 GB cloud storage for up to five devices.",
    coverage: "5 devices; 100 GB; annual US renewal price", billing: "year", unit: "device_pack",
    ref: { amount: 134.99, currency: "USD", label: "US$134.99/year (renewal)", type: "renewal", sourceName: "Norton official pricing", sourceUrl: NORTON },
    listedPrice: 189763, verification: "needs_verification", verificationNote: "Reference price matches the official page (21 Oct 2026). Catalogue listed ₦189,763, but the formula gives ₦189,942 (used here).",
    quantity: { max: 10, label: "Subscriptions" }, logo: { set: "si", icon: "norton" }, chips: ["360 Deluxe Plus I", "5 devices · 100 GB", "Annual"] },
  { doc: "A", sku: "CE-029", slug: "norton-360-deluxe-plus-ii", name: "Norton 360 Deluxe Plus II", brand: "Norton", category: "Cybersecurity",
    description: "Norton 360 Deluxe plan variant listed with 250 GB cloud storage for up to five devices.",
    coverage: "5 devices; 250 GB; annual US renewal price", billing: "year", unit: "device_pack",
    ref: { amount: 164.99, currency: "USD", label: "US$164.99/year (renewal)", type: "renewal", sourceName: "Norton official pricing", sourceUrl: NORTON },
    listedPrice: 229763, verification: "needs_verification", verificationNote: "Reference price matches the official page (21 Oct 2026). Catalogue listed ₦229,763, but the formula gives ₦229,932 (used here).",
    quantity: { max: 10, label: "Subscriptions" }, logo: { set: "si", icon: "norton" }, chips: ["360 Deluxe Plus II", "5 devices · 250 GB", "Annual"] },
  { doc: "A", sku: "CE-030", slug: "norton-360-for-gamers", name: "Norton 360 for Gamers", brand: "Norton", category: "Cybersecurity",
    description: "Security suite designed for gaming devices, with protection for up to three devices and 50 GB cloud storage under the listed plan.",
    coverage: "3 devices; 50 GB; annual US renewal price", billing: "year", unit: "device_pack",
    ref: { amount: 119.99, currency: "USD", label: "US$119.99/year (renewal)", type: "renewal", sourceName: "Norton official pricing", sourceUrl: NORTON },
    listedPrice: 169946, verification: "verified", verificationNote: V, quantity: { max: 10, label: "Subscriptions" }, logo: { set: "si", icon: "norton" }, chips: ["360 for Gamers", "3 devices · 50 GB", "Annual"] },
  { doc: "A", sku: "CE-031", slug: "norton-360-premium-i", name: "Norton 360 Premium I", brand: "Norton", category: "Cybersecurity",
    description: "Security suite for up to ten devices with 100 GB cloud storage under the listed US renewal plan.",
    coverage: "10 devices; 100 GB; annual US renewal price", billing: "year", unit: "device_pack",
    ref: { amount: 149.99, currency: "USD", label: "US$149.99/year (renewal)", type: "renewal", sourceName: "Norton official pricing", sourceUrl: NORTON },
    listedPrice: 209883, verification: "needs_verification", verificationNote: "Reference price matches the official page (21 Oct 2026). Catalogue listed ₦209,883, but the formula gives ₦209,937 (used here).",
    quantity: { max: 10, label: "Subscriptions" }, logo: { set: "si", icon: "norton" }, chips: ["360 Premium I", "10 devices · 100 GB", "Annual"] },

  // ───────────── Document B: 30 additional products ─────────────
  { doc: "B", sku: "CE-032", slug: "zoom-workplace-pro-annual", name: "Zoom Workplace Pro (Annual)", brand: "Zoom", category: "Meetings & Communication",
    description: "Premium video meetings and workplace collaboration features.",
    coverage: "Annual subscription; Nigeria App Store listing", billing: "year", unit: "subscription",
    ref: { amount: 67900, currency: "NGN", label: "₦67,900/year", type: "standard", sourceName: "Apple App Store Nigeria", sourceUrl: "https://apps.apple.com/ng/app/zoom-workplace/id546505307?platform=ipad" },
    listedPrice: 77900, verification: "needs_verification", verificationNote: "Price is an in-app App Store listing; confirm current account-region checkout and how the subscription would be provided.",
    quantity: { max: 10, label: "Subscriptions" }, logo: { set: "logos", icon: "zoom" }, chips: ["Workplace Pro", "Annual"] },
  { doc: "B", sku: "CE-033", slug: "slack-pro", name: "Slack Pro", brand: "Slack", category: "Business & Collaboration",
    description: "Team messaging with searchable history, calls and integrations.",
    coverage: "Per active user per month, billed annually", billing: "month", billingNote: "Vendor bills annually", unit: "user",
    ref: { amount: 7.25, currency: "USD", label: "US$7.25/active user/month, billed annually", type: "annual_billing_monthly_equivalent", sourceName: "Slack official pricing", sourceUrl: "https://slack.com/pricing/pro" },
    listedPrice: 19664, verification: "needs_verification", verificationNote: `The official page did not show the price when re-checked on 21 Oct 2026. ${ANNUAL_EQ}`,
    quantity: { max: 500, label: "Users" }, logo: { set: "logos", icon: "slack" }, chips: ["Pro", "Per user", "Billed annually"] },
  { doc: "B", sku: "CE-034", slug: "notion-plus", name: "Notion Plus", brand: "Notion", category: "Productivity & Office",
    description: "Team workspace for documents, projects, databases and collaboration.",
    coverage: "Per seat per month", billing: "month", unit: "seat",
    ref: { amount: 10, currency: "USD", label: "US$10/seat/month", type: "standard", sourceName: "Notion official pricing", sourceUrl: "https://www.notion.com/pricing" },
    listedPrice: 23330, verification: "verified", verificationNote: `${V} Notion offers a discount for yearly billing.`, quantity: { max: 500, label: "Seats" },
    logo: { set: "logos", icon: "notion" }, chips: ["Plus", "Per seat", "Monthly"] },
  { doc: "B", sku: "CE-035", slug: "github-copilot-pro", name: "GitHub Copilot Pro", brand: "GitHub", category: "Developer Tools",
    description: "AI coding assistant with code completion and chat features under plan limits.",
    coverage: "Per user per month", billing: "month", unit: "user",
    ref: { amount: 10, currency: "USD", label: "US$10/user/month", type: "standard", sourceName: "GitHub official pricing", sourceUrl: "https://github.com/features/copilot/plans" },
    listedPrice: 23330, verification: "verified", verificationNote: V, quantity: { max: 1, label: "Subscription" }, logo: { set: "logos", icon: "github-copilot" }, chips: ["Copilot Pro", "Monthly"] },
  { doc: "B", sku: "CE-036", slug: "jetbrains-all-products-pack", name: "JetBrains All Products Pack", brand: "JetBrains", category: "Developer Tools",
    description: "Subscription bundle for JetBrains IDEs and developer tools.",
    coverage: "Per user per year (individual price)", billing: "year", unit: "user",
    ref: { amount: 979, currency: "USD", label: "US$979/user/year", type: "standard", sourceName: "JetBrains official store", sourceUrl: "https://www.jetbrains.com/all/" },
    listedPrice: 1315007, verification: "needs_verification", verificationNote: "The official page did not show a price when re-checked on 21 Oct 2026. Confirm individual vs organisation pricing and region.",
    quantity: { max: 50, label: "Users" }, logo: { set: "logos", icon: "jetbrains" }, chips: ["All Products Pack", "Per user", "Annual"] },
  { doc: "B", sku: "CE-037", slug: "nordvpn-basic", name: "NordVPN Basic (Renewal Reference)", brand: "NordVPN", category: "Privacy & VPN",
    description: "VPN service for encrypted internet connections and included Basic features.",
    coverage: "Annual; published renewal price", billing: "year", unit: "subscription",
    ref: { amount: 139.08, currency: "USD", label: "US$139.08/year (renewal)", type: "renewal", sourceName: "NordVPN official pricing", sourceUrl: "https://nordvpn.com/pricing/" },
    listedPrice: 195394, verification: "catalogue", quantity: { max: 10, label: "Subscriptions" }, logo: { set: "si", icon: "nordvpn" }, chips: ["Basic", "Annual"] },
  { doc: "B", sku: "CE-038", slug: "expressvpn-basic", name: "ExpressVPN Basic (Renewal Reference)", brand: "ExpressVPN", category: "Privacy & VPN",
    description: "VPN service with encrypted connections and Basic-tier protection features.",
    coverage: "Annual; stated renewal price after introductory term", billing: "year", unit: "subscription",
    ref: { amount: 99.95, currency: "USD", label: "US$99.95/year (renewal)", type: "renewal", sourceName: "ExpressVPN official pricing", sourceUrl: "https://www.expressvpn.com/pricing" },
    listedPrice: 143233, verification: "catalogue", quantity: { max: 10, label: "Subscriptions" }, logo: { set: "si", icon: "expressvpn" }, chips: ["Basic", "Annual"] },
  { doc: "B", sku: "CE-039", slug: "figma-professional-full-seat", name: "Figma Professional — Full Seat", brand: "Figma", category: "Creative & Design",
    description: "Collaborative interface design, prototyping and design-to-development handoff.",
    coverage: "Per full seat per month", billing: "month", unit: "seat",
    ref: { amount: 16, currency: "USD", label: "US$16/full seat/month", type: "standard", sourceName: "Figma official pricing", sourceUrl: "https://www.figma.com/pricing/" },
    listedPrice: 31328, verification: "needs_verification", verificationNote: "Re-check on 21 Oct 2026 showed Professional at US$12/editor/month (annual) or US$15 (monthly), not US$16. Update the reference price before selling.",
    quantity: { max: 100, label: "Seats" }, logo: { set: "logos", icon: "figma" }, chips: ["Professional", "Full seat", "Monthly"] },
  { doc: "B", sku: "CE-040", slug: "grammarly-pro-annual", name: "Grammarly Pro (Annual)", brand: "Grammarly", category: "Productivity & Office",
    description: "Writing assistance with rewriting, tone and fluency tools.",
    coverage: "Per member per year", billing: "year", unit: "user",
    ref: { amount: 144, currency: "USD", label: "US$144/member/year", type: "standard", sourceName: "Grammarly official pricing support", sourceUrl: "https://support.grammarly.com/hc/en-us/articles/115000090011-How-much-does-Grammarly-Pro-cost" },
    listedPrice: 201952, verification: "catalogue", quantity: { max: 50, label: "Members" }, logo: { set: "logos", icon: "grammarly" }, chips: ["Pro", "Annual"] },
  { doc: "B", sku: "CE-041", slug: "todoist-pro-annual", name: "Todoist Pro (Annual)", brand: "Todoist", category: "Productivity & Office",
    description: "Task and project management with calendar layout, reminders and reporting.",
    coverage: "Per user per year", billing: "year", unit: "user",
    ref: { amount: 60, currency: "USD", label: "US$60/user/year", type: "standard", sourceName: "Todoist official pricing", sourceUrl: "https://www.todoist.com/pricing/" },
    listedPrice: 89980, verification: "catalogue", quantity: { max: 50, label: "Users" }, logo: { set: "logos", icon: "todoist" }, chips: ["Pro", "Annual"] },
  { doc: "B", sku: "CE-042", slug: "jira-standard", name: "Jira Standard", brand: "Atlassian", category: "Business & Collaboration",
    description: "Issue tracking and agile project management for software and business teams.",
    coverage: "Per user per month; cost may vary with user tier", billing: "month", unit: "user",
    ref: { amount: 7.91, currency: "USD", label: "US$7.91/user/month", type: "standard", sourceName: "Atlassian official Jira pricing", sourceUrl: "https://www.atlassian.com/en/software/jira/pricing" },
    listedPrice: 20544, verification: "catalogue", quantity: { max: 500, label: "Users" }, logo: { set: "logos", icon: "jira" }, chips: ["Standard", "Per user", "Monthly"] },
  { doc: "B", sku: "CE-043", slug: "confluence-standard", name: "Confluence Standard", brand: "Atlassian", category: "Business & Collaboration",
    description: "Shared documentation, project notes and internal knowledge spaces.",
    coverage: "Per user per month; tier-based pricing", billing: "month", unit: "user",
    ref: { amount: 5.42, currency: "USD", label: "US$5.42/user/month", type: "standard", sourceName: "Atlassian official Confluence pricing", sourceUrl: "https://www.atlassian.com/en/software/confluence/pricing" },
    listedPrice: 17225, verification: "catalogue", quantity: { max: 500, label: "Users" }, logo: { set: "logos", icon: "confluence" }, chips: ["Standard", "Per user", "Monthly"] },
  { doc: "B", sku: "CE-044", slug: "parallels-desktop-standard", name: "Parallels Desktop Standard", brand: "Parallels", category: "Developer Tools",
    description: "Run Windows and other operating systems in virtual machines on compatible Macs.",
    coverage: "Annual; promotional price displayed", platforms: "Compatible Mac computers", billing: "year", unit: "subscription",
    ref: { amount: 39.99, currency: "USD", label: "US$39.99/year (promotional)", type: "promotional", sourceName: "Parallels official pricing", sourceUrl: "https://www.parallels.com/products/desktop/" },
    listedPrice: 63307, verification: "needs_verification", verificationNote: "Promotional price; the page also lists a higher regular price. Confirm the price that will apply before selling.",
    quantity: { max: 10, label: "Subscriptions" }, logo: { set: "none" }, chips: ["Desktop Standard", "For Mac", "Annual"] },
  { doc: "B", sku: "CE-045", slug: "acronis-true-image-essentials", name: "Acronis True Image Essentials", brand: "Acronis", category: "Backup & Recovery",
    description: "Computer backup and recovery software for files and system data.",
    coverage: "From price; final cost depends on device count and plan", billing: "year", unit: "subscription",
    ref: { amount: 49.99, currency: "USD", label: "From US$49.99/year", type: "starting_from", sourceName: "Acronis official product comparison", sourceUrl: "https://www.acronis.com/en/products/true-image/comparison/" },
    listedPrice: 76637, verification: "needs_verification", verificationNote: "Starting price only; final cost depends on device count and plan.",
    quantity: { max: 10, label: "Subscriptions" }, logo: { set: "none" }, chips: ["Essentials", "Backup", "Annual"] },
  { doc: "B", sku: "CE-046", slug: "idrive-personal-5tb", name: "IDrive Personal — 5 TB", brand: "IDrive", category: "Backup & Recovery",
    description: "Cloud backup for one user across multiple computers with 5 TB storage.",
    coverage: "One user; multiple computers; 5 TB", billing: "year", unit: "subscription",
    ref: { amount: 83.88, currency: "USD", label: "US$6.99/month billed annually (US$83.88/year)", type: "promotional", sourceName: "IDrive official pricing", sourceUrl: "https://www.idrive.com/pricing" },
    listedPrice: 121812, verification: "catalogue", verificationNote: "Calculated from the displayed annual-billing offer; renewal price may differ.",
    quantity: { max: 10, label: "Subscriptions" }, logo: { set: "none" }, chips: ["Personal", "5 TB", "Annual"] },
  { doc: "B", sku: "CE-047", slug: "webflow-basic-site-plan", name: "Webflow Basic Site Plan", brand: "Webflow", category: "Website Tools",
    description: "Hosted website plan for custom-domain sites that do not need a CMS.",
    coverage: "Per site per month, billed yearly; domain and tax may be extra", billing: "month", billingNote: "Vendor bills yearly", unit: "site",
    ref: { amount: 15, currency: "USD", label: "US$15/site/month, billed yearly", type: "annual_billing_monthly_equivalent", sourceName: "Webflow official pricing", sourceUrl: "https://webflow.com/pricing" },
    listedPrice: 29995, verification: "needs_verification", verificationNote: ANNUAL_EQ, quantity: { max: 10, label: "Sites" }, logo: { set: "logos", icon: "webflow" }, chips: ["Basic site", "Per site", "Billed yearly"] },
  { doc: "B", sku: "CE-048", slug: "namecheap-com-domain", name: "Namecheap .com Domain Registration", brand: "Namecheap", category: "Website Tools",
    description: "One-year registration of a .com domain name.",
    coverage: "1 domain; 1 year; renewal is priced separately (higher)", billing: "year", unit: "domain",
    ref: { amount: 11.28, currency: "USD", label: "US$11.28 for 1 year (sale price)", type: "promotional", sourceName: "Namecheap official .com pricing", sourceUrl: "https://www.namecheap.com/domains/registration/gtld/com/" },
    listedPrice: 25036, verification: "needs_verification", verificationNote: "Discounted registration price; renewal is listed separately at a higher price. Availability of the requested name must be checked.",
    quantity: { max: 1, label: "Domain" }, option: { label: "Domain name you want to register (e.g. mybusiness.com)", required: true },
    logo: { set: "si", icon: "namecheap" }, chips: [".com domain", "1 year"] },
  { doc: "B", sku: "CE-049", slug: "descript-creator", name: "Descript Creator", brand: "Descript", category: "Creative & Design",
    description: "Audio/video editor with transcription, screen recording and AI editing tools.",
    coverage: "Per editor; US$12/month billed annually (US$144/year)", billing: "year", unit: "editor",
    ref: { amount: 144, currency: "USD", label: "US$12/editor/month billed annually (US$144/year)", type: "standard", sourceName: "Descript official pricing", sourceUrl: "https://www.descript.com/price" },
    listedPrice: 201952, verification: "catalogue", quantity: { max: 20, label: "Editors" }, logo: { set: "logos", icon: "descript" }, chips: ["Creator", "Per editor", "Annual"] },
  { doc: "B", sku: "CE-050", slug: "otter-ai-pro-annual", name: "Otter.ai Pro (Annual)", brand: "Otter.ai", category: "Meetings & Communication",
    description: "AI meeting transcription, summaries, search and integrations for supported meeting platforms.",
    coverage: "Per user per month, billed annually", billing: "month", billingNote: "Vendor bills annually", unit: "user",
    ref: { amount: 8.33, currency: "USD", label: "US$8.33/user/month, billed annually", type: "annual_billing_monthly_equivalent", sourceName: "Otter.ai official pricing", sourceUrl: "https://otter.ai/pricing" },
    listedPrice: 21104, verification: "needs_verification", verificationNote: ANNUAL_EQ, quantity: { max: 50, label: "Users" }, logo: { set: "none" }, chips: ["Pro", "Per user", "Billed annually"] },
  { doc: "B", sku: "CE-051", slug: "loom-business", name: "Loom Business", brand: "Loom", category: "Meetings & Communication",
    description: "Screen and camera recording for asynchronous team updates and sharing.",
    coverage: "Per user per month", billing: "month", unit: "user",
    ref: { amount: 18, currency: "USD", label: "US$18/user/month", type: "standard", sourceName: "Loom official pricing", sourceUrl: "https://www.loom.com/pricing" },
    listedPrice: 33994, verification: "catalogue", quantity: { max: 100, label: "Users" }, logo: { set: "logos", icon: "loom" }, chips: ["Business", "Per user", "Monthly"] },
  { doc: "B", sku: "CE-052", slug: "surfshark-starter-introductory", name: "Surfshark Starter (Introductory Term)", brand: "Surfshark", category: "Privacy & VPN",
    description: "VPN subscription for encrypted browsing across supported devices.",
    coverage: "First 27 months (introductory promotion)", billing: "term", billingNote: "for the first 27 months (introductory)", unit: "subscription",
    ref: { amount: 67.23, currency: "USD", label: "US$67.23 for the first 27 months (promotion)", type: "introductory", sourceName: "Surfshark official pricing", sourceUrl: "https://surfshark.com/pricing" },
    listedPrice: 99618, verification: "needs_verification", verificationNote: "Promotional introductory term, not renewal pricing.",
    quantity: { max: 10, label: "Subscriptions" }, logo: { set: "si", icon: "surfshark" }, chips: ["Starter", "27-month term"] },
  { doc: "B", sku: "CE-053", slug: "backblaze-personal-backup", name: "Backblaze Personal Computer Backup", brand: "Backblaze", category: "Backup & Recovery",
    description: "Unlimited backup for one Mac or PC with access to backed-up files.",
    coverage: "Per computer per year", platforms: "Mac or Windows PC", billing: "year", unit: "computer",
    ref: { amount: 99, currency: "USD", label: "US$99/computer/year", type: "standard", sourceName: "Backblaze official pricing", sourceUrl: "https://www.backblaze.com/cloud-backup/pricing" },
    listedPrice: 141967, verification: "verified", verificationNote: V, quantity: { max: 20, label: "Computers" }, logo: { set: "si", icon: "backblaze" }, chips: ["Personal Backup", "1 computer", "Annual"] },
  { doc: "B", sku: "CE-054", slug: "digitalocean-basic-droplet", name: "DigitalOcean Basic Droplet", brand: "DigitalOcean", category: "Cloud & Hosting",
    description: "Cloud virtual machine for hosting websites, APIs and development workloads.",
    coverage: "Starting compute price; storage, backups and usage can add charges", billing: "month", unit: "subscription",
    ref: { amount: 4, currency: "USD", label: "From US$4/month", type: "starting_from", sourceName: "DigitalOcean official product page", sourceUrl: "https://www.digitalocean.com/products/droplets" },
    listedPrice: 15332, verification: "needs_verification", verificationNote: "Usage-based service; the price is a starting compute price only.",
    quantity: { max: 10, label: "Droplets" }, logo: { set: "logos", icon: "digital-ocean" }, chips: ["Basic Droplet", "From US$4", "Monthly"] },
  { doc: "B", sku: "CE-055", slug: "cloudflare-pro", name: "Cloudflare Pro Website Plan", brand: "Cloudflare", category: "Website Tools",
    description: "Website performance and security features including CDN and web application firewall.",
    coverage: "Per website per month, billed annually", billing: "month", billingNote: "Vendor bills annually", unit: "site",
    ref: { amount: 20, currency: "USD", label: "US$20/month billed annually", type: "annual_billing_monthly_equivalent", sourceName: "Cloudflare official pricing", sourceUrl: "https://www.cloudflare.com/plans/" },
    listedPrice: 36660, verification: "needs_verification", verificationNote: `Reference price matches the official page (21 Oct 2026). ${ANNUAL_EQ}`,
    quantity: { max: 10, label: "Websites" }, logo: { set: "logos", icon: "cloudflare" }, chips: ["Pro", "Per website", "Billed annually"] },
  { doc: "B", sku: "CE-056", slug: "postman-solo", name: "Postman Solo", brand: "Postman", category: "Developer Tools",
    description: "API client and tools for testing, documenting and monitoring APIs.",
    coverage: "Monthly equivalent, billed annually", billing: "month", billingNote: "Vendor bills annually", unit: "subscription",
    ref: { amount: 9, currency: "USD", label: "US$9/month billed annually", type: "annual_billing_monthly_equivalent", sourceName: "Postman official pricing", sourceUrl: "https://www.postman.com/pricing/" },
    listedPrice: 21997, verification: "needs_verification", verificationNote: `Reference price matches the official page (21 Oct 2026). ${ANNUAL_EQ}`,
    quantity: { max: 1, label: "Subscription" }, logo: { set: "logos", icon: "postman" }, chips: ["Solo", "Billed annually"] },
  { doc: "B", sku: "CE-057", slug: "docker-pro", name: "Docker Pro", brand: "Docker", category: "Developer Tools",
    description: "Container development tools for individual professionals.",
    coverage: "Per user per month, billed annually", billing: "month", billingNote: "Vendor bills annually", unit: "user",
    ref: { amount: 9, currency: "USD", label: "US$9/user/month billed annually", type: "annual_billing_monthly_equivalent", sourceName: "Docker official pricing", sourceUrl: "https://www.docker.com/pricing/" },
    listedPrice: 21997, verification: "needs_verification", verificationNote: `Reference price matches the official page (21 Oct 2026). ${ANNUAL_EQ}`,
    quantity: { max: 1, label: "Subscription" }, logo: { set: "logos", icon: "docker" }, chips: ["Pro", "Billed annually"] },
  { doc: "B", sku: "CE-058", slug: "render-pro-workspace", name: "Render Pro Workspace", brand: "Render", category: "Cloud & Hosting",
    description: "Workspace tier for teams deploying production-grade apps; compute billed separately.",
    coverage: "Workspace fee only; compute, bandwidth and usage add costs", billing: "month", unit: "workspace",
    ref: { amount: 25, currency: "USD", label: "US$25/month plus compute", type: "standard", sourceName: "Render official pricing", sourceUrl: "https://render.com/pricing" },
    listedPrice: 43325, verification: "needs_verification", verificationNote: "Workspace fee only; usage-based compute is charged separately by Render.",
    quantity: { max: 1, label: "Workspace" }, logo: { set: "si", icon: "render" }, chips: ["Pro workspace", "Monthly + usage"] },
  { doc: "B", sku: "CE-059", slug: "vercel-pro", name: "Vercel Pro", brand: "Vercel", category: "Cloud & Hosting",
    description: "Deployment and hosting platform for web applications with usage credits.",
    coverage: "Platform fee; additional seats, add-ons and usage may cost extra", billing: "month", unit: "workspace",
    ref: { amount: 20, currency: "USD", label: "US$20/month platform fee", type: "standard", sourceName: "Vercel official Pro plan documentation", sourceUrl: "https://vercel.com/docs/plans/pro-plan" },
    listedPrice: 36660, verification: "needs_verification", verificationNote: "Platform fee only; seats, add-ons and usage are billed by Vercel.",
    quantity: { max: 1, label: "Team" }, logo: { set: "logos", icon: "vercel" }, chips: ["Pro", "Monthly + usage"] },
  { doc: "B", sku: "CE-060", slug: "postman-team", name: "Postman Team", brand: "Postman", category: "Developer Tools",
    description: "Team API plan with shared workspaces, collaboration and role-based controls.",
    coverage: "Per user per month, billed annually", billing: "month", billingNote: "Vendor bills annually", unit: "user",
    ref: { amount: 19, currency: "USD", label: "US$19/user/month billed annually", type: "annual_billing_monthly_equivalent", sourceName: "Postman official pricing", sourceUrl: "https://www.postman.com/pricing/" },
    listedPrice: 35327, verification: "needs_verification", verificationNote: `Reference price matches the official page (21 Oct 2026). ${ANNUAL_EQ}`,
    quantity: { max: 100, label: "Users" }, logo: { set: "logos", icon: "postman" }, chips: ["Team", "Per user", "Billed annually"] },
  { doc: "B", sku: "CE-061", slug: "docker-team", name: "Docker Team", brand: "Docker", category: "Developer Tools",
    description: "Team container-development plan with collaboration and shared developer tooling.",
    coverage: "Per user per month, billed annually", billing: "month", billingNote: "Vendor bills annually", unit: "user",
    ref: { amount: 15, currency: "USD", label: "US$15/user/month billed annually", type: "annual_billing_monthly_equivalent", sourceName: "Docker official pricing", sourceUrl: "https://www.docker.com/pricing/" },
    listedPrice: 29995, verification: "needs_verification", verificationNote: `Reference price matches the official page (21 Oct 2026). ${ANNUAL_EQ}`,
    quantity: { max: 100, label: "Users" }, logo: { set: "logos", icon: "docker" }, chips: ["Team", "Per user", "Billed annually"] },
];

/** Selling price in whole naira from the documented formula. */
export function sellingPrice(ref: { amount: number; currency: "USD" | "NGN" }, fx = FX_RATE_NGN_PER_USD, markup = MARKUP_NGN): number {
  return ref.currency === "USD" ? Math.round(ref.amount * fx) + markup : Math.round(ref.amount) + markup;
}
