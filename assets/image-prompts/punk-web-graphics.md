# Punk Web Graphics — Rafiki batch
## Web-native decorative assets for punkrockai.com
## Format: gpt-image-2 / gemini-3-pro-image-preview

*Companion to `punk-v2-28-rafiki.md`. These are the gap assets the slide deck doesn't already provide — small reusable graphic elements for the website. Same visual grammar: zine, xerox, halftone, B&W, blood red, pink as a real second accent. Each output drops into `site/public/punk/`.*

**Already cropped from existing slides** (see `assets/punk-asset-crops.json`): halftone faces, red slashes, hand-drawn boxes, refuse circle, torn corner, film strip, splotches, polaroid stack, scissors, staple, ransom headline, zine collage, title detail, newspaper page. **Do not regenerate those.**

**This file: only the 5 web-native pieces that don't exist on a slide.**

---

## 1. punk-bg-tile

**For:** Seamless tileable site-wide texture. Replaces the current SVG noise filter on hero/section backgrounds with something that has the dot-screen depth of the slide deck.
**Format:** webp, 1024×1024, tileable (edges must wrap)
**Aspect Ratio:** 1:1
**Output path:** `site/public/punk/punk-bg-tile.webp`
**Prompt:**
> Seamless tileable square texture, 1024×1024. Black background, dense xerox grain, halftone dot screen at varying densities, faint horizontal scanlines, occasional blood red ink fleck and hot pink splat scattered randomly. The texture should tile cleanly — no recognizable subject, no figure, no text. Pure surface. Feels like the gutter of a punk zine that's been photocopied seven times. No clean gradients. No vector look. Edges must wrap.

---

## 2. torn-paper-divider

**For:** Full-width torn-paper section divider for the website. Used as a `::before` SVG mask between landing-page sections.
**Format:** svg (preferred for crispness at any width), or transparent png 2400×120
**Aspect Ratio:** 20:1
**Output path:** `site/public/punk/torn-paper-divider.svg`
**Prompt:**
> A horizontal strip, 2400 wide × 120 tall, on a transparent background. The top half is cream paper (#fff8ee) with a slight shadow underneath. The bottom edge of the cream is torn — irregular, rough, hand-ripped, with small fibers and the occasional micro-curl. The bottom half is transparent so it can sit on any background. No text. No drop shadow softer than 4px. The torn edge should feel violent, not decorative — like someone ripped this in a hurry.

---

## 3. pink-splatter-set

**For:** Six discrete hand-drawn ink splat shapes for scattering across pages as accents. Each shape ~200×200, transparent background. Used as decorative `::before` overlays on cards, callouts, headers.
**Format:** SVG sprite sheet OR 6 separate transparent webp files at 400×400 each (will scale down)
**Aspect Ratio:** 1:1 each
**Output path:** `site/public/punk/splatter-pink-{01..06}.webp` (or `.svg` set)
**Prompt:**
> Six distinct ink splat shapes on transparent backgrounds, each ~400×400. Three are hot pink (#ff3d8a), three are blood red (#e11d2e). Each shape is irregular, hand-drawn, with droplets, drips, and a few micro-spatters around the main blob. No two should look alike. No subject, no text. Feel: shaken-bottle accident, not a graphic-design "splat." Edges should be slightly rough, not perfectly anti-aliased.

---

## 4. arrow-handdrawn-set

**For:** Hand-drawn red arrows in 4 angles for showing flow between sections (input → output, step 1 → step 2). Used as positioned overlays on widget pages.
**Format:** SVG sprite (preferred) or 4 transparent webp at 300×300 each
**Aspect Ratio:** 1:1 each
**Output paths:** `site/public/punk/arrow-down-right.svg`, `arrow-right.svg`, `arrow-curve-right.svg`, `arrow-zigzag-down.svg`
**Prompt:**
> Four hand-drawn arrows, blood red ink (#e11d2e), each on a transparent background at ~300×300. Style: ballpoint pen on graph paper, shaky line, the kind a teacher draws on a whiteboard mid-sentence. Variants:
> 1. Straight arrow pointing right with a bent shaft
> 2. Arrow curving right and down (J-shape)
> 3. Loose squiggle arrow pointing down-right
> 4. Zigzag arrow pointing down with three bends
> Each arrow has a clearly defined arrowhead (filled triangle, slightly off-axis). Lines should look like they were drawn fast, not traced. Slightly variable line weight. No double-tracing.

---

## 5. loading-halftone

**For:** Small animated/static halftone shape for `/widgets/pattern-finder` async fetch state. Replaces a generic spinner.
**Format:** SVG (animatable via CSS) or transparent webp at 300×300
**Aspect Ratio:** 1:1
**Output path:** `site/public/punk/loading-halftone.svg`
**Prompt:**
> A 300×300 SVG of a halftone-dot circle, transparent background. The circle is built from black dots arranged in a radial gradient: dense at the center, sparse at the edge. Dots vary slightly in size (1.5–4px). Style: photocopy-on-photocopy, each dot has a tiny imperfect edge. The shape should suggest motion (like a record spinning) but as a static image. CSS will animate it — the SVG just needs to be visually rich enough that rotation feels meaningful.

---

## Generation notes

- **Model:** gpt-image-2 (or gemini-3-pro-image-preview as fallback)
- **Output:** save into `site/public/punk/` directly so deploys pick them up
- **Verification:** after generation, run a smoke test: open landing page and check that all 5 referenced URLs return 200
- **Performance budget:** total weight of these 5 assets ≤500KB (all small surface decorations)

## When generation lands

These prompts are **not yet executed**. They sit here for the next time the image-gen pipeline runs. Until then, the site uses the 18 cropped slide assets (which carry most of the load) plus pure-CSS fallbacks (radial gradients, SVG noise filters) where decorations are missing.

Cost-conscious sequence:
1. Ship the refactor with cropped slide assets only (already 18 of them, plenty)
2. Live-test the site for a week, see which decorations users actually notice
3. Generate only the 1–2 pieces from this file that proved missing in practice

---

#design #web #punk-rock-ai #rafiki #image-gen
