# Punk Rock AI — project roadmap and publication hub

**Canonical working repo:** [cmvan-keynote](https://github.com/WalksWithASwagger/cmvan-keynote)  
**KB mirror:** [creative-mornings-vancouver-may-2026](file:///Users/kk/Code/notion-local/kk-ai-ecosystem/content/projects/02-bc-ai-ecosystem-nonprofit/speaking-engagements/2026/creative-mornings-vancouver-may-2026/) (kk-bb)  
**Tracking:** [kk-kb#1570](https://github.com/WalksWithASwagger/kk-kb/issues/1570)

**Notion (share + staging):** [Punk CEO workspace](https://is.kriskrug.ai/punk-ceo?source=copy_link) — keep in sync with this repo using [NOTION-SYNC.md](./NOTION-SYNC.md).

---

## Dates (canon)

| What | When |
|------|------|
| **Creative Mornings Vancouver — field talk** | **Thursday May 1, 2026** |
| **Global Release Day** (Creative Quests × CM × Adobe) | **Friday May 29, 2026** |

Do not conflate the two on public copy or slide footers.

---

## Domains and routing (registered)

| Domain | Intended role | Technical |
|--------|----------------|-----------|
| **punkrockai.com** | Canonical public site: thesis, talk date, Release Day CTA, links to Three Documents / BC + AI / Vancouver AI | Apex + `www` → static host (see below) |
| **punk.ceo** | Short / cheek URL: 301 to `punkrockai.com` **or** single-page manifesto at same deploy | 301 redirect at registrar **or** CNAME + path rule on host |
| **plump.co** | **TBD** — pick one: (A) editorial / second voice surface, (B) newsletter archive, (C) 301 to punkrockai.com | Document choice here when decided: _________________ |

**Hosting target:** Static deploy from [`companion-site/`](../companion-site/) (`index.html` + `styles.css`). Compatible with **GitHub Pages**, **Netlify**, or **Cloudflare Pages**. Point all apex domains at the same project; use HTTPS everywhere.

**DNS checklist (human):**

- [ ] `punkrockai.com` A/AAAA or CNAME → host
- [ ] `www.punkrockai.com` → same
- [ ] `punk.ceo` → redirect or CNAME
- [ ] `plump.co` → per decision above
- [ ] SSL certificates issued (usually automatic on modern hosts)

---

## Pre-publish verification (required)

- [ ] **May 2026 global theme label:** Pitch materials use **CREATE** (Adobe co-created). Official CM theme numbering may differ by month; **confirm exact wording with Mark Busse / chapter comms** before printing “CREATE” on the public site. Release Day copy may still cite [official Release Day URLs](./PUBLICATION-BIBLIOGRAPHY.md#creativemornings--adobe-release-day).
- [ ] **CreativeMornings / Adobe:** Paraphrase program language; link to official pages for hashtags and participant instructions (see bibliography).
- [ ] **Photos / b-roll:** Rights for any face or venue on punkrockai.com.
- [ ] **Kevin Friel quotes:** Confirm “Pixel Wizard” vs “Pixel Vision” for public use ([feature README](https://github.com/WalksWithASwagger/kk-kb/blob/main/content/projects/01-vancouver-ai-community/special-features/kevin-friel/README.md) in kb).
- [ ] **Banff / summit excerpts:** If publishing long-form pulls from Banff transcripts, confirm consent / attribution rules for named speakers.

---

## Roadmap phases

| Phase | Window | Status | Outcomes |
|-------|--------|--------|----------|
| **A — Lock narrative** | Done | ✅ | This roadmap; [NOTION-SYNC.md](./NOTION-SYNC.md); [PUBLICATION-BIBLIOGRAPHY.md](./PUBLICATION-BIBLIOGRAPHY.md); source-material indexed; script outline dates aligned |
| **A2 — Script refactor** | Apr 25 | ✅ | Mark's feedback formalized ([MARK-FEEDBACK.md](./MARK-FEEDBACK.md)); book draft ingested ([source-material/life-love-internet/](../source-material/life-love-internet/)); creativity biography doc written; talk framework v4 (discussion-first) written |
| **A3 — Visual + audio draft** | Apr 25 | ✅ | 10 zine prompts in Rafiki format; gpt-image-2 + Nano Pro full-deck runs; ElevenLabs dress rehearsal audio generated (`dress-rehearsal/punk-rock-ai-full-talk.mp3`, gitignored); generation script committed |
| **A4 — 28-slide expansion** | Apr 27 | ✅ | 8 new content sections (Bryght/Dead.net, Burroughs/Situationists, Vicki, Junior Pipeline, Galiano, True North, Anthony Joseph, Best Tool); HOPECODE v3 + punk v2 prompt files; Nano Pro runs complete (28 slides each); audio script v3 (~28 min); audio regenerated |
| **B — Ship public minimum** | Before May 1 | 🔲 | `punkrockai.com` live: hero, dates, `#ReleaseDay2026` CTA; QR → companion site |
| **C — Talk week** | May 1 | 🔲 | Final slide deck built from chosen images; talk framework v4 rehearsed in discussion-first format; confirm recording rights with Mark |
| **D — Release month** | May 1–29 | 🔲 | Social cadence; Release Day submissions; optional CM virtual FieldTrips alignment |
| **E — Post-publish** | After May 29 | 🔲 | Long article (Banff + BHF + CMVan arc); optional zine/PDF; talk recording posted |

### Before May 1 — remaining blockers (4 days out, as of Apr 27)

1. **Final slide deck** — open viewer, pick style (HOPECODE vs punk/zine or mixed), build Keynote/Canva from chosen images
2. **Timed run-through** — say the v4 discussion-first framework out loud; clock it at 22 min; adjust which truth bombs to deploy
3. **Close OPEN-QUESTIONS #4** — Release Day CTA vs FPC soft-launch: pick one as the load-bearing close
4. **Confirm with Mark** — recording rights (Q#7); Adobe involvement level (Q#6); any last format notes
5. **punkrockai.com DNS** — apex + www should resolve before May 1 (QR points here)
6. **OpenAI billing** (optional) — raise spending cap at platform.openai.com if gpt-image-2 comparison images are wanted

---

## Repo map (quick links)

| Asset | Path | Notes |
|-------|------|-------|
| **PRIMARY SCRIPT** (discussion-first) | [`script/talk-framework-v4.md`](../script/talk-framework-v4.md) | Modular truth bomb clusters; use this May 1 |
| Creativity biography reference | [`script/creativity-biography.md`](../script/creativity-biography.md) | 11 curated scenes; pull from in the room |
| ElevenLabs audio script v3 | [`dress-rehearsal/elevenlabs-full-script.md`](../dress-rehearsal/elevenlabs-full-script.md) | ~28 min, full 28-section biography-forward prose |
| HOPECODE v3 image prompts (28 slides) | [`assets/image-prompts/hope-code-v3-28-rafiki.md`](../assets/image-prompts/hope-code-v3-28-rafiki.md) | Solar punk / Aurora Borealis / mycelial |
| Punk v2 image prompts (28 slides) | [`assets/image-prompts/punk-v2-28-rafiki.md`](../assets/image-prompts/punk-v2-28-rafiki.md) | Xerox grain / blood red / cut-and-paste |
| Generated slide images | `assets/generated/slides/` | gitignored; 8 runs; viewer at `assets/generated/slides/viewer.html` |
| ElevenLabs audio generator | [`dress-rehearsal/generate-audio.py`](../dress-rehearsal/generate-audio.py) | Run: `python3 dress-rehearsal/generate-audio.py` |
| Dress rehearsal audio | `dress-rehearsal/punk-rock-ai-full-talk.mp3` | gitignored; ~28 min; regenerate with generator |
| Book draft (biography source) | [`source-material/life-love-internet/life-love-internet-book-draft.md`](../source-material/life-love-internet/life-love-internet-book-draft.md) | Primary biographical source |
| Mark's feedback | [`docs/MARK-FEEDBACK.md`](./MARK-FEEDBACK.md) | Discussion-first format direction; brain dump |
| Companion site v1 | [`companion-site/index.html`](../companion-site/index.html) | Needs DNS before May 1 |
| Open decisions | [`OPEN-QUESTIONS.md`](../OPEN-QUESTIONS.md) | Q4, Q6, Q7 still open |
| External citations | [`PUBLICATION-BIBLIOGRAPHY.md`](./PUBLICATION-BIBLIOGRAPHY.md) | |
| Notion sync rules | [`NOTION-SYNC.md`](./NOTION-SYNC.md) | |

---

## Merge kb branch (optional)

CMVan folder on kk-bb may live on branch `chore/cmvan-2026-creative-mornings-mirror`. Open a PR when ready:  
https://github.com/WalksWithASwagger/kk-kb/pull/new/chore/cmvan-2026-creative-mornings-mirror
