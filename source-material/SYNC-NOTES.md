# Source Material Sync Notes

Sync date: **2026-05-02**
Synced by: Claude Code agent (issue #62)
KB mirror root: `/Users/kk/Code/notion-local/kk-ai-ecosystem/`
KB upstream: WalksWithASwagger/kk-kb (Notion local mirror)

This file tracks what was last refreshed in `source-material/` and where each piece came from. Pair it with [`SOURCE-INDEX.md`](./SOURCE-INDEX.md), which is the human-readable map of why each file is here.

> **Discipline:** treat synced files as **read-only references**. If the talk drifts from the canonical source, update the source in the KB mirror first, then re-sync — don't edit in place.

---

## 2026-05-02 — Issue #62 refresh

Verified existing snapshots are byte-identical to KB (no drift since 2026-04-22 / 2026-04-30 captures). Added the following high-value docs that the keynote pulls from but were missing.

### Added — voice / worldview reference

| Repo path | Source path in KB |
|---|---|
| `kk-voice/kk-voice-by-context.md` | `reference/kk-voice-by-context.md` |
| `kk-voice/kk-writing-style-guide.md` | `reference/kk-writing-style-guide.md` |
| `kk-voice/telos/MISSION.md` | `people/kris-krug/telos/MISSION.md` |
| `kk-voice/telos/BELIEFS.md` | `people/kris-krug/telos/BELIEFS.md` |
| `kk-voice/telos/NARRATIVES.md` | `people/kris-krug/telos/NARRATIVES.md` |
| `kk-voice/telos/MODELS.md` | `people/kris-krug/telos/MODELS.md` |
| `kk-voice/telos/README.md` | `people/kris-krug/telos/README.md` |

**Why:** `kk-voice-profile.md` plus `kk-worldview.md` answer "how does Kris talk?" — `kk-voice-by-context.md` adds the *channel-specific* dial (keynote vs. blog vs. social), `kk-writing-style-guide.md` is the prose-level rulebook, and the four telos files give the upstream beliefs/mission/narratives/mental-models that everything in the talk descends from. Useful any time a draft asks "is this Kris saying this?"

### Added — thought-leadership articles 19, 20, 21

Three articles published since the last sync that the talk leans on directly. Full package (`final.md`, `draft.md`, `outline.md`, `image-prompts.md`, `seo.md`, `social-content.md`) where present.

| Repo path | Source path in KB | Why |
|---|---|---|
| `clarity-as-exposure/` | `articles/kris-krug-thought-leadership/19-clarity-as-exposure/` | "AI is a mirror" — the canonical written form of the taste/clarity beat. Reusable for the cutting-room-floor / 145K-frames argument. |
| `mycorrhizal-network/` | `articles/kris-krug-thought-leadership/20-mycorrhizal-network/` | Horizontal vs. vertical scale — the community/distribution frame. Backs the BC + AI / Posse argument. |
| `who-sets-direction/` | `articles/kris-krug-thought-leadership/21-who-sets-direction/` | Grassroots community → essential stakeholders in 20 months. Grounds the "stay in the room" / governance close, BC delegation at All-In Montreal. |

`who-sets-direction/` ships without `outline.md` and `draft.md` because they aren't in the KB; only `final.md` exists upstream.

---

## What was *not* synced (and why)

- **No private/secrets material** — skipped `people/kris-krug/sources/` (LinkedIn PDF, resume, WhatsApp, press notes, office-hours notes) and the rest of `telos/` (`CHALLENGES`, `GOALS`, `IDEAS`, `LEARNED`, `PROJECTS`, `STRATEGIES`, `current-state`, `ideal-state`) — useful internally but not reference material the talk's widgets cite.
- **No KB-only large packages** — the LaSalle Banff and keynote-concepts indexes already point at the canonical KB; we don't duplicate the heavy script bundles. See `SOURCE-INDEX.md`.
- **Skipped existing duplicates** — `bio-master.md`, `kk-voice-profile.md`, `kk-worldview.md`, all article 16/17/18 packages, `lasalle/`, `waiff-brazil/`, `punk-rock-ai/`, `kevin-friel-pixel-wizard/`, `cmvan-context/`, `mark-busse/`, `prior-cmvan-quotes/`, `life-love-internet/`, `karpathy-vibe-coding-agentic-engineering-2026.md`, `both-hands-burning-lyrics.md` were verified against KB and match — no re-copy needed.

---

## How to re-sync manually

```bash
KB=/Users/kk/Code/notion-local/kk-ai-ecosystem
DEST=source-material

# Voice / worldview
cp "$KB/reference/kk-voice-profile.md"      "$DEST/kk-voice/kk-voice-profile.md"
cp "$KB/reference/kk-worldview.md"           "$DEST/kk-voice/kk-worldview.md"
cp "$KB/reference/kk-voice-by-context.md"    "$DEST/kk-voice/kk-voice-by-context.md"
cp "$KB/reference/kk-writing-style-guide.md" "$DEST/kk-voice/kk-writing-style-guide.md"
cp "$KB/people/kris-krug/bio-master.md"      "$DEST/kk-voice/bio-master.md"

# Telos
for f in MISSION BELIEFS NARRATIVES MODELS README; do
  cp "$KB/people/kris-krug/telos/$f.md" "$DEST/kk-voice/telos/$f.md"
done

# Thought-leadership articles
for slug in 16-both-hands-full:both-hands-full \
            17-taste-as-moat:taste-as-moat \
            18-moment-no-permission:moment-no-permission \
            19-clarity-as-exposure:clarity-as-exposure \
            20-mycorrhizal-network:mycorrhizal-network \
            21-who-sets-direction:who-sets-direction; do
  src="${slug%%:*}"; dst="${slug##*:}"
  for f in final.md draft.md outline.md image-prompts.md seo.md social-content.md; do
    [ -f "$KB/articles/kris-krug-thought-leadership/$src/$f" ] && \
      cp "$KB/articles/kris-krug-thought-leadership/$src/$f" "$DEST/$dst/$f"
  done
done
```

Re-run is safe (overwrite-only). Update this file with a new dated section after each sync.
