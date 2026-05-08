# site/ — punkrockai.com portal

The interactive learning portal that turns the **Punk Rock AI / Both Hands Full**
keynote into a working set of widgets people can actually use. Vanilla
HTML / CSS / JS. Zero runtime dependencies. No build step. Tiny Node tooling
only for ingesting slide imagery + generating data manifests.

Maximum punk.

---

## Run it

```sh
npm install                # one-time, pulls dev tooling (sharp, s3, serve)
npm run dev                # boots npx serve on http://localhost:3000
```

That's it. No bundler, no transpiler, no watcher. Edit a file → hard-refresh.

If you don't want `npm install` (the deps are only for the build scripts and
the ingest pipeline, not the site itself), you can serve the site directly:

```sh
npx --yes serve site -l 3000
```

---

## Layout

```
site/
  index.html                 landing — thesis + four cards
  talk.html                  22-slide reel + quote wall + lightbox (#4)
  lineage.html               Dada → AI scroll-driven timeline (#7)
  library.html               searchable knowledge base (#12)
  posse.html                 audience map (#15)
  release-day.html           countdown + ship rubric + submission portal (#14)
  decisions.html             open questions + decision log (#16)
  404.html                   branded fallback
  widgets/
    three-documents.html     externalize your taste (#5)
    both-hands.html          diptych canvas + PNG export (#6)
    name-what-you-see.html   bias-naming walkthrough (#10)
    taste-audit.html         cutting-room-floor reflection (#9)
    pattern-finder.html      LLM-backed pattern discovery (#13)
  partials/
    header.html              site nav (single source of truth)
    footer.html              site footer
  css/
    theme.css                tokens, type scale, .grain, .halftone
    layout.css               shell, nav, hero, card grid
    widgets/*.css            per-widget styles
  js/
    common/
      header.js              fetch-and-insert helper for partials
      storage.js             namespaced localStorage helpers
      audio-player.js        per-slide <audio> orchestrator (#11)
    widgets/*.js             per-widget controllers
  data/
    slides.json              22 slide stubs + image refs (auth: build-quotes + ingest)
    quotes.json              19 key lines + slide refs (auth: build-quotes)
    lineage.json             6 hand-curated beats (auth: hand)
    library.json             markdown index (auth: build-library-index)
    cases.json               bias case studies (auth: hand)
    posse.json               curated attendee profiles (auth: hand)
    decisions.json           Q&A + decision log (auth: build-decisions)
    audio-cues.json          per-slide cue points (auth: build-audio-cues)
    submissions.json         release-day gallery feed (auth: cron from Notion)
  public/
    images/slides/           low-res WebP fallbacks (committed)
    fonts/                   self-hosted fonts (drop in to activate)
  _headers                   Cloudflare Pages: cache + security headers
  _redirects                 Cloudflare Pages: clean-URL aliases

scripts/
  build-quotes.mjs           script/talk-framework-v6.md → quotes.json + slides.json stub
  build-lineage.mjs          validates site/data/lineage.json (hand-curated)
  build-library-index.mjs    walks markdown sources → library.json
  build-decisions.mjs        OPEN-QUESTIONS.md + SESSION-HANDOFF.md → decisions.json
  build-audio-cues.mjs       dress-rehearsal/elevenlabs-full-script.md → audio-cues.json
  ingest-slides.mjs          $SLIDES_SRC → WebP fallbacks + R2 uploads + slides.json merge

worker/                      Cloudflare Workers (deferred deploy)
  pattern-finder/            Anthropic Claude proxy w/ prompt caching + rate limit (#13)
  submissions/               Notion submission ingest (#14)
```

---

## Data contract

Pages and widgets only **read JSON** from `site/data/`. They never call Node,
never run a build step at request time, never know how the JSON got there.
The build scripts in `scripts/` are the producers; the JSON files are the
contract.

This is what lets the site stay zero-dep at runtime. The trade-off: when you
edit source markdown (the talk script, the audience dossier, the open
questions), you re-run the relevant build script to refresh the JSON. The
package scripts do this:

| Command                  | Reads                                                    | Writes                              |
|--------------------------|----------------------------------------------------------|-------------------------------------|
| `npm run build:quotes`   | `script/talk-framework-v6.md`                            | `data/quotes.json`, `data/slides.json` (stub) |
| `npm run build:lineage`  | `data/lineage.json` (validates)                          | `data/lineage.json` (pretty-printed) |
| `npm run build:library`  | `script/`, `source-material/`, `dress-rehearsal/`, `research/` | `data/library.json`           |
| `npm run build:audio`    | `dress-rehearsal/elevenlabs-full-script.md`, `data/slides.json` | `data/audio-cues.json`        |
| `npm run build:decisions`| `OPEN-QUESTIONS.md`, `SESSION-HANDOFF.md`, `docs/MARK-FEEDBACK.md` | `data/decisions.json`         |
| `npm run ingest:slides`  | `$SLIDES_SRC`                                             | `public/images/slides/*.webp`, `data/slides.json` (merged), R2 bucket |

`ingest-slides.mjs` is the only one that needs credentials (R2). All others
are pure file → JSON transforms; safe to run from any clone.

---

## Add a widget

1. **HTML** in `site/widgets/<name>.html`. Use the standard shell:

   ```html
   <header class="site-header" data-include="header"></header>
   <main>...</main>
   <footer class="site-footer" data-include="footer"></footer>
   <script type="module" src="/js/common/header.js"></script>
   <script type="module" src="/js/widgets/<name>.js"></script>
   ```

2. **JS** in `site/js/widgets/<name>.js`. ES module. Import storage helpers
   from `/js/common/storage.js` if you need autosave. **Always escape
   user-controlled strings** — a tiny `escapeHTML` function lives in every
   existing widget; copy it.

3. **CSS** in `site/css/widgets/<name>.css`. Reuse tokens from `theme.css`
   (`var(--accent)`, `var(--bg)`, etc.) and primitives from `layout.css`
   (`.wrap`, `.section`, `.btn`, `.card`).

4. **Data** in `site/data/<name>.json` if you have a manifest. If it's
   hand-curated (lineage, posse, cases), commit the JSON directly. If it's
   derived from markdown, write a `scripts/build-<name>.mjs` and document it
   in the table above.

5. **Nav** — add the route to `site/partials/header.html` so it shows up
   everywhere.

Conventions worth keeping:

- Widgets are local-first by default. No network calls except for fetching
  `/data/*.json` and `/partials/*.html`.
- Autosave to `localStorage` is namespaced as `pra:v1:<widget>:<key>` via
  `storage.js`. Bump the schema version (`v1` → `v2`) if you change the shape.
- Every widget ships a Reset button that confirms before wiping state.
- `prefers-reduced-motion: reduce` must disable any non-essential animation.

---

## Deploy

**Vercel** (production). The project lives at https://punkrockai.com on the
team `walkswithaswaggers-projects`. Push to `main` → auto-deploys to
production. Push to any branch → Vercel preview deploy at
`punkrockai-git-<branch>-walkswithaswaggers-projects.vercel.app`
(SSO-protected — open in a logged-in browser).

Config:

- **Project name:** `punkrockai`
- **Root directory:** *(repo root)*
- **Build command:** *(empty)* — site ships as static files
- **Output directory:** `site` (set in `vercel.json`)
- **Framework preset:** Other / static

`vercel.json` at the repo root translates the Cloudflare-style
`site/_headers` + `site/_redirects` into Vercel's rewrites/redirects/headers
schema. It also enables `cleanUrls: true` so `/talk` serves `/talk.html`.

DNS lives at Porkbun:

```
ALIAS  punkrockai.com    cname.vercel-dns.com
CNAME  *.punkrockai.com  cname.vercel-dns.com
```

The Cloudflare Pages config (`wrangler.toml`, `site/_headers`,
`site/_redirects`) stays in the repo as reference and as a fallback if we
ever need to switch hosts. It is not the active production path.

For the `worker/` modules (Pattern Finder, Submissions): scaffolded for
Cloudflare Workers. The production submissions path is currently the Vercel
function at `api/submissions.js`; worker deploys are deferred/fallback unless a
new backend decision says otherwise. See each worker's `SETUP.md` for KV /
secrets bindings.

### Visual system

Punk visual system docs at [`docs/PUNK-VISUAL-SYSTEM.md`](../docs/PUNK-VISUAL-SYSTEM.md).
The site uses three layered stylesheets:

- `site/css/theme.css` — design tokens (colors, type, spacing, decoration vars)
- `site/css/layout.css` — page shell, nav, hero, card patterns
- `site/css/punk-graphics.css` — reusable decoration classes (halftone, torn,
  ransom-note typography, splatters, collage layout)

Plus 18 cropped slide assets at `site/public/punk/*.webp`, generated via
`scripts/extract-punk-assets.mjs` from the punk-v2-nano slide deck. Re-run
`node scripts/extract-punk-assets.mjs` to refresh after adjusting crop
coordinates in `assets/punk-asset-crops.json`.

---

## Verify

After any edit, sanity-check:

```sh
npm run dev                   # boot dev server
# in another shell, hit every route + data file:
for r in / /talk.html /lineage.html /library.html /posse.html \
         /release-day.html /decisions.html /404.html \
         /widgets/three-documents.html /widgets/both-hands.html \
         /widgets/name-what-you-see.html /widgets/taste-audit.html \
         /widgets/pattern-finder.html \
         /data/{slides,quotes,lineage,library,cases,posse,decisions,audio-cues}.json; do
  curl -fsSL -o /dev/null -w "%{http_code} %{size_download}b $r\n" http://localhost:3000$r
done
```

Manual checks worth doing in a real browser:

- `/talk` lightbox: arrow keys step, Esc closes, copy-quote works.
- `/widgets/three-documents` autosaves across reload, downloads valid `.md`.
- `/widgets/both-hands` exports a PNG to Downloads at expected dimensions.
- `/lineage` reveals each beat once, no jank on mobile.

Lighthouse target: ≥95 on `/`, `/talk`, `/lineage`. Run locally with:

```sh
npx --yes @lhci/cli@latest autorun --collect.url=http://localhost:3000
```

---

## What's `companion-site/` then?

Historical static landing — kept in repo as reference for thesis copy and
palette. Will deprecate once `punkrockai.com` is live and validated.
