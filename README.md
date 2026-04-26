# Punk Rock AI
## Creative Mornings Vancouver — May 1, 2026

Talk by **Kris Krüg**. Hosted by **Mark Busse**.

**5 days out. This is the live repo.**

---

## What This Is

A keynote-in-the-round. Kris opens, prompts the room, listens to what's actually on people's minds, then deploys truth bombs from a prepared cluster framework. Not a monologue. A conversation Kris is prepared to lead.

Theme: CREATE. Format: discussion-first. Duration: 20–25 min.

---

## The Live Scripts (USE THESE)

| File | What It Is |
|------|-----------|
| `script/talk-framework-v4.md` | **PRIMARY** — the live talk. Crowd prompt + modular truth bomb clusters. Deploy based on what the room raises. |
| `script/creativity-biography.md` | **REFERENCE** — curated scenes, usable lines, 30-year story archive. Pull from here in the room if needed. |
| `dress-rehearsal/elevenlabs-full-script.md` | **AUDIO SCRIPT v2** — biography-forward, ~2,500 words, ~19 min. For ElevenLabs dress rehearsal. |
| `dress-rehearsal/generate-audio.py` | Generates MP3 from the audio script. Run: `python3 dress-rehearsal/generate-audio.py` |

---

## Images (HOPECODE v2 — 20 slides)

Both runs in `assets/generated/slides/`. View via local server:

```bash
python3 -m http.server 7772 --directory assets/generated/slides
# then open: http://127.0.0.1:7772/viewer.html
```

| Run | Model | Slides |
|-----|-------|--------|
| `run-20260426-101433-hopecode-v2-gpt` | gpt-image-2 | 20 |
| `run-20260426-113917-hopecode-v2-nano` | gemini-3-pro-image-preview | 20 |

Prompt file: `assets/image-prompts/hope-code-v2-rafiki.md`

Earlier runs (zine style, 10 slides each) also available for comparison.

---

## Slide Map (v2, 20 slides)

1. Title — PUNK ROCK AI
2. The Permission Gap — "worldly"
3. The Camera Origin — NICU, Judah, Stanford 2001
4. 145,000 Frames — Flickr CC
5. Dada → Punks → DJs → AI
6. The Selector — generation is cheap, taste is not
7. The Feedback Loop — mastery compression + swarm looping
8. The Cutting Room Floor — taste lives in what you throw away
9. The AI Chapter — 1,800 scraped, non-consensual
10. The Three Fears — theft, pipeline, race to bottom
11. Name What You See — stop saying bias
12. Frequent ≠ Fair — mirror reflects, doesn't correct
13. The Punk Condition — both hands full
14. What's Also True — liberation
15. Who Writes the Rules? — don't opt out
16. The Three Documents — policy, style guide, worldview
17. Write for the Bot — cultural activism
18. The Stubborn Human Soul — what remains
19. Release Day — May 29
20. Close — dead fish + "You coming?"

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

## What's Still Open (5 days out)

- [ ] Pick which image run to use for the actual deck (GPT vs Nano — compare in viewer)
- [ ] Build the actual Canva/Keynote slide deck from chosen images
- [ ] Timed run-through (target: 22 min)
- [ ] Confirm Release Day / May 29 framing with Mark
- [ ] Companion site update (optional before May 1)

---

## Docs

| File | What It Is |
|------|-----------|
| `docs/MARK-FEEDBACK.md` | Mark Busse's feedback + brain dump, formalized |
| `docs/PROJECT-ROADMAP.md` | Timeline and milestones |
| `OPEN-QUESTIONS.md` | Open items |

---

## Archive

Everything pre-v2 lives in `archive/` — original monologue (v3), v1 image prompts, old slide outlines, pitch deck. It's there if you need it. Don't use it for May 1.

---

## Source Material

Raw inputs in `source-material/`: book draft, LaSalle transcript, Brazil talk, both-hands-full essay, taste-as-moat essay, Kevin Friel feature, voice/worldview docs.

---

## The Through-Line

Every chapter of Kris's 30-year creative life is the same move: pick up the tool, use it wrong, share what you learn, build community around it. AI is the latest chapter. The corporations build the infrastructure. The weirdos figure out what it's actually for.
