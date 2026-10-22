/**
 * SITE CONTENT AND SETTINGS — the main file to edit when wording changes.
 * Company facts below are the confirmed source of truth. Do not change them without instruction.
 * Imports in this file use ".ts" extensions so the unit tests can run with plain Node.
 */

export const company = {
  name: "Cloud Edge Technology Services Limited",
  short: "Cloud Edge",
  rc: "9922715",
  email: "CLOUDEDGETECHNOLOGYSERVICES@GMAIL.COM",
  address: ["Suite 306B, Samfa Plaza", "Ndola Crescent, Wuse Zone 5", "Abuja, FCT, Nigeria"],
  addressParts: { street: "Suite 306B, Samfa Plaza, Ndola Crescent", locality: "Wuse Zone 5, Abuja", region: "FCT", country: "NG" },
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  tagline: "Software, applications, e-commerce and internet services from Abuja, Nigeria.",
  description:
    "Cloud Edge Technology Services Limited is a Nigerian technology and e-commerce company focused on software development, web and mobile applications, internet-related services, digital products and technology solutions.",
};

/** Social profiles. Empty on purpose: no official accounts have been supplied. Add {label, href} items when they exist. */
export const social: { label: string; href: string }[] = [];

/** Website behaviour switches. */
export const settings = {
  /** Show the clearly labelled DEMO portfolio concepts. Set to false once real, approved projects are added. */
  showDemoProjects: true,
};

export const nav = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/solutions", label: "Solutions" },
  { href: "/products", label: "Products" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/contact", label: "Contact" },
];

export type Service = {
  slug: string;
  title: string;
  icon: string;
  summary: string;
  problem: string;
  what: string;
  items: string[];
  goodFor: string[];
  inquiryType: string;
};

// Proposed service categories based on the company's registered business purpose.
// Each one needs business confirmation before being treated as an active, staffed offering.
export const services: Service[] = [
  {
    slug: "software-development", title: "Software Development", icon: "code", inquiryType: "Software development",
    summary: "Custom software built around how your business actually works.",
    problem: "Off-the-shelf tools often force a business to change its processes to fit the software, or leave important work in spreadsheets and paper files.",
    what: "We plan and build software tailored to your workflow, from internal tools for your team to customer-facing systems, with documentation so it can be maintained.",
    items: ["Requirements discussion and scoping", "Custom business applications and internal tools", "Integration with tools you already use", "Testing, handover and documentation"],
    goodFor: ["Businesses outgrowing spreadsheets", "Teams with a repeated manual process", "Organisations needing a specific internal system"],
  },
  {
    slug: "web-development", title: "Website Design & Development", icon: "globe", inquiryType: "Website design & development",
    summary: "Clear, fast, mobile-friendly websites that present your business properly.",
    problem: "Many customers judge a business by its website before they ever make contact. An outdated or broken site loses enquiries.",
    what: "We design and build responsive websites with clear structure, working contact routes and search-friendly foundations.",
    items: ["Company and brand websites", "Landing pages for campaigns", "Content structure and navigation", "Accessibility and SEO foundations"],
    goodFor: ["New businesses needing a first website", "Companies replacing an outdated site", "Campaigns needing a focused landing page"],
  },
  {
    slug: "application-development", title: "Web Applications", icon: "layers", inquiryType: "Web application",
    summary: "Browser-based applications, portals and dashboards for your team or customers.",
    problem: "Manual processes, scattered information and back-and-forth messaging slow teams down and make growth harder to manage.",
    what: "We scope and build web applications that digitise a defined process: customer portals, booking systems, dashboards and admin tools.",
    items: ["Customer and staff portals", "User accounts and role-based access", "Dashboards and reporting", "Ongoing improvement planning"],
    goodFor: ["Service businesses managing bookings or requests", "Organisations needing a member or customer portal", "Teams needing a shared dashboard"],
  },
  {
    slug: "mobile-app-development", title: "Mobile App Development", icon: "phone", inquiryType: "Mobile application",
    summary: "Mobile applications that put your service in your customers' hands.",
    problem: "Some services work best on a phone: ordering, booking, tracking or staying in touch with customers on the move.",
    what: "We help define the right mobile approach for your audience and budget, then design and build the application and the systems behind it.",
    items: ["Mobile app planning and scoping", "Android and iOS approaches", "Connecting the app to a web dashboard or backend", "App store preparation guidance"],
    goodFor: ["Businesses whose customers mainly use phones", "Delivery, booking and ordering services", "Field teams that need a mobile tool"],
  },
  {
    slug: "ecommerce", title: "E-Commerce Solutions", icon: "cart", inquiryType: "E-commerce solution",
    summary: "Online stores that are straightforward for customers to use and for you to manage.",
    problem: "Selling online needs more than a product list: a clear catalogue, a reliable ordering flow and simple follow-up.",
    what: "We set up online stores and ordering flows suited to your products and the payment options available to you.",
    items: ["Store setup and catalogue structure", "Order and enquiry flows", "Payment integration where required", "Store management guidance"],
    goodFor: ["Retailers moving online", "Brands selling through social media who need a proper store", "Businesses taking orders by phone or chat"],
  },
  {
    slug: "internet-services", title: "Internet-Related Services", icon: "cloud", inquiryType: "Internet-related services",
    summary: "Domains, hosting, business email and web infrastructure support.",
    problem: "Setting up domains, hosting and professional email can be confusing and easy to get wrong.",
    what: "We help organisations choose and configure the web infrastructure their website or application needs, and keep it in order.",
    items: ["Domain and DNS setup", "Hosting selection and deployment", "Business email configuration", "Basic security hygiene and backups"],
    goodFor: ["Businesses still using personal email addresses", "Organisations moving hosting provider", "Anyone launching a new website or app"],
  },
  {
    slug: "digital-products", title: "Digital Products", icon: "box", inquiryType: "Digital product",
    summary: "Digital tools, platforms and resources that help businesses grow.",
    problem: "Businesses often need ready-to-use digital tools but find generic options don't fit their market or way of working.",
    what: "We plan, build and support digital products — from software tools to digital resources — designed for clearly defined users.",
    items: ["Digital product planning", "Design and development", "Launch and distribution guidance", "Updates and support planning"],
    goodFor: ["Businesses with a product idea to validate", "Organisations that need a reusable digital tool", "Creators packaging expertise digitally"],
  },
  {
    slug: "technology-consulting", title: "Technology Solutions & Consulting", icon: "compass", inquiryType: "Technology consulting",
    summary: "Practical advice on choosing, planning and improving the technology you use.",
    problem: "Businesses often know the outcome they want but not which technology fits, what it should cost or how to start.",
    what: "We help you define the problem, compare options and plan a realistic technology approach before money is committed to building.",
    items: ["Solution discovery and requirements", "Technology and vendor options review", "Digital process improvement", "Project planning and estimates"],
    goodFor: ["Owners planning a digital project", "Teams choosing between software options", "Organisations reviewing existing systems"],
  },
];

/** Solution areas = business problems the services combine to solve. Not products. */
export const solutions = [
  { icon: "globe", title: "Credible online presence", text: "A professional website, domain and business email so customers can find, trust and contact you.", services: ["web-development", "internet-services"] },
  { icon: "cart", title: "Selling and taking orders online", text: "Catalogues, ordering and enquiry flows that turn interest into orders you can follow up.", services: ["ecommerce", "web-development"] },
  { icon: "layers", title: "Digitising manual processes", text: "Replace paper forms, spreadsheets and chat threads with a system your team can rely on.", services: ["software-development", "application-development"] },
  { icon: "users", title: "Customer portals and bookings", text: "Let customers book, request, track or manage their account without phoning or messaging.", services: ["application-development", "mobile-app-development"] },
  { icon: "chart", title: "Dashboards and reporting", text: "Bring scattered information into one view so decisions are based on current numbers.", services: ["software-development", "application-development"] },
  { icon: "compass", title: "Planning a technology project", text: "Clarify requirements, options and budget before you commit to building anything.", services: ["technology-consulting", "digital-products"] },
];

export const processSteps = [
  { title: "Discuss", text: "You tell us about the problem, goals and timing through the inquiry form or by email." },
  { title: "Scope", text: "We agree in writing what will be built, how it will work, what it needs and what it will cost." },
  { title: "Build", text: "We design and develop in stages, sharing progress so you can give feedback early." },
  { title: "Launch & support", text: "We deploy, hand over documentation and agree how ongoing support will work." },
];

export const values = [
  { icon: "bulb", title: "Practical innovation", text: "We use modern technology where it solves a real business problem." },
  { icon: "shield", title: "Security-minded", text: "We collect only the data a service needs and protect it sensibly." },
  { icon: "users", title: "Customer focused", text: "Plain language, clear scope and regular updates throughout." },
  { icon: "globe", title: "Open to the world", text: "Based in Abuja and open to Nigerian and international clients." },
];

export const faqs = [
  { q: "What does Cloud Edge do?", a: "Cloud Edge Technology Services Limited is a Nigerian technology and e-commerce company focused on software, web and mobile application development, internet-related services, digital products and technology solutions." },
  { q: "How do I start a project?", a: "Send a project inquiry using the Request a Quote form, describing what you need. We will reply by email to discuss scope and next steps." },
  { q: "Do I need to know my budget?", a: "No. The budget field is optional. A rough range helps us suggest a realistic approach, but you can leave it blank." },
  { q: "Can you give a fixed price immediately?", a: "Pricing depends on scope. We prefer to understand your requirements first, then provide a written estimate." },
  { q: "How do I get software from your shop?", a: "Add the software you need to your request list and send a sourcing request. We check availability, licence eligibility for your country and the final price with external suppliers, then email you a quotation. You pay only after you accept it." },
  { q: "Why are shop prices called indicative?", a: "They are estimates based on each vendor's published price, converted to naira. The real cost depends on the supplier, exchange rate, fees and your country, so the final price is the one in your quotation." },
  { q: "Where are you located?", a: "Our registered address is Suite 306B, Samfa Plaza, Ndola Crescent, Wuse Zone 5, Abuja, FCT, Nigeria." },
  { q: "Do you work with clients outside Nigeria?", a: "We welcome inquiries from Nigerian and international clients. Send the details of your project and we will discuss what is practical." },
  { q: "What happens to the information I send?", a: "It is used only to respond to your inquiry. See the Privacy Policy for details of what is stored and for how long." },
];

/** Questions about the manual software-sourcing process (shown on the FAQ page under #sourcing). */
export const sourcingFaqs = [
  { q: "How does software sourcing work?", a: "Cloud Edge sources eligible software products through external suppliers. You send a request; we check availability, licence eligibility and the current price; we send a quotation; you accept it and pay; we then place the order with the supplier and deliver the licence or activation instructions. Cloud Edge is not an authorised partner of the software brands unless a product page says so." },
  { q: "Why must my request be confirmed before I pay?", a: "Availability, final pricing, licence eligibility, and delivery time must be confirmed before your order is finalised. Supplier prices and stock change, and some licences are only valid in certain countries. Sending a request does not secure the product and does not charge you." },
  { q: "When do I pay?", a: "Only after you have accepted a quotation. We then give you a payment option — a secure Paystack link where online payment is available, or payment instructions from Cloud Edge. Your payment counts as confirmed only after we verify it with the payment provider or our bank account. We never ask for payment before a quotation is accepted." },
  { q: "How long does delivery take?", a: "It depends on the product and the supplier. We do not promise a delivery time until the supplier has confirmed it; your quotation shows the confirmed estimate, and your request page shows progress." },
  { q: "What if you cannot source a product?", a: "We tell you on your request page and by email (where email is set up), and nothing is charged. If you had already paid and the supplier then fails, we refund you as described in the Refund & Delivery Policy." },
  { q: "How do I contact you about a request?", a: "Email us quoting your request reference (it starts with CE). You can also follow every update on your request page using the link in your acknowledgement email, or in your account if you sent the request while signed in." },
];

export const inquiryTypes = [
  "General inquiry",
  ...services.map((s) => s.inquiryType),
  "Product enquiry",
  "Partnership",
  "Other",
];
export const budgetRanges = ["Prefer not to say", "Under ₦500,000", "₦500,000 – ₦2,000,000", "₦2,000,000 – ₦5,000,000", "Above ₦5,000,000", "Not sure yet"];
export const timelines = ["As soon as possible", "Within 1 month", "1 – 3 months", "3 – 6 months", "Flexible / not sure"];
