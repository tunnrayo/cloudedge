# Handover (for a new Claude account)
Upload this folder (or zip), say: "Continue the Cloud Edge website; read HANDOVER.md and PROJECT_STATUS.md first. Do not rebuild."
- Original brand files: `assets-original/` (logo sheet, homepage mockup). Crops used by the site: `public/brand/` and `src/app/icon.png`, `apple-icon.png`. Never replace with generated logos.
- Structure: `src/lib/site.ts` (all content/config), `src/lib/validate.ts` (shared client+server validation), `src/app/api/inquiry/route.ts` (email send), `src/components/`, `src/app/<page>/page.tsx`.
- Company facts are fixed: Cloud Edge Technology Services Limited, RC 9922715, Suite 306B, Samfa Plaza, Ndola Crescent, Wuse Zone 5, Abuja, FCT, Nigeria, CLOUDEDGETECHSERVICES@GMAIL.COM. Do not invent phones, clients, projects, awards.
- Decisions: no database/auth/admin (not needed); no external fonts (system stack); Solutions replaces separate Products nav item.
- Remaining work: see PROJECT_STATUS.md. Shell note: sandbox `sh` lacks brace expansion; create folders explicitly.
