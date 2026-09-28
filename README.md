# Punk Rock AI
## Creative Mornings Vancouver — May 1, 2026

Talk by **Kris Krüg**. Hosted by **Mark Busse**.

**Talk delivered May 1, 2026. Release Day was May 29. The portal is live at [punkrockai.com](https://www.punkrockai.com/). The work continues.**

Last checked against `main` on 2026-09-28.

---

## What This Is

A keynote-in-the-round that became a working site. Kris opened, prompted the room, listened, then deployed truth bombs from a prepared cluster framework. Not a monologue. A conversation Kris was prepared to lead.

Theme: CREATE. Format: discussion-first. Duration: 20–25 min.

The repo now is the static learning portal: talk reel, field course, widgets, recap, and a Release Day page that outlived the deadline. Vanilla HTML / CSS / JS. No bundler. Push `main`, Vercel ships it.

---

## Current site

Canonical host: `https://www.punkrockai.com`. Apex `punkrockai.com` redirects there.

| Route | What it is |
|-------|------------|
| `/` | Landing — thesis, photos, paths into the work |
| `/talk` | 22-slide reel + quote wall |
| `/field-course` | Five-module path through the talk and widgets |
| `/recap` | Post-talk field notes |
| `/release-day` | Ship rubric + submission form (deadline passed; page still up) |
| `/library` | Searchable source index |
| `/lineage` | Dada → AI timeline |
| `/posse` | Audience map |
| `/workshop` | Printable kit |
| `/signal` | Slide-of-the-day |
| `/decisions` | Open questions + decision log |
| `/photos/michelle-diamond` | Event photos (Michelle Diamond) |
| `/photos/rick` | Event photos (Rick) |
| `/merch` | Shop page in the nav. Product copy is there; Shopify IDs are empty and the buttons say opening soon. [#154](https://github.com/WalksWithASwagger/cmvan-keynote/issues/154) is still open. **TODO for KK:** fill `site/data/merch.json` or take the page down. |
| `/widgets/cut-up` | Cut-up generator — keep a take, compare, export |
| `/widgets/*` | The rest of the widget rack (Three Documents, Both Hands, Selector, and friends) |
| `/feed.xml` | RSS for recap + field notes |

Full layout and widget rules: [`site/README.md`](site/README.md). Sitemap of the indexed public URLs: [`site/sitemap.xml`](site/sitemap.xml). `/merch` is in the nav today; it is not in the sitemap.

**Studio** is a GitHub sequence, not a public page yet. Parent: [#201](https://github.com/WalksWithASwagger/cmvan-keynote/issues/201). Image-export evidence said no-go on the current renderer (`docs/studio/image-export-evidence.md`). Critique baseline is fixture-only (`docs/studio/critique-evals.md`).

Footer also points at the Creative AI Human Lab network (KrisKrug.co, AI Garden, Gorgeous Ghost, Dark Crystal, unofficial.city, and the rest). Those are outbound links, not pages in this repo.

---

## Release Day status

Global Release Day was **Friday May 29, 2026**. That date has passed.

What's true in this repo right now:

- `/release-day` is still live. After the deadline the page says the work continues. The form is still there.
- Local smoke for the submissions handler: `npm run smoke:release-day`.
- A valid production write into Notion is still unproven. [#135](https://github.com/WalksWithASwagger/cmvan-keynote/issues/135) is still open.
- The gallery empty-state copy on the page still talks about May 22. That's the live HTML, not a claim that anything landed.

**TODO for KK:** keep the public form open, close it, or say what actually shipped. Don't invent a submission count here.

- [ ] Recording rights / clip usage (confirm with Mark)
- **TODO for KK:** social cadence after May 29 — did it happen? keep the hashtag?
- **TODO for KK:** long article (Banff + Both Hands Full + CMVan arc)
- **TODO for KK:** optional zine/PDF broadsheet from submissions

---

## Talk Sources

| File | What It Is |
|------|-----------|
| `script/talk-framework-v6.md` | **CURRENT DATA SOURCE** — parsed by `scripts/build-quotes.mjs` into the 22-slide portal data. |
| `script/talk-framework-v4.md` | **HISTORICAL LIVE FRAMEWORK** — discussion-first talk framework used during talk prep. |
| `script/creativity-biography.md` | **REFERENCE** — curated scenes, usable lines, 30-year story archive. |
| `dress-rehearsal/elevenlabs-full-script.md` | **AUDIO SCRIPT** — biography-forward rehearsal script. |
| `dress-rehearsal/generate-audio.py` | Generates MP3 from the audio script. Run with `ELEVENLABS_API_KEY` set: `python3 dress-rehearsal/generate-audio.py` |

---

## Historical Image Runs (v3 — 28 slides)

All runs in `assets/generated/slides/`. View via local server:

```bash
python3 -m http.server 7772 --directory assets/generated/slides
# then open: http://127.0.0.1:7772/viewer.html
```

| Run | Model | Slides | Prompt File |
|-----|-------|--------|-------------|
| `run-20260426-101433-hopecode-v2-gpt` | gpt-image-2 | 20 | hope-code-v2 (archived) |
| `run-20260426-113917-hopecode-v2-nano` | gemini-3-pro-image-preview | 20 | hope-code-v2 (archived) |

**v3 prompt files (28 slides, ready to run):**
- `assets/image-prompts/hope-code-v3-28-rafiki.md` — solar punk / Aurora Borealis / bioluminescent / mycelial
- `assets/image-prompts/punk-v2-28-rafiki.md` — xerox grain / cut-and-paste / blood red / zine

---

## Historical Slide Map (v3, 28 slides)

The current portal slide data is 22 slides in `site/data/slides.json`,
generated from `script/talk-framework-v6.md`. The map below is retained as
historical prompt-planning context.

1. Title — PUNK ROCK AI
2. The Permission Gap — "worldly"
3. The Camera Origin — NICU, Judah, Stanford 2001
4. 145,000 Frames — Flickr CC
5. Bryght / Dead.net — open source as values
6. Dada → Punks → DJs → AI
7. Burroughs / Situationists — deeper lineage
8. The Selector — generation is cheap, taste is not
9. The Feedback Loop — mastery compression + swarm looping
10. The Cutting Room Floor — taste lives in what you throw away
11. Vicki — the pattern you couldn't name
12. The AI Chapter — 1,800 scraped, non-consensual
13. The Three Fears — theft, pipeline, race to bottom
14. The Junior Pipeline — honest acknowledgment
15. Name What You See — stop saying bias
16. Frequent ≠ Fair — mirror reflects, doesn't correct
17. The Punk Condition — both hands full
18. What's Also True — liberation
19. The Analog Oasis — Galiano Island
20. Who Writes the Rules? — don't opt out
21. True North — Olympics guerrilla newsroom
22. Anthony Joseph — "they would've used it"
23. The Best Tool — the one you have with you
24. The Three Documents — policy, style guide, worldview
25. Write for the Bot — cultural activism
26. The Stubborn Human Soul — what remains
27. Release Day — May 29
28. Close — dead fish + "You coming?"

---

## Key Lines (nail these)

1. "I find my relationship with AI completely non-consensual."
2. "Both of those statements are true. At the exact same time."
3. "Stop saying bias. Name what you're seeing."
4. "Generation is cheap. Taste is not."
5. "What did you throw away this week?"
6. "If your values aren't in text, to AI they basically don't exist."
7. "Everyone thinks AI is a shortcut. Ha. Bullshit."
8. "The cutting room floor is where your taste actually lives."
9. "Any dead fish can float downstream. But it takes a live fish to swim against the current."
10. "Punk never was."
11. "You coming?"

---

## Docs

| File | What It Is |
|------|-----------|
| `AGENTS.md` | Agent operating contract for this portal |
| `docs/MARK-FEEDBACK.md` | Mark Busse's feedback + brain dump, formalized |
| `docs/PROJECT-ROADMAP.md` | Timeline and milestones (some dates are still pre-deadline) |
| `docs/ROADMAP-2026-05-07.md` | May 7 roadmap snapshot (historical baseline for post-talk hardening) |
| `docs/SESSION-HANDOFF.md` | May 29 shutdown note. Useful history. Not a current status board. |
| `docs/RELEASE-DAY-OPERATIONS.md` | Submission path, smoke, gallery publish/unpublish |
| `docs/DOCUMENTATION-AUDIT-2026-05-25.md` | Latest documentation reliability closeout, full link audit, and live smoke checkpoint |
| `docs/TECH-DEBT-MODERNIZATION-PLAN-2026-05-24.md` | Grounded technical debt audit and modernization plan |
| `docs/PROJECT-AUDIT-2026-05-08.md` | May 8 project/code audit snapshot and historical blocker list |
| `docs/LINEAR-GITHUB-PIPELINE.md` | GitHub is the only tracker as of 2026-09-06. Filename kept for old links. |
| `docs/AGENTIC-DELIVERY.md` | How a ready GitHub issue becomes a PR |
| `docs/studio/image-export-evidence.md` | Studio image/export feasibility (no-go on current renderer) |
| `docs/studio/critique-evals.md` | Studio critique fixture baseline (offline, no model calls) |
| `ops/roadmap/features.json` | Historical Linear/GitHub roadmap map still checked by `npm run eval` |
| `DEPLOYMENT.md` | Vercel production runbook plus Cloudflare fallback runbook |
| `OPEN-QUESTIONS.md` | Open items. Q6 and Q7 stay blocked on a named answer. |

---

## Commands

Static site, no bundler. Node 22+. `npm run dev` serves `site/` at http://localhost:3000.

Each build script reads source files in the repo and writes JSON/XML into `site/`. Re-run after editing the relevant inputs.

Run `npm run check` before pushing. It wraps the static-site eval, full
markdown link check, index-hygiene tests, agentic Python tests, Python compile
check, and dependency audit. `npm run eval` remains the faster site/contract
gate used by the agentic delivery loop.

| Command | Output | Inputs |
|---------|--------|--------|
| `npm run dev` | Local static server on port 3000 | `site/` |
| `npm run check` | Full local confidence gate | site eval, docs, index hygiene, Python tests, audit |
| `npm run eval` | Fast static-site and repo contract gate | JS syntax, JSON, routes, widget contracts, Vercel config, local smoke |
| `npm run seo:index-hygiene` | Search Console hygiene gate | public Markdown exposure, `.html` crawl targets, sitemap, canonical URLs |
| `npm run test:index-hygiene` | Node tests for the hygiene gate | `tests/index-hygiene.test.mjs` |
| `npm run docs:links` | Maintained-doc markdown link check | root docs, `docs/`, README/runbook surfaces |
| `npm run docs:links:all` | Full tracked-markdown link check | every tracked `*.md` file |
| `npm run test:agentic` | Python tests for the delivery loop | `tests/agentic` |
| `npm run check:python` | Compile-check agentic Python | `scripts/agentic`, `dress-rehearsal`, `tests/agentic` |
| `npm run smoke:release-day` | Local submissions API smoke | `api/submissions.js` |
| `npm run smoke:subscribe` | Local newsletter API smoke | `api/subscribe.js` |
| `npm run build:quotes` | `site/data/quotes.json` + slide stubs | `script/talk-framework-v6.md` |
| `npm run build:lineage` | validates `site/data/lineage.json` | lineage sources |
| `npm run build:library` | `site/data/library.json` | library sources |
| `npm run build:audio` | `site/data/audio-cues.json` | dress-rehearsal script |
| `npm run generate:cues` | per-slide cue audio | `ELEVENLABS_API_KEY` |
| `npm run build:decisions` | `site/data/decisions.json` | `OPEN-QUESTIONS.md`, `SESSION-HANDOFF.md` |
| `npm run ingest:slides` | WebP fallbacks + `slides.json` merge | `$SLIDES_SRC`, optional R2 vars |
| `node scripts/build-rss.mjs` | `site/feed.xml` | `site/recap.html`, `site/notes/*.html` |

To add a future field note: drop `site/notes/<slug>.html` with `<title>` + `<meta name="pubDate" content="YYYY-MM-DD">` + a `<meta name="description">` (or first `<p>` inside `<main>`), then re-run `node scripts/build-rss.mjs`.

---

## Secrets

Load local secrets with Varlock (`varlock load` / `varlock run`). Variable names live in [`.env.example`](.env.example). Never commit real values.

This repo does **not** have a committed `.env.schema` yet.

**TODO for KK:** add `.env.schema` here if you want Varlock schema checks in-tree. Until then, treat kk-kb `docs/AGENT-SECRETS-VARLOCK.md` as the house rule and keep placeholders only in git.

---

## Tracking

GitHub issues and PRs are the only planner as of 2026-09-06. No Linear account or sync is required. See [`docs/LINEAR-GITHUB-PIPELINE.md`](docs/LINEAR-GITHUB-PIPELINE.md) and [`docs/AGENTIC-DELIVERY.md`](docs/AGENTIC-DELIVERY.md).

---

## Archive

Everything pre-v2 lives in `archive/` — original monologue (v3), v1 image prompts, old slide outlines, pitch deck.

---

## Source Material

Raw inputs in `source-material/`: book draft, LaSalle transcript, Brazil talk, both-hands-full essay, taste-as-moat essay, Kevin Friel feature, voice/worldview docs.

---

## The Through-Line

Every chapter of Kris's 30-year creative life is the same move: pick up the tool, use it wrong, share what you learn, build community around it. AI is the latest chapter. The corporations build the infrastructure. The weirdos figure out what it's actually for.
