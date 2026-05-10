# BC-55 Browser QA and Lighthouse Pass

Scope: Linear BC-55, GitHub issue #138.

Run date: 2026-05-07 18:29 PDT.

Current-main addendum: 2026-05-09 23:28 PDT, after merging `origin/main`
through the issue-swarm widget and Release Day operations batch.

Environment:

- Branch: `codex/bc-55-browser-qa-lighthouse`
- Server: `npm run dev` at `http://localhost:3000`
- Browser QA: automated Chrome browser session against localhost
- Lighthouse: `npx --yes lighthouse` with headless Chrome, mobile defaults, categories `performance,accessibility,best-practices,seo`

## Browser QA Evidence

| Flow | Evidence | Result |
| --- | --- | --- |
| Route and data smoke | `/`, `/talk.html`, `/lineage.html`, `/library.html`, `/posse.html`, `/release-day.html`, `/decisions.html`, `/404.html`, key widgets, and required `/data/*.json` files returned 200. `/favicon.ico` returned `200 1150b` after the fix. | Pass |
| Primary nav keyboard | `Make` summary opened with Enter, exposed the Three Documents menu link, and closed with Escape. | Pass |
| Home | Header, daily refrain, hero CTAs, photo credit, and major card sections rendered in the DOM. | Pass |
| Talk lightbox | Slide reel rendered; opened first slide (`BOTH HANDS FULL`), ArrowRight moved to `Cult Baby`, Escape closed the dialog. | Pass |
| Lineage | Hero thesis rendered, beat content included `The tool` and `The refusal`, six trail links rendered, and the second trail link updated URL hash to `#beat-situationists`. | Pass |
| Library | Search input rendered; searching `consent` produced `80 matches`, 60 visible result cards, and 4 collection chips. | Pass |
| Three Documents | Filled all three textareas, Markdown preview rendered, prompt mode rendered, social generator produced 7 posts, and draft content was still present after reload. | Pass |
| Both Hands | Filled critique, capability, and signature; moved a critique item down; PNG/share controls rendered; signature persisted after reload. Clipboard/download actions were not activated to avoid overwriting the user's clipboard or creating local downloads during QA. | Pass with note |
| Release Day | Countdown rendered (`22` days at test time), required form fields rendered, draft values persisted after reload, and Clear draft removed the local draft. Submit was not activated because local `serve` intentionally falls back to queued local submissions when `/api/submissions` is unavailable. | Pass with note |
| Signal date navigation | `/signal?d=2026-05-29` rendered May 29, 2026; prev/today/next links now emit clean `/signal?d=...` URLs so local clean-URL redirects do not drop the selected date. | Pass |
| Issue-swarm widget routes | `/widgets/word-ban.html`, `/widgets/conductor-ratio.html`, `/widgets/cutting-room-buckets.html`, `/widgets/receipt-tells.html`, and `/widgets/tool-not-neutral-matrix.html` rendered their expected controls/content; the matrix rendered 25 cells on desktop and mobile. | Pass |
| Pattern Finder states | Mocked `/api/pattern-finder` success rendered a pattern card without fallback; mocked `503` rendered the copy-paste fallback prompt. | Pass |
| Release Day submit states | Mocked `/api/submissions` success rendered submitted status and cleared the draft; mocked `queued-no-backend` rendered the pending-local queue. | Pass |
| Accessibility smoke | Desktop pass across home, talk, lineage, library, Release Day, Pattern Finder, and new widget routes found no unlabelled form controls and exposed keyboard focus on Tab. Mobile Release Day under `prefers-reduced-motion: reduce` matched the reduced-motion media query and kept form labels intact. | Pass |

## Lighthouse Summary

Post-fix scores:

| URL | Performance | Accessibility | Best Practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| `/` | 58 | 100 | 100 | 100 |
| `/talk.html` | 64 | 100 | 100 | 100 |
| `/lineage.html` | 71 | 100 | 100 | 100 |
| `/widgets/three-documents.html` | 59 | 100 | 100 | 100 |
| `/widgets/both-hands.html` | 63 | 100 | 100 | 100 |
| `/release-day.html` | 61 | 100 | 96 | 100 |
| `/library` | 65 | 100 | 100 | 100 |

## Fixed In This Pass

- High: Missing default favicon caused a repeated browser console 404 in Lighthouse. Added a local `/favicon.ico`.
- High: Lighthouse contrast failures on small red accent text and Both Hands inputs reduced accessibility scores. Added an accessible red token for small dark-background text and explicit input/placeholder colors.
- Medium: Three Documents used `role="tablist"` around pressed toggle buttons. Changed the wrapper to `role="group"`.
- Medium: Header partial insertion caused visible load shift. Reserved the documented sticky header height before the partial loads.
- Medium: Signal date navigation generated `.html?d=` links, which local clean-URL redirects stripped. Changed generated date links to `/signal?d=...`.
- Medium: `/library` mobile Lighthouse found low-contrast small red nav/card labels and skipped heading order in dynamic result cards. Switched small red labels to `--accent-readable` and rendered library result titles as `h2`.

## Remaining Findings and Follow-Ups

- Preview follow-up on 2026-05-10: the latest Vercel preview was deployed, but
  unauthenticated `curl` requests to the preview returned `401`, so this agent
  could not use it as browser evidence. Local route checks against
  `python3 -m http.server 5177 --directory site` returned 200 for
  `/library.html`, `/widgets/pattern-finder.html`, and `/release-day.html`.
- Preview follow-up on 2026-05-10: Pattern Finder static copy now explicitly
  says the live backend stays off until cost, privacy, and abuse controls are
  accepted, and the fallback panel remains present for copy-paste use.
- Preview follow-up on 2026-05-10: Release Day static form labels and fallback
  copy are present; the local static server returns `501` for
  `/api/submissions`, which exercises the browser's local queue/fallback path
  but cannot prove the Vercel/Notion success path.
- High follow-up: Mobile Lighthouse performance remains 58-71 on the original route set and 65 on `/library`. LCP is 3.9-9.3s across tested pages, with `/library` at 6.9s. The dominant cost is large hero/background imagery and decorative WebP payloads, especially `weirdos-lineage-full.webp`, `posse-full.webp`, `taste-full.webp`, `release-day-full.webp`, `bhf-title-full.webp`, and `three-docs-full.webp`. Recommended follow-up: responsive image variants, lazy loading/defer for below-fold decorative backgrounds, and explicit LCP image preload or non-background hero treatment where appropriate.
- Medium follow-up: CLS improved but remains 0.208-0.278 on tested pages. Header reservation helped, but JS-rendered sections and late-arriving content still shift. Recommended follow-up: skeleton/min-height reservations for dynamic sections such as Lineage beats, Talk reel, Three Documents progress state, and Release Day hero/countdown.
- Medium follow-up: GA adds about 157 KiB of third-party JS and appears as unused JavaScript in Lighthouse. Recommended follow-up: defer analytics until idle or after a lightweight consent/engagement signal if analytics timing is not launch-critical.
- Low follow-up: Local Lighthouse runs against `.html` URLs are redirected to clean URLs by `serve`, which Lighthouse reports as redirect overhead. Future audits should use clean URLs directly (`/talk`, `/lineage`, `/release-day`) when measuring performance.
- Low follow-up: Release Day best-practices score remains 96 due to image delivery/responsive sizing on decorative hero art. This is not user-visible breakage, but should be handled alongside the image optimization follow-up.

## Verification Commands

```sh
npm run eval
```

Result: passed.

```sh
for r in / /talk.html /lineage.html /library.html /posse.html \
         /release-day.html /decisions.html /404.html \
         /widgets/three-documents.html /widgets/both-hands.html \
         /widgets/name-what-you-see.html /widgets/taste-audit.html \
         /widgets/pattern-finder.html \
         /data/slides.json /data/quotes.json /data/lineage.json \
         /data/library.json /data/cases.json /data/posse.json \
         /data/decisions.json /data/audio-cues.json /favicon.ico; do
  curl -fsSL -o /dev/null -w "%{http_code} %{size_download}b $r\n" "http://localhost:3000$r"
done
```

Result: all tested routes/data files returned 200.

```sh
npx --yes lighthouse "http://localhost:3000/" \
  --output=json --quiet \
  --chrome-flags="--headless=new --no-sandbox" \
  --only-categories=performance,accessibility,best-practices,seo
```

Result: repeated for `/`, `/talk.html`, `/lineage.html`, `/widgets/three-documents.html`, `/widgets/both-hands.html`, and `/release-day.html`; scores are recorded above.

```sh
# Focused Playwright smoke against localhost:
# - Signal clean date URL
# - issue-swarm widget routes
# - Pattern Finder connected/disconnected states
# - Release Day submitted/queued states
# - desktop/mobile form-label, focus, and reduced-motion checks
```

Result: passed.

```sh
CHROME_PATH=/Users/kk/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell \
npx --yes lighthouse "http://localhost:3000/library" \
  --output=json --quiet \
  --chrome-flags="--headless=new --no-sandbox" \
  --only-categories=performance,accessibility,best-practices,seo
```

Result: `/library` scored 65 / 100 / 100 / 100.
