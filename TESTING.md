# Testing (run 2026-10-20)
| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm run build` | Pass (all routes generated) |
| `npm test` (6 validation tests) | 6/6 pass |
| 16 routes via production server | 200 (unknown path 404) |
| Internal links (20 found on 11 pages) | 0 broken |
| Official email/address/RC on Contact | Present |
| API: invalid 422, bad JSON 400, honeypot 200 (dropped), unconfigured 503, 6th request 429 | As expected |
| Secret scan of build/public/src | None found |
Not run: browser responsive inspection, keyboard/screen-reader checks, Lighthouse, real email delivery, deployment, `npm audit` review.
