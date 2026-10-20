export const company = {
  name: "Cloud Edge Technology Services Limited",
  short: "Cloud Edge",
  rc: "9922715",
  email: "CLOUDEDGETECHSERVICES@GMAIL.COM",
  address: ["Suite 306B, Samfa Plaza", "Ndola Crescent, Wuse Zone 5", "Abuja, FCT, Nigeria"],
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

export const nav = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/solutions", label: "Solutions" },
  { href: "/contact", label: "Contact" },
];

export type Service = {
  slug: string; title: string; icon: string; summary: string; problem: string; what: string; items: string[];
};

// Proposed service categories. Each needs business confirmation before being treated as an active offering.
export const services: Service[] = [
  { slug: "software-development", title: "Software Development", icon: "code",
    summary: "Custom software built around how your business actually works.",
    problem: "Off-the-shelf tools often force a business to change its processes to fit the software.",
    what: "We plan and build software tailored to your workflow, from internal tools to customer-facing systems.",
    items: ["Requirements discussion and scoping", "Custom business applications", "Integration with tools you already use", "Handover and documentation"] },
  { slug: "web-development", title: "Website Design & Development", icon: "globe",
    summary: "Clear, fast, mobile-friendly websites that present your business properly.",
    problem: "Many customers judge a business by its website before they ever make contact.",
    what: "We design and build responsive websites with clear structure, working contact routes and search-friendly foundations.",
    items: ["Company and brand websites", "Landing pages", "Content structure and navigation", "Accessibility and SEO basics"] },
  { slug: "application-development", title: "Web & Mobile Applications", icon: "phone",
    summary: "Web and mobile applications for businesses and organizations.",
    problem: "Manual or paper-based processes slow teams down and make growth harder to manage.",
    what: "We scope and build web and mobile applications that digitize a defined process or serve a defined audience.",
    items: ["Web applications", "Mobile application development", "User accounts and dashboards", "Ongoing improvement planning"] },
  { slug: "ecommerce", title: "E-Commerce Solutions", icon: "cart",
    summary: "Online stores that are straightforward for customers to use and for you to manage.",
    problem: "Selling online needs more than a product list: catalogue, ordering, and reliable follow-up.",
    what: "We set up online stores and ordering flows suited to your products and the payment options available to you.",
    items: ["Store setup and catalogue structure", "Order and inquiry flows", "Payment integration where required", "Store management guidance"] },
  { slug: "internet-services", title: "Internet-Related Services", icon: "cloud",
    summary: "Domains, hosting and web infrastructure support for getting and staying online.",
    problem: "Setting up domains, hosting and email can be confusing and easy to get wrong.",
    what: "We help organizations choose and configure the web infrastructure their website or application needs.",
    items: ["Domain and DNS setup", "Hosting selection and deployment", "Business email configuration", "Basic security hygiene"] },
  { slug: "digital-products", title: "Digital Products & Technology Solutions", icon: "gear",
    summary: "Digital tools, platforms and technology solutions for business processes.",
    problem: "Businesses often know the outcome they want but not which technology fits.",
    what: "We help define, build and support digital products and technical solutions, including technical consulting where it is a good fit.",
    items: ["Solution discovery", "Digital product planning", "Technical consulting", "Support planning"] },
];

export const faqs = [
  { q: "What does Cloud Edge do?", a: "Cloud Edge Technology Services Limited is a Nigerian technology and e-commerce company focused on software, web and mobile application development, internet-related services, digital products and technology solutions." },
  { q: "How do I start a project?", a: "Send a project inquiry using the quote form, describing what you need. We will respond to discuss scope and next steps." },
  { q: "Do I need to know my budget?", a: "No. The budget field is optional. A rough range helps us suggest a realistic approach, but you can leave it blank." },
  { q: "Where are you located?", a: "Our registered address is Suite 306B, Samfa Plaza, Ndola Crescent, Wuse Zone 5, Abuja, FCT, Nigeria." },
  { q: "Do you work with clients outside Nigeria?", a: "We welcome inquiries from Nigerian and international clients. Send the details of your project and we will discuss what is practical." },
  { q: "Can you give a fixed price immediately?", a: "Pricing depends on scope. We prefer to understand your requirements first, then discuss costs." },
];

export const inquiryTypes = ["General inquiry", "Software development", "Website design & development", "Web or mobile application", "E-commerce solution", "Internet-related services", "Digital product or technology solution", "Partnership", "Other"];
export const budgetRanges = ["Prefer not to say", "Under ₦500,000", "₦500,000 – ₦2,000,000", "₦2,000,000 – ₦5,000,000", "Above ₦5,000,000", "Not sure yet"];
