# Changelog

## 0.2.0 (2026-10-21)
- **Security:** upgraded Next.js 15.5.4 → 16.4.2 and React 19.3 (fixes published advisories); added Content-Security-Policy and HSTS; 0 production vulnerabilities.
- **Design:** full premium redesign based on the supplied mockup — hero illustration around the approved icon, trust strip, services grid, business-value section, about band, process, FAQ, CTA band, new footer; bundled Poppins/Inter fonts.
- **Pages:** new Products catalogue (category filter) + product detail pages; Portfolio now in the menu with labelled demo concepts; new Search page; About, Services (now 8, incl. Mobile App Development and Technology Consulting), Solutions, Contact, Quote, FAQ, Privacy, Terms and 404 rebuilt.
- **Backend:** inquiries stored in PostgreSQL (local file in development) with reference numbers; email notifications optional; honest failure messages.
- **Admin:** password-protected `/admin` with list, search, filters, detail, status, notes, delete, CSV export.
- **Forms:** optional phone, timeline, product reference; improved validation and accessibility.
- **SEO:** per-page canonical URLs, Open Graph image, FAQ structured data, updated sitemap/robots.
- **Docs:** new DEPLOYMENT.md, database schema, railway.json, `npm run check`, `npm run db:setup`.
- **Fixes:** removed a stray `src/app/{about,services…}` folder; official email updated to CLOUDEDGETECHNOLOGYSERVICES@GMAIL.COM (latest brief).

## 0.1.0 (2026-10-20)
Initial build: design system, all pages, inquiry API with validation and Resend email, SEO files, security headers, tests, documentation.
