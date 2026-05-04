# Punk Visual System

How the punkrockai.com microsite gets its black/white/pink/red zine aesthetic.

This is the reference for anyone (including future-you) who needs to add a
new page, tweak a visual primitive, or extend the asset library.

---

## Quick rules

1. **Pink is real.** `--accent-pink #ff3d8a` is a first-class brand color, not
   a tint of red. Use it on alt cards (`:nth-child(2n)` shadow), on the NAME
   nav group, and as the secondary splatter color.
2. **Asymmetry over grid.** Cards rotate ±0.5–1.5°. Section dividers are
   torn, not 1px borders. Boxy is the default failure mode.
3. **Texture is structural, not decoration.** Halftone, scanlines, grain, and
   the cropped slide imagery are all building blocks — not a wash applied to
   one hero.
4. **Slide imagery is content.** The 18 cropped elements at `site/public/punk/`
   are the visual vocabulary. Reach for them before generating new assets.
5. **Performance budget intact.** Total `site/public/punk/` payload ≤ 2 MB.
   All assets are `webp` with `sips`/`sharp`-style compression.

---

## Three layered stylesheets

| File | Owns |
|---|---|
| `site/css/theme.css` | Design tokens (colors, type, spacing, font faces, decoration variables pointing at `/public/punk/*`). One source of truth for everything visual. |
| `site/css/layout.css` | Page shell (`.wrap`, `.section`, `.hero`, `.card`, `.card-grid`), site header + categorized nav, footer. Handles the `:nth-child(3n+N)` auto-decoration on `.card-grid` children. |
| `site/css/punk-graphics.css` | Reusable decoration classes: `.punk-tile`, `.punk-torn-top/bottom`, `.punk-slash`, `.punk-circle`, `.punk-splatter`, `.punk-staple`, `.punk-tape-corner`, `.punk-card--torn/--taped/--stapled`, `.collage-stack`, `.punk-ransom`, `.punk-section--make/--name/--connect/--ship`. |

Every page links all three. The link is added automatically when a new
HTML file is created (or via the batch sed in `scripts/` if you add it later).

---

## Color tokens

```css
/* Brand */
--accent: #e11d2e;          /* the talk's red */
--accent-pink: #ff3d8a;     /* hot pink, second accent */
--accent-pink-soft: #ff8db2;
--accent-red-deep: #b51624; /* layered accent */
--paper: #f4ede0;           /* cream, used in widget output canvases */
--paper-bright: #fff8ee;    /* lighter cream for sheet/typewriter feel */
--ink-marker: #1a0e10;      /* warm black, hand-written feel */

/* Greys */
--bg: #0a0a0a;              /* page bg, near-black */
--bg-elevated: #141414;     /* card bg */
--fg: #f2f2f2;              /* default text */
--fg-soft: #cfcfcf;
--muted: #9a9a9a;
--border: #2a2a2a;
--border-strong: #3f3f3f;
--rule: #5a0a13;            /* dark red rule */
--rule-pink: #ff3d8a;
```

**When to use which:**
- Default text on dark bg → `--fg`
- Punk h1 / display heading → `--font-display` italic, often pink span variants
- Pink accent: alt card hover shadow, NAME nav group, secondary splatter,
  doc-2 in /three-documents
- Deep red: dt labels in cream-paper sections, kicker text on cream
- Paper-bright: cream sheet backgrounds (release-day form, three-documents,
  lineage beats, talk quote-wall)

---

## Typography

| Stack | Used for |
|---|---|
| `--font-mono` (JetBrains Mono) | Body, UI labels, kickers, eyebrow text, dt labels, mono uppercase tags, ink stamp button |
| `--font-display` (Newsreader) | h1, h2, h3, italic ledes, blockquotes, ransom-note headlines |

**Self-hosted woff2** at `site/public/fonts/`. JetBrains Mono Regular/Italic/Bold
+ Newsreader Regular/Bold. ~322 KB total. `font-display: swap`. CSP allows
`'self' data:` for `font-src`.

**Ransom-note treatment:**
Wrap the heading in `<h1 class="punk-ransom">` with the actual words as `<span>`s.
The CSS rotates each span via `:nth-child(5n+N)`, mixing fonts (mono and
display), backgrounds (red box), italics, and pink wavy underlines. Result:
big punk headline that reads as scissor-cut.

```html
<h1 class="punk-ransom">
  <span>PUNK</span><span>ROCK</span><span>AI</span>
</h1>
```

---

## Decoration class catalog

`site/css/punk-graphics.css` exposes:

| Class | Effect |
|---|---|
| `.punk-tile` | Full-bleed `zine-collage-bg` overlay at 18% opacity in `overlay` blend. Apply to any container. |
| `.punk-halftone-bg` | Halftone face background at 22% opacity, screen blend, grayscale. |
| `.punk-bias-bg` | Halftone "BIAS" text from slide 15 at 12% opacity. Used on the NAME landing section. |
| `.punk-torn-top` / `.punk-torn-bottom` | Torn-paper edge top/bottom of a section. SVG mask, repeats horizontally. |
| `.punk-film-strip` | Sprocket-hole black bar at top edge. (`--bottom` modifier for bottom-aligned.) |
| `.punk-slash` | Absolutely-positioned hand-drawn red slash. Tunable via `--punk-x`, `--punk-y`, `--punk-rotate`, `--punk-scale`, `--punk-w`, `--punk-h`, `--punk-opacity`. |
| `.punk-circle` | Same shape as `.punk-slash` but the red hand-drawn circle / box. |
| `.punk-refuse` | The "REFUSE" red marker, smaller default size. |
| `.punk-splatter` | Pink ink splat dot. `.punk-splatter--red` for red. |
| `.punk-tape-corner` | Cream tape strip + shadow on top-left corner of container. |
| `.punk-staple` | Staple SVG on top of card. |
| `.punk-card--torn` / `--taped` / `--stapled` | Modifier classes that put torn / taped / stapled corners on a `.card`. (Auto-applied per `:nth-child(3n+N)` already.) |
| `.collage-stack` | Flex container with rotation per `:nth-child` so children read as a paste-up. |
| `.punk-ransom` | Ransom-note heading treatment (see Typography above). |
| `.punk-shadow-pink` / `.punk-shadow-red` | Drop a 4px offset color shadow on a button or card. |
| `.punk-section--make/--name/--connect/--ship` | Sets `--punk-section-accent` per category for downstream rules. |
| `.punk-section-header` + `.punk-section-header__num/__title/__lede` | Big landing-page section header pattern. |
| `.punk-splat-tl / --tr / --bl / --br` | Position helpers for splatter accents (top-left, top-right, etc.). |

All decoration classes respect `prefers-reduced-motion: reduce` (rotations
disabled) and `@media print` (hidden).

---

## Asset pipeline

### What lives where

```
assets/generated/slides/run-20260427-083655-punk-v2-nano/  ← source slides (28 PNG)
assets/punk-asset-crops.json                              ← crop manifest
scripts/extract-punk-assets.mjs                           ← cropper (sharp-based)
site/public/punk/*.webp                                   ← cropped output (18 files)
assets/image-prompts/punk-web-graphics.md                 ← Rafiki prompts for gaps
```

### Adding a new crop

1. Find the source slide in `assets/generated/slides/run-20260427-083655-punk-v2-nano/`.
   Slides are 1376×768.
2. Pick a bounding box. Tools:
   - macOS Preview → use the rectangular selection tool, read pixel coords from
     Tools → Inspector → Crop tab.
   - Or estimate from composition (most slides have ~80px margins).
3. Add an entry to `assets/punk-asset-crops.json`:
   ```json
   {
     "slug": "your-asset-name",
     "source": "06-dada-punks-djs-ai.png",
     "crop": { "left": 100, "top": 80, "width": 500, "height": 600 },
     "max_width": 800,
     "use": "what you're going to use it for"
   }
   ```
4. Dry-run: `node scripts/extract-punk-assets.mjs --dry-run --only your-asset-name`
5. Crop: `node scripts/extract-punk-assets.mjs --only your-asset-name`
6. Add the var to `site/css/theme.css`:
   ```css
   --punk-your-asset: url("/public/punk/your-asset-name.webp");
   ```
7. Reference the var in `site/css/punk-graphics.css` or any widget CSS.

### Re-cropping after coordinate adjustments

```sh
node scripts/extract-punk-assets.mjs --force          # re-crop everything
node scripts/extract-punk-assets.mjs --only foo,bar   # subset
```

The script skips existing files by default (idempotent). Use `--force` to
overwrite.

### Filling gaps via Rafiki

For graphics that don't exist on a slide, write a Rafiki prompt entry in
`assets/image-prompts/punk-web-graphics.md`. Generation is via gpt-image-2 /
gemini-3-pro-image-preview. The 5 gap assets currently described:

- `punk-bg-tile.webp` — tileable noise + halftone
- `torn-paper-divider.svg` — full-width section divider
- `pink-splatter-set.{svg,webp}` — 6 hand-drawn splat shapes
- `arrow-handdrawn-set.svg` — 4 angled arrows
- `loading-halftone.svg` — async-fetch state for /widgets/pattern-finder

These are deferred — the cropped slide assets carry the load until generation
runs.

---

## Header navigation structure

`site/partials/header.html` renders:

| Slot | Contents |
|---|---|
| Brand | `Punk Rock AI` + rotating-square bullet |
| Persistent | Talk · Recap |
| `<details>` MAKE | Three Documents · Both Hands · Cut-up · Selector · Voice Booth · Manifesto · Email Sig · Receipt Printer · Détournement |
| `<details>` NAME | Bias Bingo · Name What You See · Word-ban · Tool Is Never Neutral · Am I in There? · Taste Audit · Cutting Room · Pattern Finder · Pattern Graph · Junior Pipeline · Chainsaws · Mastery Gym · Open Source Receipt |
| `<details>` CONNECT | Posse · Posse Builder · Both Hands Gallery · Releases Wall · Crit Office · Lineage · Library · Decisions |
| `<details>` SHIP | Release Day · Action Chooser · Workshop Kit · Signal · RSS Feed |
| CTA | "May 29 ↗" → /release-day.html |

The dropdowns use native `<details>/<summary>` for click-to-open + keyboard
a11y. `site/js/common/nav.js` (~50 lines) layers hover-open behavior on
desktop (gated by `(hover: hover) and (pointer: fine)`), ESC-close, and
click-outside-close. Mobile: `<details>` accordion-stacks naturally.

NAME group uses pink shadow on its dropdown menu; the others use red.

### Adding a new widget to the nav

1. Land the widget at `site/widgets/<slug>.html`.
2. Add a `<link>` to `site/css/punk-graphics.css` if it's not already wired.
3. Apply `.punk-tile` to the first `*-intro` or `*-hero` section in the HTML.
4. Add the route entry to the appropriate `<details>` in
   `site/partials/header.html`. Pick category by intent:
   - **MAKE** — produces a thing the user takes home (doc, image, audio, post)
   - **NAME** — teaches the user to see (case studies, taxonomies, tests)
   - **CONNECT** — surfaces other people / community (gallery, posse, lineage)
   - **SHIP** — pushes the user toward Release Day deadline / outputs

---

## Per-page bespoke treatments

Five pages got handcrafted Phase 5b treatments beyond the global cascade.
Each treatment is in the corresponding `site/css/widgets/<page>.css`:

| Page | Treatment |
|---|---|
| `/talk` | Slide-01 title-detail layered twice in hero (lighten + screen blends). Slide reel rotates per `:nth-of-type(3n+N)`. Quote wall = cream-paper taped cards with 4 rotation variants and alternating red/pink shadows. |
| `/recap` | Punk-tile cascade only (no bespoke yet). Future: zine-style sticky TOC. |
| `/lineage` | Each `.beat` = torn-paper card on cream paper-bright with newspaper-page-detail texture at 12% multiply. Per-beat rotation. Even beats get pink shadow, odd get red. Hand-drawn red slash floats between consecutive beats as the "arrow." Hero adds scissors crop. Final CTA gets film-strip top + pink splatter. |
| `/posse` | 5-face halftone mosaic absolutely-positioned across the intro. Big multi-line italic title. Posse grid cards rotate per nth-child with torn / tape / staple corners. Pink splatter accent. |
| `/release-day` | Big "MAY 29" ransom-note display title (`clamp(4.5rem, 14vw, 10rem)`). Submission form on cream paper with dashed red bottom-border inputs, mono uppercase labels, "SUBMISSION" rotated stamp top-right. "SEND IT ↗" ink-stamp button rotated -2deg with offset shadow. Hero adds red-circle accent. |
| `/widgets/three-documents` | Each `<article class="tdoc tdoc--punk">` = newspaper-style sheet with cream paper, low-opacity newspaper-page-detail backdrop, page-badge ribbon, per-doc rotation, REFUSE marginalia on doc 1, hand-drawn red underline beneath every h2. Doc 2 uses pink shadow + pink badge. |

Common pattern: cream paper background, rotated container, slide-detail
texture at low opacity, mono uppercase labels in red, italic Newsreader
headings, decorative accents from `--punk-*` vars.

---

## Reduced motion + print

Every rotating element (cards, ransom-note spans, beat tilts, hero accents)
checks `@media (prefers-reduced-motion: reduce)` and resets `transform`s.

Print stylesheet (`@media print` block at the bottom of `punk-graphics.css`)
hides every decorative pseudo-element and disables all rotations. The intent:
print pages should still be legible greyscale documents. Used by /workshop
print templates.

---

## Adding a new bespoke page treatment

The pattern that works for handcrafts:

1. Identify the existing page CSS file (`site/css/widgets/<page>.css` or
   `site/css/<page>.css` if top-level).
2. Add a punk modifier class to the relevant section/container in the HTML
   (e.g., `.tdoc--punk`, `.rd-portal--punk`, `.posse-intro--punk`).
3. In the CSS file, append a new "PUNK VARIANT" section that:
   - Sets `position: relative; isolation: isolate;` on the modifier
   - Layers texture via `::before` (background image at low opacity, pointer-events: none, z-index: -1 or 0)
   - Adds an accent via `::after` (slash, circle, refuse, splatter)
   - Repaints text colors for cream-paper backgrounds
   - Honors `prefers-reduced-motion` at the bottom
4. Test on the Vercel preview.
5. Commit on the same branch as `home(5b.N): /<page> — <description>`.

---

## Ships, doesn't ship

**Ships:**
- All 18 cropped slide assets
- Full theme + decoration layer
- Categorized header nav with hover/keyboard/mobile fallbacks
- Punk-treated landing page with 4 categorized sections + mega CTA
- Cascade `.punk-tile` decoration on every page (38/39 HTML files)
- Bespoke handcrafts on 5 pages: talk, lineage, posse, release-day,
  widgets/three-documents

**Doesn't ship in this pass (intentional):**
- Rafiki-generated web graphics (5 gap assets — prompts written, generation
  deferred)
- Worker deploys (Pattern Finder, Submissions)
- Custom font generation
- Animation library / JS animation
- Per-widget functionality changes — visual only

---

## File inventory

```
docs/
  PUNK-VISUAL-SYSTEM.md           ← this doc

assets/
  punk-asset-crops.json           ← crop manifest
  image-prompts/
    punk-web-graphics.md          ← Rafiki gap prompts

scripts/
  extract-punk-assets.mjs         ← crop pipeline (sharp + JSON manifest)

site/
  README.md                       ← site shell + dev guide (links here)
  css/
    theme.css                     ← tokens
    layout.css                    ← shell + nav + cards
    punk-graphics.css             ← decoration layer
    widgets/
      *.css                       ← per-page bespoke
  js/common/
    header.js                     ← partial include + active-route mark
    nav.js                        ← dropdown hover/ESC/click-outside
  partials/
    header.html                   ← categorized nav
    footer.html
  public/
    punk/*.webp                   ← 18 cropped assets
    fonts/*.woff2                 ← 5 self-hosted faces
```
