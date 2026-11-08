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
