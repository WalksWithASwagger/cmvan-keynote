# Technical Debt Modernization Plan - May 24, 2026

Scope: grounded technical debt audit of the `cmvan-keynote` / `punkrockai.com`
repo as inherited today. This plan assumes the working product is valuable and
should be stabilized incrementally, not rewritten.

Evidence checked in this pass:

- Local branch: `codex/documentation-reliability-closeout`, with open draft PR
  #146 on GitHub and one open GitHub issue, #135.
- Repo shape: 1,450 tracked files; `site/` dominates the repository with 12
  top-level pages, 33 widget HTML pages, 45 widget JS files, 45 widget CSS
  files, and 34 JSON data manifests.
- Runtime architecture: static Vercel site from `site/`, Vercel functions in
  `api/`, Cloudflare Pages/Workers retained as fallback/deferred infrastructure.
- Verification run: `npm run check`, `npm run eval`,
  `python3 -m pytest tests/agentic`, `npm audit --audit-level=moderate`,
  `npm outdated`, GitHub issue/PR list, dependency and source scans,
  line-count and asset-size checks.
- Immediate fixes made during the audit: removed a hardcoded ElevenLabs-looking
  API key from `dress-rehearsal/generate-audio.py`, updated audio-generator docs
  to require `ELEVENLABS_API_KEY`, fixed the `fast-uri` audit finding via the
  lockfile, corrected stale `site/README.md` architecture wording, added a full
  `npm run check` gate, aligned CI to that gate, added local newsletter smoke
  coverage, added timestamp/honeypot bot friction for public forms, removed
  Cloudflare placeholder worker redirects, and shortened JS/CSS cache headers.

# Executive Summary

## Overall system assessment

This is not a broken repo. It is a fast-grown, AI-assisted static product with
surprisingly good late-stage guardrails. The core architectural choice is
reasonable: a zero-runtime-dependency static site, JSON data manifests, small
Vercel functions for active APIs, and a local `npm run eval` gate that checks
syntax, JSON, roadmap metadata, routes, widget contracts, Vercel config, Release
Day smoke behavior, and maintained doc links.

The debt is not "we need a framework." The debt is that product, content
archive, generated media, fallback infrastructure, and agentic delivery tooling
now live in one repo without strong enough boundaries. The system still works,
but future maintainers need clearer publication gates, fewer duplicated widget
patterns, tighter public API protection, and a CI surface that matches the local
confidence surface.

## Core risks

- Public API abuse: active Vercel functions (`api/submissions.js`,
  `api/subscribe.js`) now have low-friction timestamp/honeypot bot guards, but
  still do not have durable rate limiting, provider-level bot challenges, or
  alerting.
- Secret hygiene: a committed hardcoded ElevenLabs-style key was removed during
  this audit, but the key should still be rotated because repository history may
  contain it.
- Publication boundary risk: `scripts/build-library-index.mjs` indexes source
  material and research into the public `site/data/library.json`, including body
  excerpts from 93 docs, 83 of them from `source-material`.
- Deployment drift: Vercel is production, Cloudflare is fallback; placeholder
  worker proxy URLs have been removed from `site/_redirects` and `npm run eval`
  now fails on placeholder deployment config.
- Cache correctness: JS/CSS now use short revalidated cache headers; keep
  one-year immutable caching only for assets that are safe to treat as stable,
  or add content hashing before expanding immutable cache again.
- CI parity: GitHub `eval.yml` now runs `npm run check`, which wraps the
  static-site eval, full markdown link check, agentic Python tests, Python
  compile check, and dependency audit.

## Highest-priority concerns

1. Rotate the exposed ElevenLabs key and close the draft PR with the secret
   removal and audit fix.
2. Add durable rate limiting or provider-level bot challenges for
   `/api/submissions` and `/api/subscribe` before any larger Release Day push.
3. Replace implicit publication of all source material with an allowlist or
   explicit `public: true` metadata.
4. Decide whether Cloudflare fallback is actively maintained or parked; do not
   let placeholder worker routes become an accidental production path.

## Immediate recommendations

Keep the static architecture. Do not migrate to Next.js or React for taste or
fashion reasons. The next modernization slice should be containment: secrets,
public API abuse controls, publication boundaries, CI parity, and cache policy.
Only after that should the team standardize widget internals and data schemas.

# Key Findings

## Major technical debt areas

- Architecture is coherent but crowded. `site/` is the product, `source-material/`
  is a content archive, `scripts/` is the build/data pipeline, `api/` is active
  production backend, `worker/` is fallback/deferred backend, and `scripts/agentic`
  is autonomous delivery infrastructure. The directories are named, but their
  risk boundaries are still too soft.
- Widget implementation is intentionally vanilla, but every widget is its own
  micro-application. That preserves momentum but creates duplicated DOM,
  escaping, state, reset, and fetch patterns.
- `scripts/eval.mjs` is valuable but becoming a compact "god gate." It is
  already 400+ lines and owns many unrelated contracts.
- The public library index is a hidden publishing pipeline. It is useful for
  search, but it currently assumes broad source directories are safe to expose.
- Agentic automation is well-gated by labels, issue shape, diff limits, and
  `npm run eval`, but it carries write permissions and a shell-command provider.

## Architectural concerns

- The Vercel-first / Cloudflare-fallback split is documented, but duplicated
  routing and security config means future changes can drift. `vercel.json` and
  `site/_headers` currently mirror each other by convention, not by a shared
  generator.
- `site/js/common/header.js` combines analytics bootstrap, partial includes,
  nav activation, lazy nav import, and newsletter form behavior. It is still
  small, but it is becoming a hidden cross-site coupling point.
- `api/submissions.js` is coupled directly to the Notion database schema and
  has no shared validation layer with the fallback Cloudflare worker.
- `site/data/*.json` is the real application contract, but most manifests are
  parse-checked rather than schema-checked.

## Security and operational risks

- The hardcoded audio-generation secret has been removed from the working tree.
  Rotate the key anyway; a code fix does not clean git history or external
  exposure.
- Public endpoints can be hit directly by non-browser clients. CORS helps the
  browser UX; it is not an abuse-control system.
- `api/subscribe.js` now returns generic upstream errors to the client and logs
  operator detail server-side. Keep this pattern for future public APIs.
- `worker/pattern-finder/index.js` is sensibly marked fallback-only, rate-limited,
  and cached, but activating it would introduce live LLM budget, privacy, prompt
  injection, and moderation concerns.
- `site/data/library.json` exposes searchable excerpts. That is a publishing
  decision, not just a technical optimization.

## Developer experience problems

- `npm run check` is now the full current standard; keep new checks wired into
  that command rather than asking agents to remember a checklist.
- GitHub CI now runs `npm run check`, including Python tests.
- Node 22 is pinned in `.nvmrc`, and package metadata requires Node >=22.
- There is no formatter/linter. That is tolerable for a small vanilla site, but
  the current widget count makes style drift likely.
- `npm outdated` shows `@aws-sdk/client-s3` behind patch releases and `sharp`
  behind a major release. Neither requires emergency work after the audit fix,
  but dependency checks should be routine.

## Maintainability issues

- There are many copied `escapeHTML` / `escapeAttr` helpers. This is better
  than unsafe rendering, but the copy-paste pattern will eventually diverge.
- Large widget modules (`selector.js`, `word-ban.js`, `receipt.js`, `sig.js`,
  `mastery-gym.js`, `detournement.js`, `posse-builder.js`) are manageable today
  but should be refactored by behavior, not by line-count vanity.
- Generated data and source material coexist with hand-authored public data.
  The repo needs clearer "source", "generated", and "published" boundaries.
- Immutable caching on un-hashed JS/CSS paths can make production bugfixes look
  deployed while browsers keep old files.

# Prioritized Technical Debt Inventory

| Priority | Area | Observed repo reality | Risk | Practical fix |
| --- | --- | --- | --- | --- |
| P0 | Secrets | One hardcoded ElevenLabs-style key was present in `dress-rehearsal/generate-audio.py`; code now reads `ELEVENLABS_API_KEY`. | Credential may still be valid from history. | Rotate/revoke key; keep secrets only in env/secret stores; add a secret scan to CI. |
| P0 | Public APIs | `api/submissions.js` and `api/subscribe.js` validate shape and now have timestamp/honeypot guards, but no durable rate limit. | Spam, vendor abuse, quota burn, noisy Notion/Beehiiv data. | Add Turnstile or provider-level rate limiting before a larger public push. |
| P0 | Production smoke | GitHub issue #135 remains open for Release Day submissions E2E. | Public CTA can appear live while persistence is broken. | Share Notion DB with integration, run valid POST smoke, record proof, clean test row. |
| P0 | Cache policy | `/css` and `/js` now use short revalidated cache headers; `/public` remains long-cache. | Stale browsers if stable filenames are re-used for long-cache assets. | Add content hashing before expanding immutable caching again. |
| P1 | CI parity | CI now runs `npm run check`; agentic loop still uses the faster `npm run eval`. | Agentic runner may miss full-check issues until PR CI. | Keep agentic loop fast, but rely on PR CI for full merge confidence. |
| P1 | Publication boundary | Library build indexes broad source dirs into public JSON. | Draft/private/rights-sensitive text can ship accidentally. | Add allowlist/frontmatter, default-deny source indexing, and a publication diff report. |
| P1 | Deployment drift | Placeholder Cloudflare worker proxy lines were removed from `_redirects`; eval now checks deployment config placeholders. | Fallback activation still needs an intentional API decision. | Keep worker proxy routes absent until real deployment URLs exist. |
| P1 | API validation | Vercel and Cloudflare submissions paths duplicate related validation. | Behavior diverges between active and fallback paths. | Extract tiny shared validation rules or generate tests against both handlers. |
| P2 | Widget consistency | 45 widget JS files and 45 CSS files use repeated patterns. | Inconsistent UX, a11y, escaping, reset, and storage behavior. | Add common DOM/render helpers and a widget contract checklist; migrate two widgets at a time. |
| P2 | Data contracts | JSON manifests are parse-checked but mostly not schema-checked. | Broken UI states from shape drift. | Add small validators for high-value manifests first: `slides`, `library`, `submissions`, `roadmap`. |
| P2 | Observability | GA exists; API logs are ad hoc; no public endpoint monitor in repo. | Failures depend on manual discovery. | Add a read-only smoke script for public GETs plus structured Vercel function logs. |
| P3 | Repo boundaries | Product, archive, generated media, and ops automation all live together. | Onboarding and risk review become slow. | Keep repo unified for now, but document boundary rules and archive/move private source only if publication risk stays high. |

# Prioritized Work Plan

## Phase 0 — Immediate Containment

## Goals

- Remove acute security and production-confidence risk.
- Make the current branch safe to merge.
- Avoid adding new architecture before the existing surface is trustworthy.

## High-impact tasks

- Rotate the ElevenLabs key that was previously committed, even though the code
  now reads `ELEVENLABS_API_KEY`.
- Merge the lockfile audit fix (`fast-uri` to 3.1.2) and keep `npm audit`
  clean. Status: done locally.
- Add low-friction abuse protection to `/api/submissions` and `/api/subscribe`.
  Status: timestamp/honeypot guards done locally; durable rate limiting still
  requires platform/provider work.
- Resolve #135: share the Notion DB with the integration, run a real valid POST
  smoke, record the Notion page id, and delete/reject the test row.
- Change Vercel JS/CSS cache headers away from one-year immutable until assets
  are content-hashed. Status: done locally.
- Add CI parity for Python agentic tests, `npm audit`, full doc links, and
  Python syntax checks. Status: done locally via `npm run check`.
- Add an eval check that fails on placeholder worker URLs like
  `YOUR-WORKERS.workers.dev`. Status: done locally.

## Expected outcomes

- No known committed active secret in working tree.
- Public forms are harder to abuse.
- The Release Day path is either proven live or honestly blocked.
- CI catches the same categories of failure that local agents already check.
- Fallback infrastructure cannot be accidentally promoted with placeholder URLs.

## Phase 1 — Stabilization

## Goals

- Make current boundaries explicit and testable.
- Protect public data surfaces.
- Improve operational reliability without changing the product model.

## High-impact tasks

- Add a publication allowlist for `scripts/build-library-index.mjs`; default
  `source-material` to private unless a file or collection is explicitly marked
  public.
- Add schema validators for the highest-value JSON contracts:
  `site/data/library.json`, `site/data/slides.json`,
  `site/data/submissions.json`, and `ops/roadmap/features.json`.
- Split `scripts/eval.mjs` internally into check modules only if it reduces
  friction; keep the single `npm run eval` entrypoint.
- Keep `npm run check` as the full standard for humans and PR CI; the agentic
  loop can keep the faster `npm run eval` for iteration.
- Keep `.nvmrc` on Node 22 and package `engines.node` at `>=22`.
- Add structured function logs with request id, route, upstream status, and
  generic public errors. Do not log submission bodies or secrets.
- Add a public smoke script for `https://punkrockai.com/`, `/release-day`,
  `/library`, `/api/submissions` GET, and expected invalid POST behavior.

## Expected outcomes

- Developers know what is public, generated, private, active, and fallback.
- Broken data manifests fail before deploy.
- Public endpoint health has a repeatable check.
- Onboarding starts with one command and one current architecture map.

## Phase 2 — Standardization

## Goals

- Reduce AI-generated inconsistency without flattening the handcrafted site.
- Keep the static/no-build philosophy while giving maintainers better rails.

## High-impact tasks

- Create `site/js/common/dom.js` with shared `escapeHTML`, `escapeAttr`, and
  small rendering helpers. Migrate a few widgets per PR, starting with public
  input/render-heavy widgets.
- Create a widget checklist in code, not only docs: HTML shell, JS/CSS pair,
  clean route, reset control, reduced-motion behavior, data references.
- Standardize API response envelopes for public functions:
  `{ ok, error? }` for public failures and detailed logs for operators.
- Decide the Cloudflare fallback contract: actively maintained with smoke tests,
  or parked with routes that cannot be mistaken for production.
- Add lightweight formatting conventions. Prefer a small formatter/lint setup
  only if it improves consistency without creating a tooling project.
- Add dependency review cadence: monthly `npm outdated`, `npm audit`, and a
  deliberate `sharp` major-upgrade test when image ingest work resumes.

## Expected outcomes

- New widgets look and behave like existing widgets without copy-paste drift.
- Public API behavior is predictable.
- Fallback infrastructure is either real or clearly inert.
- Dependency updates become maintenance, not surprise archaeology.

## Phase 3 — Refactoring & Optimization

## Goals

- Optimize the system only after safety and consistency are restored.
- Refactor by real pressure: performance, publish risk, API reliability,
  onboarding friction.

## High-impact tasks

- Introduce content-hashed asset output only if immutable caching is worth
  keeping. Otherwise keep short cache headers and preserve the no-build site.
- Break up only the widgets that keep changing. Good candidates are
  `selector.js`, `word-ban.js`, `receipt.js`, `sig.js`, `mastery-gym.js`,
  `detournement.js`, and `posse-builder.js`.
- Consider moving private/raw source material out of the deploy repo if the
  allowlist still feels fragile after Phase 1.
- Add browser automation for the few flows that matter:
  Release Day form fallback, newsletter submission failure/success handling,
  library search, one localStorage-heavy widget, and mobile nav.
- Add operational dashboards or scheduled smoke reports only after the manual
  public smoke script is stable.

## Expected outcomes

- Performance work targets measured hot spots, not aesthetic preferences.
- Large modules shrink where change pressure justifies it.
- The public deploy repo carries less accidental publishing risk.
- Future contractors and agents can contribute without memorizing hidden rules.

# Quick Wins

- Rotate the removed ElevenLabs key.
- Keep the `fast-uri` audit fix and keep `npm audit --audit-level=moderate` in
  CI.
- Keep `python3 -m pytest tests/agentic` and `npm run docs:links:all` in the
  full `npm run check` gate.
- Keep short revalidated cache headers for non-hashed JS/CSS.
- Keep the eval check for deployment placeholders.
- Keep `.nvmrc` on Node 22 and keep `npm run check` as the pre-merge command.
- Add a public-index allowlist before regenerating `site/data/library.json`.
- Change `api/subscribe.js` to return generic public errors and log upstream
  details server-side.

# Anti-Rewrite Guidance

## What should remain untouched

- Keep the static `site/` architecture and JSON data contract. It is working and
  easy to host.
- Keep Vercel as the active production host unless there is a concrete reason
  to move.
- Keep local-first widgets. They are a product strength, not a debt smell.
- Keep `npm run eval` as the main local gate.
- Keep GitHub/Linear agentic delivery, but harden its permissions and CI
  coverage rather than replacing it.

## What should be incrementally improved

- Public Vercel functions: add shared validation, abuse controls, generic
  public errors, and smoke tests.
- Widget internals: extract repeated safety helpers and patterns slowly.
- Data manifests: add validators around the contracts that break user flows.
- Docs: keep the current useful docs, but remove stale counts and duplicate
  source-of-truth claims.
- Deployment fallback: either maintain it with checks or park it cleanly.

## Where simplification is preferable to expansion

- Do not add a framework just to get structure. Add tiny repo-local contracts
  first.
- Do not build a general CMS. Add a publication allowlist for the library index.
- Do not create a full observability platform. Start with smoke scripts and
  structured logs.
- Do not split the repo yet unless private-source publishing risk remains high.
- Do not expand agentic automation until the current write-capable workflow has
  stronger CI and explicit pause controls.

# Monday Morning Checklist

## First audits to run

- `git status --short --branch`
- `gh issue list --state open --limit 100`
- `gh pr list --state open --limit 100`
- `npm ci`
- `npm run check`
- `npm outdated`

## Highest-leverage cleanup targets

- Rotate the previously committed ElevenLabs key.
- Resolve or update GitHub #135 with fresh valid POST evidence.
- Add a publication allowlist for the library index.
- Add durable public API rate limiting or a provider-level bot challenge before
  a larger Release Day traffic push.

## First refactors to prioritize

- Extract shared API validation for submission/newsletter style inputs.
- Add `site/js/common/dom.js` and migrate two user-input widgets first.
- Add a `scripts/check-library-publication.mjs` guard before any future
  `npm run build:library`.
- Split `scripts/eval.mjs` only after adding the missing checks; do not split it
  as performative cleanup.

## Immediate tooling and documentation improvements

- Keep `.nvmrc`, `engines.node`, and `npm run check` aligned with CI.
- Add a short "Active vs fallback infrastructure" table to the main README or
  link this plan from the docs table.
- Keep `docs/DOCUMENTATION-AUDIT-2026-05-25.md` as the current release-day
  blocker evidence, but do not let it become the only architecture map.

# Final Guidance

The long-term engineering philosophy for this repo should be: keep the site
boringly static, make publication boundaries explicit, make public APIs hostile
to abuse, make generated data contracts testable, and let every abstraction earn
its place.

This repo's strength is that it shipped a rich handcrafted experience without a
heavy app stack. Preserve that. Professionalization here means fewer hidden
side effects, less accidental publishing, clearer deployment truth, and a
single trustworthy path from source edit to verified production behavior.
