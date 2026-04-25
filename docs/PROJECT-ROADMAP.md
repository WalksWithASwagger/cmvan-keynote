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

| Phase | Window | Outcomes |
|-------|--------|----------|
| **A — Lock narrative** | Done | This roadmap; [NOTION-SYNC.md](./NOTION-SYNC.md); [PUBLICATION-BIBLIOGRAPHY.md](./PUBLICATION-BIBLIOGRAPHY.md); source-material indexed; script outline dates aligned |
| **A2 — Script refactor** | Now → Apr 28 | Mark's feedback formalized ([MARK-FEEDBACK.md](./MARK-FEEDBACK.md)); book draft ingested; creativity biography doc written; talk framework v4 (discussion-first) written |
| **B — Ship public minimum** | Before May 1 | `punkrockai.com` live: hero, dates, `#ReleaseDay2026` CTA; QR → companion |
| **C — Talk week** | May 1 | Deck + walk-in assets; talk framework v4 is primary script |
| **D — Release month** | May 1–29 | Social; optional CM virtual FieldTrips alignment |
| **E — Post-publish** | After May 29 | Long article (Banff + BHF + CMVan arc); optional zine/PDF |

---

## Repo map (quick links)

| Asset | Path |
|-------|------|
| Full script | [`script/full-talk-script.md`](../script/full-talk-script.md) |
| Quotes | [`script/quote-bank.md`](../script/quote-bank.md) |
| 10-slide deck | [`slides/deck-outline-with-notes.md`](../slides/deck-outline-with-notes.md) |
| Punk Rock AI zine prompts (10 + optional) | [`assets/image-prompts/punk-rock-ai-slide-prompts-zine.md`](../assets/image-prompts/punk-rock-ai-slide-prompts-zine.md) |
| Companion v1 | [`companion-site/index.html`](../companion-site/index.html) |
| Open decisions | [`OPEN-QUESTIONS.md`](../OPEN-QUESTIONS.md) |
| External citations | [`PUBLICATION-BIBLIOGRAPHY.md`](./PUBLICATION-BIBLIOGRAPHY.md) |
| Notion sync rules | [`NOTION-SYNC.md`](./NOTION-SYNC.md) |
| Deprecated BHF-adapted prompt stub | [`assets/image-prompts/cmvan-slides-01-15.md`](../assets/image-prompts/cmvan-slides-01-15.md) |

---

## Merge kb branch (optional)

CMVan folder on kk-bb may live on branch `chore/cmvan-2026-creative-mornings-mirror`. Open a PR when ready:  
https://github.com/WalksWithASwagger/kk-kb/pull/new/chore/cmvan-2026-creative-mornings-mirror
