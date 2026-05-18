# Punk Rock AI
## Creative Mornings Vancouver — May 1, 2026

Talk by **Kris Krüg**. Hosted by **Mark Busse**.

**Talk delivered May 1, 2026. Now in Release Month — ship something by May 29.**

---

## What This Is

A keynote-in-the-round. Kris opens, prompts the room, listens to what's actually on people's minds, then deploys truth bombs from a prepared cluster framework. Not a monologue. A conversation Kris is prepared to lead.

Theme: CREATE. Format: discussion-first. Duration: 20–25 min.

---

## Talk Sources

| File | What It Is |
|------|-----------|
| `script/talk-framework-v6.md` | **CURRENT DATA SOURCE** — parsed by `scripts/build-quotes.mjs` into the 22-slide portal data. |
| `script/talk-framework-v4.md` | **HISTORICAL LIVE FRAMEWORK** — discussion-first talk framework used during talk prep. |
| `script/creativity-biography.md` | **REFERENCE** — curated scenes, usable lines, 30-year story archive. |
| `dress-rehearsal/elevenlabs-full-script.md` | **AUDIO SCRIPT** — biography-forward rehearsal script. |
| `dress-rehearsal/generate-audio.py` | Generates MP3 from the audio script. Run: `python3 dress-rehearsal/generate-audio.py` |

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

## Post-Talk (May 1 → May 29)

- [ ] Release Day submissions open at punkrockai.com/release-day — closes May 29
- [ ] Social cadence through May 29 (#ReleaseDay2026)
- [ ] Recording rights / clip usage (confirm with Mark)
- [ ] Long article: Banff + Both Hands Full + CMVan arc
- [ ] Optional: zine/PDF broadsheet from submissions

---

## Docs

| File | What It Is |
|------|-----------|
| `docs/MARK-FEEDBACK.md` | Mark Busse's feedback + brain dump, formalized |
| `docs/PROJECT-ROADMAP.md` | Timeline and milestones |
| `docs/ROADMAP-2026-05-07.md` | Current post-talk roadmap refresh and prioritized backlog |
| `docs/DOCUMENTATION-AUDIT-2026-05-18.md` | Latest documentation sync, stale-reference audit, and tracker-status checkpoint |
| `docs/PROJECT-AUDIT-2026-05-08.md` | May 8 project/code audit snapshot and historical blocker list |
| `docs/LINEAR-GITHUB-PIPELINE.md` | Linear project, GitHub issue map, PR rules, and delivery contract |
| `ops/roadmap/features.json` | Machine-readable Linear/GitHub roadmap map checked by `npm run eval` |
| `DEPLOYMENT.md` | Vercel production runbook plus Cloudflare fallback runbook |
| `OPEN-QUESTIONS.md` | Open items |

---

## Build scripts

Static site, no bundler. Each script reads source files in the repo and writes JSON/XML into `site/`. Re-run after editing the relevant inputs.

Run `npm run eval` before pushing. It checks JavaScript syntax, JSON manifests, the Linear/GitHub roadmap map, local site references, header routes, and static Vercel config without needing credentials or a running server.

| Command | Output | Inputs |
|---------|--------|--------|
| `node scripts/build-rss.mjs` | `site/feed.xml` | `site/recap.html`, `site/notes/*.html` |
| `node scripts/build-decisions.mjs` | `site/data/decisions.json` | `OPEN-QUESTIONS.md`, `SESSION-HANDOFF.md` |
| `node scripts/build-quotes.mjs` | `site/data/quotes.json` | script + biography sources |
| `node scripts/build-lineage.mjs` | `site/data/lineage.json` | lineage sources |
| `node scripts/build-library-index.mjs` | `site/data/library.json` | library sources |
| `node scripts/build-audio-cues.mjs` | `site/data/audio-cues.json` | dress-rehearsal script |
| `node scripts/ingest-slides.mjs` | `site/data/slides.json` | slide manifest |

To add a future field note: drop `site/notes/<slug>.html` with `<title>` + `<meta name="pubDate" content="YYYY-MM-DD">` + a `<meta name="description">` (or first `<p>` inside `<main>`), then re-run `node scripts/build-rss.mjs`.

---

## Archive

Everything pre-v2 lives in `archive/` — original monologue (v3), v1 image prompts, old slide outlines, pitch deck.

---

## Source Material

Raw inputs in `source-material/`: book draft, LaSalle transcript, Brazil talk, both-hands-full essay, taste-as-moat essay, Kevin Friel feature, voice/worldview docs.

---

## The Through-Line

Every chapter of Kris's 30-year creative life is the same move: pick up the tool, use it wrong, share what you learn, build community around it. AI is the latest chapter. The corporations build the infrastructure. The weirdos figure out what it's actually for.
