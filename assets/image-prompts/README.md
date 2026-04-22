# Image & motion pack — Punk Rock AI (CMVan)

Single working area for **slide stills**, **walk-in b-roll**, and **HeyGen / ElevenLabs** dress-rehearsal specs.

## Where everything lives

| Need | File |
|------|------|
| **Hero + walk-in + avatar script (canonical)** | [`../slides/image-gen-prompts.md`](../slides/image-gen-prompts.md) — keep Midjourney hero trio, Runway macro, HeyGen script here |
| **15-slide zine prompt bank (CMVan-adapted)** | [`cmvan-slides-01-15.md`](./cmvan-slides-01-15.md) — derived from WAIFF Brazil `Both Hands Full` pipeline ([`../../source-material/waiff-brazil/uai-film-festival-brazil-2026-image-prompts.md`](../../source-material/waiff-brazil/uai-film-festival-brazil-2026-image-prompts.md)) |
| **Design bible (typography, B/W/R, texture rules)** | [`../../source-material/waiff-brazil/BOTH-HANDS-FULL-SLIDES.md`](../../source-material/waiff-brazil/BOTH-HANDS-FULL-SLIDES.md) |
| **Legacy duplicate (redirect only)** | [`../media-gen-specs.md`](../media-gen-specs.md) — points to `slides/image-gen-prompts.md` |

## Deck scope

- **v1 on-stage deck:** **10 slides** — [`../../slides/deck-outline-with-notes.md`](../../slides/deck-outline-with-notes.md).
- **Optional density:** use prompts **1–15** in `cmvan-slides-01-15.md` for extra holding slides, social crops, or printed zine — not a second “official” deck unless you promote it.

## Generation order (suggested)

1. Title + Xerox + Selector stills from `slides/image-gen-prompts.md`.
2. **Both Hands Full** + **Five fears / fair vs frequent** from `cmvan-slides-01-15.md` §3–4 (or map to deck slides 5–7).
3. Fill the rest of the 10-slide outline; only then burn tokens on 11–15.
