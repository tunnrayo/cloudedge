/**
 * Generates one distinct product image (SVG, 800×600) per catalogue product, plus the image manifest.
 *
 *   npm run images:generate
 *
 * Images are built from OFFICIAL BRAND LOGOS taken from open-licence logo packages
 * (@iconify-json/logos — CC0; simple-icons — CC0; @iconify-json/vscode-icons — MIT), combined with
 * the product's real name and plan details. No AI-generated imagery, no fake screenshots.
 * Logos remain trademarks of their owners and are shown only to identify the product.
 * Brands without an available logo get a clearly labelled typographic placeholder.
 *
 * Output: public/products/<slug>.svg, docs/product-image-manifest.json, docs/PRODUCT_IMAGES.md
 */
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { catalogue, type Logo, type SeedProduct } from "../src/content/catalogue.ts";

const require = createRequire(import.meta.url);
const LOGOS = require("@iconify-json/logos/icons.json");
const VSCODE = require("@iconify-json/vscode-icons/icons.json");
type SimpleIcon = { slug: string; path: string; hex: string };
const SI_LIST = Object.values(require("simple-icons") as Record<string, unknown>).filter((x): x is SimpleIcon => typeof x === "object" && x !== null && "slug" in x);
type ManifestEntry = { sku: string; slug: string; product: string; image: string; sha256: string; kind: string; logoSource: string | null; logoLicence: string | null; includedAppIcons: string[]; trademarkNote: string; verification: string };

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "public", "products");
mkdirSync(OUT, { recursive: true });

// Brand accent colours (simple-icons supplies its own hex; these are for multi-colour logo-set brands).
const TINT: Record<string, string> = {
  Microsoft: "#0067B8", Google: "#1A73E8", Adobe: "#FA0F00", Zoom: "#0B5CFF", Slack: "#4A154B", Notion: "#111111",
  GitHub: "#24292F", JetBrains: "#000000", Figma: "#F24E1E", Grammarly: "#15C39A", Todoist: "#E44332", Atlassian: "#0052CC",
  Webflow: "#146EF5", Descript: "#111111", Loom: "#625DF5", DigitalOcean: "#0080FF", Cloudflare: "#F38020", Postman: "#FF6C37",
  Docker: "#2496ED", Vercel: "#000000",
};
const NAVY = "#0a1f4d";

type Glyph = { body: string; w: number; h: number; source: string; licence: string };
function glyph(l: Logo): Glyph | null {
  if (l.set === "logos" || l.set === "vscode") {
    const pack = l.set === "logos" ? LOGOS : VSCODE;
    const ic = pack.icons[l.icon!];
    if (!ic) throw new Error(`Missing icon ${l.set}:${l.icon}`);
    return { body: ic.body, w: ic.width ?? pack.width ?? 16, h: ic.height ?? pack.height ?? 16,
      source: l.set === "logos" ? `@iconify-json/logos "${l.icon}" (gilbarbara/logos)` : `@iconify-json/vscode-icons "${l.icon}"`,
      licence: l.set === "logos" ? "CC0-1.0" : "MIT" };
  }
  if (l.set === "si") {
    const ic = SI_LIST.find((x) => x.slug === l.icon);
    if (!ic) throw new Error(`Missing simple-icon ${l.icon}`);
    return { body: `<path fill="#${ic.hex}" d="${ic.path}"/>`, w: 24, h: 24, source: `simple-icons "${l.icon}"`, licence: "CC0-1.0" };
  }
  return null;
}
function siHex(l: Logo) {
  if (l.set !== "si") return null;
  const ic = SI_LIST.find((x) => x.slug === l.icon);
  return ic ? `#${ic.hex}` : null;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// Unique ids per file so inline SVG ids can never clash.
const scopeIds = (body: string, prefix: string) => body.replace(/id="([^"]+)"/g, `id="${prefix}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`).replace(/href="#([^"]+)"/g, `href="#${prefix}$1"`);

function place(g: Glyph, x: number, y: number, maxW: number, maxH: number, prefix: string) {
  const s = Math.min(maxW / g.w, maxH / g.h);
  const w = g.w * s, h = g.h * s;
  return `<g transform="translate(${(x - w / 2).toFixed(1)} ${(y - h / 2).toFixed(1)}) scale(${s.toFixed(4)})">${scopeIds(g.body, prefix)}</g>`;
}

function wrap(text: string, max: number): string[] {
  const words = text.split(" "); const lines: string[] = []; let cur = "";
  for (const w of words) { if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}
const textWidth = (s: string, size: number) => s.length * size * 0.56;

function render(p: SeedProduct, i: number) {
  const accent = siHex(p.logo) ?? TINT[p.brand] ?? NAVY;
  const id = `p${i}`;
  const main = glyph(p.logo);
  const parts: string[] = [];
  parts.push(`<defs><linearGradient id="${id}bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f1f5fb"/></linearGradient><radialGradient id="${id}glow" cx="0.5" cy="0.32" r="0.42"><stop offset="0" stop-color="${accent}" stop-opacity="0.10"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient></defs>`);
  parts.push(`<rect width="800" height="600" fill="url(#${id}bg)"/>`);
  parts.push(`<rect width="800" height="600" fill="url(#${id}glow)"/>`);
  parts.push(`<rect x="0" y="0" width="800" height="10" fill="${accent}"/>`);
  parts.push(`<text x="40" y="56" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="3" fill="#55657f">${esc(p.category.toUpperCase())}</text>`);
  parts.push(`<text x="760" y="56" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#8a97ad">${esc(p.sku)}</text>`);

  if (main) parts.push(place(main, 400, 185, 300, 150, `${id}m`));
  else parts.push(`<text x="400" y="210" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="78" font-weight="700" fill="${NAVY}">${esc(p.brand)}</text>`);

  const lines = wrap(p.name, 30);
  const nameY = lines.length === 1 ? 335 : 318;
  lines.forEach((ln, k) => parts.push(`<text x="400" y="${nameY + k * 46}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="700" fill="${NAVY}">${esc(ln)}</text>`));

  // Plan chips
  const chipY = 412, size = 20, padX = 18, gap = 12;
  const widths = p.chips.map((c) => textWidth(c, size) + padX * 2);
  let x = 400 - (widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1)) / 2;
  p.chips.forEach((c, k) => {
    parts.push(`<rect x="${x.toFixed(1)}" y="${chipY}" width="${widths[k].toFixed(1)}" height="40" rx="20" fill="#ffffff" stroke="${accent}" stroke-opacity="0.45" stroke-width="1.5"/>`);
    parts.push(`<text x="${(x + widths[k] / 2).toFixed(1)}" y="${chipY + 27}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="700" fill="${NAVY}">${esc(c)}</text>`);
    x += widths[k] + gap;
  });

  // Included-app icons (official app icons) for suites
  const apps = (p.apps ?? []).map(glyph).filter(Boolean) as Glyph[];
  if (apps.length) {
    const s = 54, g = 22, total = apps.length * s + (apps.length - 1) * g;
    apps.forEach((a, k) => parts.push(place(a, 400 - total / 2 + s / 2 + k * (s + g), 510, s, s, `${id}a${k}`)));
  }

  const foot = main ? `${p.brand} logo is a trademark of its owner. Shown to identify the product.` : `Illustration: typographic placeholder (no official ${p.brand} logo available).`;
  parts.push(`<text x="40" y="580" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#8a97ad">${esc(foot)}</text>`);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 800 600" width="800" height="600" role="img" aria-label="${esc(`${p.name} — ${p.brand}`)}">${parts.join("")}</svg>\n`;
  return { svg, main, apps };
}

const manifest: ManifestEntry[] = [];
const hashes = new Map<string, string>();
catalogue.forEach((p, i) => {
  const { svg, main, apps } = render(p, i);
  const file = `/products/${p.slug}.svg`;
  writeFileSync(path.join(OUT, `${p.slug}.svg`), svg);
  const hash = createHash("sha256").update(svg).digest("hex");
  if (hashes.has(hash)) throw new Error(`Duplicate image for ${p.slug} and ${hashes.get(hash)}`);
  hashes.set(hash, p.slug);
  manifest.push({
    sku: p.sku, slug: p.slug, product: p.name, image: file, sha256: hash,
    kind: main ? "official-brand-logo-card" : "typographic-placeholder",
    logoSource: main ? main.source : null, logoLicence: main ? main.licence : null,
    includedAppIcons: apps.map((a) => a.source),
    trademarkNote: `${p.brand} names and logos are trademarks of their respective owners; used only to identify the product.`,
    verification: main ? "Logo matches the named brand (checked by icon slug). Not an official product box shot or screenshot." : "No official logo available offline — placeholder must be replaced with an approved image.",
  });
});

writeFileSync(path.join(ROOT, "docs", "product-image-manifest.json"), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), count: manifest.length, images: manifest }, null, 2) + "\n");
const rows = manifest.map((m) => `| ${m.sku} | ${m.product} | \`${m.image}\` | ${m.kind === "official-brand-logo-card" ? "Brand logo card" : "**Placeholder — replace**"} | ${m.logoSource ?? "—"} (${m.logoLicence ?? "—"}) |`).join("\n");
writeFileSync(path.join(ROOT, "docs", "PRODUCT_IMAGES.md"), `# Product image manifest

${manifest.length} products, ${manifest.length} distinct images (duplicate check by SHA-256 passed).

**What these images are:** each image combines the product's **official brand logo** (from open-licence logo packages) with the product's real name, plan details and — for suites — the official icons of the included apps. They are not photographs, box shots or screenshots, and they are not AI-generated.

**Why not photos?** These are digital subscriptions with no physical product. Vendor box shots and screenshots are copyrighted marketing material usually licensed only to authorised partners, and the build environment cannot download from vendor websites. When you obtain approved images (for example from a vendor's partner/press kit after becoming an authorised reseller), upload them in **Admin → Products → Edit → Image**; uploads are stored in the database and replace these images.

**Trademarks:** all product names and logos belong to their owners and are used only to identify the products sold.

Regenerate with \`npm run images:generate\` (only needed if the catalogue seed changes).

| SKU | Product | File | Type | Logo source (licence) |
|---|---|---|---|---|
${rows}
`);
console.log(`Generated ${manifest.length} images; ${manifest.filter((m) => m.kind !== "official-brand-logo-card").length} placeholders.`);
