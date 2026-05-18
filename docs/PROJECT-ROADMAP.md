# Punk Rock AI — project roadmap and publication hub

**Canonical working repo:** [cmvan-keynote](https://github.com/WalksWithASwagger/cmvan-keynote)  
**KB mirror:** `/Users/kk/Code/notion-local/kk-ai-ecosystem/content/projects/02-bc-ai-ecosystem-nonprofit/speaking-engagements/2026/creative-mornings-vancouver-may-2026/` (kk-bb)

**Tracking:** [kk-kb#1570](https://github.com/WalksWithASwagger/kk-kb/issues/1570)  
**Linear project:** [Punk Rock AI Release Day Roadmap](https://linear.app/bc-ai/project/punk-rock-ai-release-day-roadmap-eeed425b8d78)  
**Delivery pipeline:** [LINEAR-GITHUB-PIPELINE.md](./LINEAR-GITHUB-PIPELINE.md) with machine-readable map at [`ops/roadmap/features.json`](../ops/roadmap/features.json)

**Notion (share + staging):** [Punk CEO workspace](https://is.kriskrug.ai/punk-ceo?source=copy_link) — keep in sync with this repo using [NOTION-SYNC.md](./NOTION-SYNC.md).

**Current roadmap refresh:** [ROADMAP-2026-05-07.md](./ROADMAP-2026-05-07.md) captures the post-talk project/code/doc review, the May 7 status, and the next Release Day / portal hardening waves.

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

**Hosting target (live):** Vercel — project `punkrockai` on team `walkswithaswaggers-projects`. Output dir = `site/`. `vercel.json` carries the active Vercel headers plus explicit rewrite/redirect exceptions; `cleanUrls: true` serves extensionless routes. Pushes to `main` auto-deploy to production.

**Deployment runbook:** [`DEPLOYMENT.md`](../DEPLOYMENT.md) is Vercel-first. Cloudflare Pages and Workers are preserved there as fallback paths, not as the active production host/API layer.

**DNS:** Porkbun ALIAS `punkrockai.com` → `cname.vercel-dns.com`, plus wildcard CNAME `*.punkrockai.com` → `cname.vercel-dns.com`. SSL provisioned by Vercel automatically (Let's Encrypt _acme-challenge TXT records visible on the zone).

**Visual system:** see [`PUNK-VISUAL-SYSTEM.md`](./PUNK-VISUAL-SYSTEM.md) for the punk decoration layer, color tokens, asset pipeline, and per-page bespoke handcrafts.

**DNS checklist:**

- [x] `punkrockai.com` ALIAS → cname.vercel-dns.com
- [x] `*.punkrockai.com` CNAME → cname.vercel-dns.com (covers `www`)
- [x] SSL via Vercel + Porkbun _acme-challenge TXT records
- [ ] `punk.ceo` → redirect or CNAME (still TBD)
- [ ] `plump.co` → per decision above

---

## Pre-publish verification (required)

- [ ] **May 2026 global theme label:** Pitch materials use **CREATE** (Adobe co-created). Official CM theme numbering may differ by month; **confirm exact wording with Mark Busse / chapter comms** before printing “CREATE” on the public site. Release Day copy may still cite [official Release Day URLs](./PUBLICATION-BIBLIOGRAPHY.md#creativemornings--adobe-release-day).
- [ ] **CreativeMornings / Adobe:** Paraphrase program language; link to official pages for hashtags and participant instructions (see bibliography).
- [ ] **Photos / b-roll:** Rights for any face or venue on punkrockai.com.
- [x] **Kevin Friel quotes:** ~~Confirm “Pixel Wizard” vs “Pixel Vision”~~ — **CONFIRMED: “Pixel Wizard.”** Handle is @mrpixelwizard everywhere. Safe to publish.
- [ ] **Banff / summit excerpts:** If publishing long-form pulls from Banff transcripts, confirm consent / attribution rules for named speakers.

---

## Roadmap phases

| Phase | Window | Status | Outcomes |
|-------|--------|--------|----------|
| **A — Lock narrative** | Done | ✅ | This roadmap; [NOTION-SYNC.md](./NOTION-SYNC.md); [PUBLICATION-BIBLIOGRAPHY.md](./PUBLICATION-BIBLIOGRAPHY.md); source-material indexed; script outline dates aligned |
| **A2 — Script refactor** | Apr 25 | ✅ | Mark's feedback formalized ([MARK-FEEDBACK.md](./MARK-FEEDBACK.md)); book draft ingested ([source-material/life-love-internet/](../source-material/life-love-internet/)); creativity biography doc written; talk framework v4 (discussion-first) written |
| **A3 — Visual + audio draft** | Apr 25 | ✅ | 10 zine prompts in Rafiki format; gpt-image-2 + Nano Pro full-deck runs; ElevenLabs dress rehearsal audio generated (`dress-rehearsal/punk-rock-ai-full-talk.mp3`, gitignored); generation script committed |
| **A4 — 28-slide expansion** | Apr 27 | ✅ | 8 new content sections (Bryght/Dead.net, Burroughs/Situationists, Vicki, Junior Pipeline, Galiano, True North, Anthony Joseph, Best Tool); HOPECODE v3 + punk v2 prompt files; Nano Pro runs complete (28 slides each); audio script v3 (~28 min); audio regenerated |
| **B — Ship public minimum** | Before May 1 | ✅ | `punkrockai.com` live; hero, dates, `#ReleaseDay2026` CTA; QR → companion site |
| **C — Talk week** | May 1 | ✅ | Talk delivered May 1, 2026. 22-slide zine deck. Discussion-first format. |
| **D — Release month** | May 1–29 | 🟡 | Social cadence; Release Day submissions open; recording rights and live Notion/gallery proof still need human/account confirmation |
| **E — Post-publish** | After May 29 | 🔲 | Long article (Banff + BHF + CMVan arc); optional zine/PDF; talk recording posted |
| **P — punkrockai.com portal** | May 1 → ongoing | 🟡 hardening | Interactive learning portal at `site/`; full visual treatment, widget rack, release ops scaffolds, and delivery contract are shipped; remaining work is QA/account proof |

### Phase D — Release month blockers (updated May 18, 2026)

1. **Recording rights** — confirm with Mark: recorded? owner? release date? clips OK now?
2. **Adobe involvement** — note what role they actually played on May 1
3. **Release Day submissions** — credential-free smoke harness is merged; still needs a real browser-to-Notion row in preview or production. GitHub #135 remains open; Linear BC-51 is in review and human-gated. Backend live: Vercel `/api/submissions` -> Notion DB `8b72685121ce499fbd0b4cceee9a0d52`
4. **Moderation-to-gallery proof** — operator path is documented, but BC-53 is still in review until an approved/published Notion row is proven on `/release-day`.
5. **punk.ceo / plump.co routing** — still TBD (see domains table above)

---

## Repo map (quick links)

| Asset | Path | Notes |
|-------|------|-------|
| **Portal data source** (slides + quotes) | [`script/talk-framework-v6.md`](../script/talk-framework-v6.md) | Current — `build-quotes.mjs` → `site/data/slides.json`, `quotes.json` |
| **Discussion-first framework** (May 1) | [`script/talk-framework-v4.md`](../script/talk-framework-v4.md) | Historical — room format per Mark's feedback |
| **v3 monologue** (full prose) | [`archive/script/full-talk-script-v3-monologue.md`](../archive/script/full-talk-script-v3-monologue.md) | Archived reference |
| Creativity biography reference | [`script/creativity-biography.md`](../script/creativity-biography.md) | 11 curated scenes; pull from in the room |
| ElevenLabs audio script v3 | [`dress-rehearsal/elevenlabs-full-script.md`](../dress-rehearsal/elevenlabs-full-script.md) | ~28 min, full 28-section biography-forward prose |
| HOPECODE v3 image prompts (28 slides) | [`assets/image-prompts/hope-code-v3-28-rafiki.md`](../assets/image-prompts/hope-code-v3-28-rafiki.md) | Solar punk / Aurora Borealis / mycelial |
| Punk v2 image prompts (28 slides) | [`assets/image-prompts/punk-v2-28-rafiki.md`](../assets/image-prompts/punk-v2-28-rafiki.md) | Xerox grain / blood red / cut-and-paste |
| Generated slide images | `assets/generated/slides/` | gitignored; 8 runs; viewer at `assets/generated/slides/viewer.html` |
| ElevenLabs audio generator | [`dress-rehearsal/generate-audio.py`](../dress-rehearsal/generate-audio.py) | Run: `python3 dress-rehearsal/generate-audio.py` |
| Dress rehearsal audio | `dress-rehearsal/punk-rock-ai-full-talk.mp3` | gitignored; ~28 min; regenerate with generator |
| Book draft (biography source) | [`source-material/life-love-internet/life-love-internet-book-draft.md`](../source-material/life-love-internet/life-love-internet-book-draft.md) | Primary biographical source |
| Mark's feedback | [`docs/MARK-FEEDBACK.md`](./MARK-FEEDBACK.md) | Discussion-first format direction; brain dump |
| Companion site v1 | [`companion-site/index.html`](../companion-site/index.html) | Historical pre-portal companion site |
| Open decisions | [`OPEN-QUESTIONS.md`](../OPEN-QUESTIONS.md) | Q6 and Q7 still need post-talk human answers |
| External citations | [`PUBLICATION-BIBLIOGRAPHY.md`](./PUBLICATION-BIBLIOGRAPHY.md) | |
| Notion sync rules | [`NOTION-SYNC.md`](./NOTION-SYNC.md) | |

---

## KB mirror status

The kk-bb mirror path above exists on the local `kk-ai-ecosystem` main branch.
The older `chore/cmvan-2026-creative-mornings-mirror` branch guidance is
historical; do not create work from that branch name unless live Git state says
it has been restored.

---

## Portal phase — `site/` (punkrockai.com)

The interactive learning portal that turns the talk into a working set of widgets. Vanilla HTML/CSS/JS, zero runtime deps. Tracked as epic [#1](https://github.com/WalksWithASwagger/cmvan-keynote/issues/1). Dev onboarding lives at [`site/README.md`](../site/README.md).

### Phase 1 — Foundation + four widgets (shipped)

| Issue | Title | Commit | Notes |
|-------|-------|--------|-------|
| [#2](https://github.com/WalksWithASwagger/cmvan-keynote/issues/2) | Foundation scaffold | `ab545e5` | site/ tree, theme tokens, header/footer includes, storage helpers |
| [#3](https://github.com/WalksWithASwagger/cmvan-keynote/issues/3) | R2 ingest pipeline | `ab5dedf` | Code lands; running blocked on R2 creds + `SLIDES_SRC` |
| [#4](https://github.com/WalksWithASwagger/cmvan-keynote/issues/4) | Slide reel + quote wall | `3ef0890` | All 19 quotes mapped, 22 slides extracted, native `<dialog>` lightbox |
| [#5](https://github.com/WalksWithASwagger/cmvan-keynote/issues/5) | Three Documents builder | `0397049` | Local-first, autosave, MD + bot-prompt export |
| [#6](https://github.com/WalksWithASwagger/cmvan-keynote/issues/6) | Both Hands Full canvas | `e0ec5a7` | Diptych, up/down reorder, html-to-image PNG export, share-via-hash |
| [#7](https://github.com/WalksWithASwagger/cmvan-keynote/issues/7) | Lineage timeline | `8c9d3ab` | Six beats Dada → AI, IntersectionObserver reveal, recurring refrain |

Phase 1 outputs verified: every route returns 200, every JS module passes `node --check`, every Phase 1 issue has a status comment with acceptance criteria.

### Phase 2 — Widget rack expansion (shipped)

| Issue | Title | Status | Notes |
|-------|-------|--------|-------|
| [#9](https://github.com/WalksWithASwagger/cmvan-keynote/issues/9) | Taste Audit / Cutting Room Floor | ✅ | Text-first; image upload deferred to a future follow-up if needed |
| [#10](https://github.com/WalksWithASwagger/cmvan-keynote/issues/10) | Name What You See | ✅ | Five hand-curated bias case studies |
| [#11](https://github.com/WalksWithASwagger/cmvan-keynote/issues/11) | Audio sync | 🟡 scaffold | Cue extractor + player; mp3 hosting blocked on ElevenLabs run + R2 |
| [#12](https://github.com/WalksWithASwagger/cmvan-keynote/issues/12) | `/library` searchable | 🔄 | 63 markdown files indexed; Fuse.js client-side fuzzy search |

### Phase 3 — Community + intelligence (scaffolds + scopes)

| Issue | Title | Status | Notes |
|-------|-------|--------|-------|
| [#13](https://github.com/WalksWithASwagger/cmvan-keynote/issues/13) | Pattern Finder LLM | ✅ fallback-only for Release Day | Decision landed via #139/#144; Cloudflare Worker remains a later opt-in once model budget, rate limits, privacy copy, and abuse controls are accepted |
| [#14](https://github.com/WalksWithASwagger/cmvan-keynote/issues/14) | Release Day portal | 🟡 live path, smoke needed | Vercel `/api/submissions` writes to Notion when env vars are configured; end-to-end production smoke test tracked in #135 / BC-51 |
| [#15](https://github.com/WalksWithASwagger/cmvan-keynote/issues/15) | `/posse` audience map | 🔄 | 20 hand-curated profiles from `research/audience-rsvp-may1.md` |
| [#16](https://github.com/WalksWithASwagger/cmvan-keynote/issues/16) | Decisions log | 🔄 | Renders `OPEN-QUESTIONS.md` + `SESSION-HANDOFF.md` |

### Outstanding handoffs (you-only)

- **R2 + slide imagery:** Cloudflare account with R2, an Object R/W token, bucket name, public URL prefix. Path to local slide source folder set as `SLIDES_SRC`. Once landed: `npm run ingest:slides`.
- **ElevenLabs run:** `python3 dress-rehearsal/generate-audio.py` to generate mp3s, upload per-slide clips to R2, re-run `npm run build:audio`. The `/talk` page wires up automatically.
- **Pattern Finder backend decision:** fallback-only for the Release Day push; revisit Cloudflare Worker or Vercel function only after accepting model budget, rate limits, privacy copy, and abuse controls (#139 / BC-56).
- **Browser QA / Lighthouse:** PR #142 merged the current QA report, `/library` Lighthouse coverage, preview-access notes, safe fixes, and performance follow-up findings; #138 is complete.
- **OPEN-QUESTIONS.md Q6 + Q7** — fill in Adobe involvement and recording rights post-talk.
- **punk.ceo / plump.co** — decide routing per domains table and configure at registrar.

### Shipped May 5, 2026

- GA4 analytics (`G-NZ9H74R399`) via `header.js` — all 40+ pages covered
- Beehiiv newsletter form in footer — `/api/subscribe` Vercel function, env vars set
- Release Day submission portal — `/api/submissions` Vercel function → Notion DB `8b72685121ce499fbd0b4cceee9a0d52`
- Full visual treatment: all 9 main nav pages + all 29 widget pages — unique per-page hero photos, slide textures, punk accents
- CSS `--hero-photo` variable for per-page hero overrides without touching 40+ HTML files
