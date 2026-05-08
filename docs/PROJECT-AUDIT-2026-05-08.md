# Project audit - May 8, 2026

Scope: root docs, `docs/`, `site/README.md`, deployment docs, worker docs,
roadmap config, static-site contracts, and package/config files.

## Current status

- Production story is Vercel-first: `vercel.json` serves `site/`, `main`
  deploys to production, and active APIs live in `api/`.
- Cloudflare Pages and Workers remain as fallback/deferred infrastructure.
- The Linear/GitHub delivery map is active in
  `ops/roadmap/features.json` and checked by `npm run eval`.
- GitHub Actions runs the same eval gate on PRs and pushes to `main`.

## Fixed in this audit pass

- Labeled `DEPLOYMENT.md`, `site/README.md`, `wrangler.toml`, and
  `worker/submissions/README.md` so Cloudflare cannot be mistaken for the
  active production path.
- Added missing Cloudflare fallback clean-URL aliases for widget pages in
  `site/_redirects`.
- Extended `scripts/eval.mjs` with a widget-contract check for clean aliases,
  widget JS/CSS includes, header route drift, and widget data fetches.
- Extended `scripts/eval.mjs` again to check non-widget clean URL aliases and
  `/data/*.json` literals across all `site/js/` controllers.
- Updated roadmap docs that still claimed `npm run eval` was missing.
- Marked the root `SESSION-HANDOFF.md` as historical talk-day state.
- Standardized the Cloudflare fallback submissions secret on `NOTION_TOKEN`.
- Updated public Release Day/recap copy to describe the production
  submissions path as a Vercel function.
- Marked `companion-site/` as historical and clarified current talk/deck
  sources in the README.
- Aligned Cloudflare fallback CSP with Vercel's active CSP.
- Regenerated `site/data/decisions.json` after handoff cleanup.
- Surfaced the Conductor widget in the header and home Make section.
- Added fallback clean-URL aliases for recap, signal, and photo gallery pages.
- Normalized active nav state for clean URLs and `.html` URLs.
- Allowed microphone access for the local Voice Booth widget while keeping
  camera and geolocation disabled.

## Remaining blockers

- `BC-51` / GitHub #135: live Release Day submission smoke test still needs
  the right Vercel/Notion environment and permission to send a test payload.
- `BC-52` / GitHub #136: Adobe involvement and recording rights require a
  human answer before copy can be finalized.
- `BC-55` / GitHub #138: browser/Lighthouse evidence is still a separate QA
  pass.
- `BC-56` / GitHub #139: Pattern Finder is decision-ready as fallback-only
  for Release Day; a future live backend still needs explicit hosting/API,
  model-budget, rate-limit, privacy, and abuse-control acceptance.

## Verification

- `npm run build:decisions`
- `npm run eval`
