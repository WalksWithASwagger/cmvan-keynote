# Companion site — Punk Rock AI (CMVan)

Minimal **v1 spec** for a public page you can link from slides (QR) after **May 1, 2026**, and keep live through **Release Day (May 29, 2026)**.

## Purpose

1. **Give the room something to do** — Three Documents starter, “write for the bot” micro-prompt, optional creative-DNA line.
2. **Separate dates clearly** — “Talk happened May 1” vs “Release Day is May 29 — ship something.”
3. **Stay punkest** — one fast static page (HTML + a little CSS). No auth, no database, for v1.

## Structural template

Mirror the interactive patterns from the LaSalle delivery — see [`../source-material/lasalle/COMPANION-SITE-REFERENCE.md`](../source-material/lasalle/COMPANION-SITE-REFERENCE.md) (canonical `both-hands-full.html` path in kk-bb).

## Proposed information architecture

| Section | Content |
|---------|---------|
| **Hero** | Title *Punk Rock AI* + one-line thesis (Xerox / stolen work / both true). Date line: **CMVan · May 1, 2026**. |
| **Both hands full** | Short paragraph + optional diagram (left hand / right hand) — same metaphor as talk. |
| **Three documents** | Bullet list: Personal policy · Style guide · Worldview — link to KB templates or downloadable `.md` / Google Doc when ready. |
| **Write for the bot** | Single textarea + “copy” button; optional one saved line to localStorage (LaSalle pattern). |
| **Creative DNA** | One prompt: “What would you never give to AI?” — textarea only. |
| **Release Day** | **May 29, 2026** — what “ship something” means; link to global CREATE / chapter submission if Mark provides URL. |
| **Footer** | Host thank-you, link to BC + AI / Vancouver AI, contact. |

## QR strategy

- **During talk:** QR to this companion URL (or a short redirect you control).
- **Deep anchors:** optional `#three-documents`, `#write-for-the-bot` for social clips.

## v2 (defer)

- Gallery of audience Release Day submissions.
- “Zine generator” PDF from form input.
- FPC / course CTA — only if reconciled with talk close (see `OPEN-QUESTIONS.md` §4).

## Build note

**v1 shipped in repo:** [`index.html`](./index.html) + [`styles.css`](./styles.css). Deploy the **folder root** as the site root (so `styles.css` resolves). Point **punkrockai.com** (and optional redirects) at this static bundle — see [`../docs/PROJECT-ROADMAP.md`](../docs/PROJECT-ROADMAP.md#domains-and-routing-registered).

Add real URLs for Three Documents templates when ready (kb, Google Doc, or download links).
