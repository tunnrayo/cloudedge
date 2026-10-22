/** Writes docs/CATALOGUE.md (imported products, prices and sale-readiness) and docs/database/schema.sql.  Run: npm run catalogue:report */
import { writeFileSync } from "node:fs";
import { catalogue, sellingPrice, FX_RATE_NGN_PER_USD, MARKUP_NGN, CATALOGUE_DATE } from "../src/content/catalogue.ts";
import { MIGRATIONS } from "../src/lib/migrations.ts";

const n = (v: number) => "₦" + v.toLocaleString("en-NG");
const per: Record<string, string> = { month: "/month", year: "/year", one_time: "one-time", term: "per term" };
const rows = catalogue.map((p) => {
  const price = sellingPrice(p.ref);
  const docNote = price !== p.listedPrice ? ` (doc: ${n(p.listedPrice)})` : "";
  const ver = p.verification === "verified" ? "Re-checked ✓" : p.verification === "needs_verification" ? "**Needs verification**" : "Per catalogue";
  return `| ${p.sku} | ${p.name} | ${p.category} | ${p.ref.label} | ${n(price)} ${per[p.billing]}${docNote} | ${ver} | [${p.ref.sourceName}](${p.ref.sourceUrl}) |`;
}).join("\n");
const needs = catalogue.filter((p) => p.verification === "needs_verification").map((p) => `- **${p.sku} ${p.name}** — ${p.verificationNote}`).join("\n");
writeFileSync("docs/CATALOGUE.md", `# Product catalogue (imported ${CATALOGUE_DATE})

${catalogue.length} products from the two supplied Word documents, combined into one catalogue and imported into the database on first start.
Pricing rule (from the documents): USD reference × ₦${FX_RATE_NGN_PER_USD.toLocaleString("en-NG")} + ₦${MARKUP_NGN.toLocaleString("en-NG")}; NGN reference + ₦${MARKUP_NGN.toLocaleString("en-NG")}; rounded to the nearest naira.
₦${FX_RATE_NGN_PER_USD} per US$1 was checked against the official NFEM rate (₦1,332.47 on 13 Oct 2026) and kept.

**Where the document's printed price differed from its own formula, the formula price is used** and the document price is shown in brackets.
Differences of ₦1 are rounding (one document truncated, the other rounded). Larger differences are arithmetic errors in the document and those products are flagged.

## How these products are offered (manual sourcing, since v0.4.0)
Every published product can be **requested**; none is sold directly. Catalogue prices are shown as **indicative**.
Cloud Edge sources eligible software products through external suppliers; after a request, the admin records the supplier's
real quotation (cost, currency, exchange rate, fees, taxes, delivery, margin) and sends the customer a quotation. The customer
pays only after accepting it. Resale/partner status is unconfirmed for all ${catalogue.length} products and is never claimed on the website.

The ${catalogue.filter((p) => p.verification === "needs_verification").length} products below show a "Price under review" note, because their indicative price is less reliable.
To stop new requests for a product, mark it **Unavailable** in Admin → Products.

## Products whose price needs verification
${needs}

## Full list
| SKU | Product | Category | Reference price (source) | Indicative price | Price check | Source |
|---|---|---|---|---|---|---|
${rows}
`);

writeFileSync("docs/database/schema.sql", `-- Cloud Edge website — full database schema (PostgreSQL).
-- Generated from src/lib/migrations.ts and src/lib/inquiries.ts by: npm run catalogue:report
-- The website applies these automatically on first start; running this file by hand (npm run db:setup) is optional.

${MIGRATIONS.map((m) => `-- Migration ${m.id}: ${m.name}\n${m.sql.trim()}`).join("\n\n")}

-- Contact / quote inquiries (managed by src/lib/inquiries.ts)
CREATE TABLE IF NOT EXISTS inquiries (
  id            UUID PRIMARY KEY,
  reference     VARCHAR(16)  NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  status        VARCHAR(20)  NOT NULL DEFAULT 'new',
  notes         TEXT         NOT NULL DEFAULT '',
  email_status  VARCHAR(20)  NOT NULL DEFAULT 'not_configured',
  mode          VARCHAR(10)  NOT NULL,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(200) NOT NULL,
  phone         VARCHAR(30)  NOT NULL DEFAULT '',
  organization  VARCHAR(150) NOT NULL DEFAULT '',
  type          VARCHAR(80)  NOT NULL,
  budget        VARCHAR(60)  NOT NULL DEFAULT '',
  timeline      VARCHAR(60)  NOT NULL DEFAULT '',
  scope         TEXT         NOT NULL DEFAULT '',
  message       TEXT         NOT NULL DEFAULT '',
  product       VARCHAR(80)  NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS inquiries_created_at_idx ON inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS inquiries_status_idx ON inquiries (status);
`);
console.log("Wrote docs/CATALOGUE.md and docs/database/schema.sql");
