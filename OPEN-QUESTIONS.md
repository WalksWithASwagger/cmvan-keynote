# Open Questions

Contradictions found across the source documents. Resolve before locking the script.

---

## 1. What date is the talk? — **RESOLVED (May 1, 2026)**

**Canon:** **Thursday May 1, 2026** = Creative Mornings Vancouver field talk. **May 29, 2026** = global **Release Day** / CREATE activation (closing CTA in the room — ship something — not the Vancouver stage date).

Older sources (e.g. [#1570](https://github.com/WalksWithASwagger/kk-kb/issues/1570) draft text, stale README lines) may still say ~May 15 or conflate May 29 with the talk; treat those as superseded unless Mark publishes a different official schedule.

**Still verify:** chapter calendar on CreativeMornings.com and with Mark Busse — but project docs use **May 1** until any correction.

---

## 2. What's the actual talk structure? — **RESOLVED (discussion-first framework)**

**Canon (as of 2026-04-25, after Mark Busse feedback):**

The format is **not a straight monologue**. It's:
1. 2-min biographical intro (Kris's story, not credentials)
2. One honest statement + crowd prompt (~1 min)
3. Crowd discusses (~3–5 min)
4. Kris responds with truth bombs keyed to what the room raised (~15 min)
5. Close + Release Day CTA (~2 min)

**Primary script:** `script/talk-framework-v4.md`
**Reference/fallback:** `script/full-talk-script.md` (v3 monologue — keeps all the prose)

See `docs/MARK-FEEDBACK.md` for full context.

---

## 3. How many slides? — **RESOLVED (28 slides)**

**Canon (as of 2026-04-27):** **28 slides** — full narrative arc from Permission Gap through Close.

Two complete image prompt batches in Rafiki format:
- `assets/image-prompts/hope-code-v3-28-rafiki.md` — solar punk / Aurora Borealis / mycelial (HOPECODE style)
- `assets/image-prompts/punk-v2-28-rafiki.md` — xerox grain / cut-and-paste / blood red (zine style)

Both styles generated via Nano Pro (gemini-3-pro-image-preview) — 28 images each. gpt-image-2 runs blocked by OpenAI billing limit (add credit at platform.openai.com to unlock).

View in browser: `python3 -m http.server 7772 --directory assets/generated/slides` → `http://127.0.0.1:7772/viewer.html`

**Action still needed:** pick one style (or mixed) for the actual Canva/Keynote deck build.

---

## 4. What's the closing CTA — Release Day or FPC cohort?

Two different soft-launches are documented for the same talk:

- **[pitch/pitch-for-mark-busse.md](./pitch/pitch-for-mark-busse.md)** + issue #1570: closing CTA is the **Release Day Challenge** — ship something by May 29, possibly compiled into a punk-style zine/broadsheet.
- **[source-material/cmvan-context/fpc-relaunch-readme-FOR-REFERENCE.md](./source-material/cmvan-context/fpc-relaunch-readme-FOR-REFERENCE.md)**: closing beat is a **soft launch of Future Proof Creatives** with founding-member pricing for CMVan attendees.

**Action:** these aren't necessarily mutually exclusive (Release Day is the room-wide call; FPC is a quieter "if you want more, here's where to find me"). But pick one as the load-bearing close.

---

## 5. What's the companion site for?

The user mentioned "maybe even a companion website or something." Open scope. Possibilities:

- **Release Day landing page** — submission portal for audience projects, public gallery
- **Three Documents toolkit** — interactive prompts that walk a creative through writing their personal AI policy / style guide / worldview
- **Talk recap + clip library** — post-event home for video, transcript, frameworks
- **Punk-zine generator** — turn submitted Release Day projects into a digital broadsheet (the "full circle to Xerox culture" idea from the pitch notes)

**Action:** decide scope before writing code. Punkest answer is probably a single fast-loading page that serves the Release Day challenge.

---

## 6. Adobe involvement?

The CREATE theme was co-created with Adobe globally. Are they:
- A passive theme partner only (most likely)
- Sponsoring the chapter event
- Wanting product mentions / placement in slides
- Open to a Release Day partnership

**Action:** ask Mark.

---

## 7. Recording rights

CreativeMornings traditionally records and posts talks publicly. Confirm:
- Will this be recorded?
- Who owns the footage?
- When will it be released?
- Can clips be used pre-release for promo?
