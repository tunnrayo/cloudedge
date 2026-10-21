# Brand Guidelines (website)

## Logo
- Source files: `assets-original/CloudEdge_Logo_Variants.png` (supplied sheet: full logo + app icon) and the homepage mockup.
- Website crops: `public/brand/logo-full.png` (full logo, transparent background, for light backgrounds), `public/brand/icon-512.png` (app icon), `src/app/icon.png` (favicon 64px), `src/app/apple-icon.png` (180px).
- `public/brand/og-image.png` (social sharing) = the full logo on a white panel over a navy background. No artwork altered.
- Do not recolour, redraw, stretch or replace the logo. **On dark backgrounds** place the full logo on a white rounded panel (as in the footer) — a white-text version was not supplied. Ask the designer for one if needed.
- Hero illustration: drawn in code around the approved icon (floating service icons, network lines), inspired by the mockup.

## Colours (approximated from the logo/mockup — replace with official codes if supplied, in `src/app/globals.css` `:root`)
| Token | Hex | Use |
|---|---|---|
| Deep navy 950 / 900 | `#040d24` / `#061433` | Hero, footer, dark sections |
| Navy (primary) | `#0a1f4d` | Headings, text on light |
| Electric blue | `#0b66f5` (hover `#0857d4`) | Buttons, links, icons |
| Cyan | `#19c3ff` (light `#7fdcff`) | Highlights on dark backgrounds, focus ring |
| Silver | `#c6d0de` | Optional supporting |
| Soft background | `#f3f7fd` | Alternating sections |
| Lines | `#dde6f3` | Borders |
| Muted text | `#55657f` | Body copy on light |
| Amber (notice) | `#fff6df` / `#5d4500` | "Sample" / "Draft" notices only |

Text contrast: body text and links meet WCAG AA on their backgrounds.

## Typography
- Headings: **Poppins** 500/600/700. Body: **Inter** (variable). Both bundled with the site (no Google request).
- Scale: H1 2.1–4rem (fluid), H2 1.6–2.35rem, H3 1.15rem, body 1rem / 1.65.

## Components
- Buttons: pill shape, 48px tall (42px small). Primary = electric blue; outline; light (on dark).
- Cards: white, 14px radius, 1px border, soft shadow; hover lifts 3px.
- Icons: 24px line icons in a soft blue tile (`src/components/Icon.tsx`).
- Eyebrow labels: uppercase, letter-spaced, blue (cyan on dark).
- Badges: "Sample listing" / "Demo concept" (amber) must always appear on sample/demo items.
- Motion: subtle float on hero icons only; disabled for users who prefer reduced motion.

## Product images (shop)
- Generated per product by `npm run images:generate`: white 800×600 tile, brand accent bar, category + SKU, **official brand logo**, product name, plan chips and (for suites) official app icons. Footnote states the logo is the owner's trademark.
- Brands with no available logo get a typographic placeholder labelled as such — replace with an approved image.
- Uploaded images (Admin → Products) replace generated ones. Use only images you have the right to use.
