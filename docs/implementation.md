# Raumplaner Implementation Plan
Goal: Private German photo furniture planner on mobile and desktop.
Architecture: React/TypeScript/react-konva client, Cloudflare ESM Worker, D1, R2 and SerpApi.
Approved spec: room photos, manual editor with crop/erase, shopping links, category and whole-room budgets, cloud persistence, PNG/CSV exports. EUR/DE, default €400.
Tasks:
- [ ] Budget/data validation + tests (src/model.ts, tests/model.test.ts)
- [ ] Authenticated persistence, image storage, metadata import and quota-limited search (server/*, tests/server.test.ts)
- [ ] Responsive React UI, editor, autosave/conflicts and exports (src/*)
- [ ] Verification, independent review, packaging and private deployment.
Review focus: missing prices/shipping, same item in multiple scenes, blocked imports/SSRF, cross-device conflicts, image ownership/exports.
Ruling: Installed Sites starter and helper scripts are absent, verified filesystem and cloud resource paths. Use portable React/esbuild + Worker ESM artifact supported by Sites; no Vinext-specific runtime required. Same user-visible capabilities.

Progress:
- Budget/data validation implemented; integer cents, incomplete total handling, distinct project items from photo placements.
- Worker API, owner scopes, D1/R2, JSON-LD/OG imports and quota-guarded search implemented.
- React UI, touch editor, crop/erase, cloud autosave, PNG/CSV implemented.
- Unit checks: 17 passed. TypeScript and production bundle pass.
- Browser smoke: uploads, product image, placement, amount/quantity, autosave, reopening, PNG export and 390px mobile layout passed without runtime errors.
- Independent review: blank metadata image/title, blank prices, deletion/undo history, concurrent navigation saves identified and corrected. Targeted tests cover price parsing, persistence draining, deletion history and conflict recovery.
- Live SerpApi calls unverified: no user API key configured. Manual product workflow works without it.
- No existing project/branch modified: repository newly initialized at the requested destination.

## Revision: no external search API (2026-11-15)
User requested a solution without APIs. Removed the SerpApi dependency and key-gated search. Explicit search creates public Google Shopping/IKEA/OTTO/Amazon links; products are added via manual form and optional keyless HTML metadata import online.
Added self-contained HTML build and IndexedDB/file-image adapter for file: or ?offline=1. No server/API needed for local photo planning; backup JSON embeds images and can be restored. Existing cloud projects remain in the original protected DB/R2 storage.
Verification: 20 unit tests, TypeScript and production build pass. Standalone HTML browser test via intercepted localhost with network disabled passed all editing/storage/export/backup/restore/mobile checks, with zero external/API requests after initial document load. Direct file: execution could not be verified because Chromium policy blocks file URLs in this environment.
Review fixes: backup URLs and missing layer references now rejected; external web-font import removed entirely so the standalone stylesheet remains valid and self-contained.

## Direct visual insertion revision
Automatic browser-only flat-background removal and alpha crop on product save; preserve original image, aspect ratio, default floor-oriented placement and soft shadow. Auto-add new products to current photo and selected products to new photos. Appearance sliders for shadow, brightness and shear; before/after toggle; PNG persists same rendering.
Targeted tests cover enclosed white details, conservative all-white fallback and aspect-aware placement. Chromium test creates clearly named synthetic room/cabinet fixtures and verifies automatic insertion, cutout dimensions, original retained, filter/shadow interaction, export and reload. No external image/AI API.
