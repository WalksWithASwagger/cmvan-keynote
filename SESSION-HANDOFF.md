# Session Handoff — May 1, 2026 (Talk Day)
## Both Hands Full · Creative Mornings Vancouver

---

## Final State

**22 slides. ~18 min. Audio at 15.9MB.** All script, framework, image prompts, and speaker notes aligned.

**2 slides still need images generated:**
- Slide 11 — Boosters vs Doomers
- Slide 13 — More Creative Than Ever

Everything else has existing 16:9 images from `assets/slides/cmvan-v6-gpt2-16x9/run-20260430-150613/`.
Credits (slide 22) already generated at `assets/slides/cmvan-title-redo/26-credits-gpt2-v1.png`.

**Viewer:** `assets/slides/viewer-22-final.html` — open in Chrome to see the full 22-slide layout with prompts for missing images.

---

## Tonight's Commit History (newest first)

```
8c1b569  split BHF climax into two slides: frame + personal testimony
bd5323e  trim to 21 slides: cut Open Everything + Spark Online; regenerate audio
0bd1b0e  restructure to 23-slide final deck; add speaker notes + regenerate audio
```

---

## Decision Log — What Changed and Why

### Starting point
Came in with a 25-slide v7 plan already committed: Boosters vs Doomers added as slide 13, Credits added as slide 23, Both Hands Full moved to mid-talk pivot, four earlier slides removed (Junior Pipeline, True North, What Did You Throw Away, Best Tool).

---

### Cut 1: Open Everything removed (25 → 24, then part of 23→21)
**Decision:** Cut the Bryght/Rain City/Dead.net/open source slide.  
**Reason:** Biographical padding. Doesn't earn its place in a 20-min talk. The key idea ("value lives in relationship, not locked files") already exists verbatim in the AI Chapter section, so nothing structural is lost.  
**What was rescued:** The "this story is not new" transition sentence from Spark Online was folded into the opening of the Dada section.

---

### Cut 2: Spark Online removed
**Decision:** Cut the 1998 web publication / Columbia / "exploring electronic consciousness" slide.  
**Reason:** Doesn't reinforce the core argument. The story moves better with three tight biographical slides (Cult Baby → Camera → 145K) going straight into the pattern section.

---

### Keep: BC AI Community / Build a Posse stays
**Decision:** Initially questioned this slide; reconsidered and kept it.  
**Reason:** "It's a BC + AI slide." It belongs in the CMVan context. Kevin Friel's conductor story and the "posse not community" distinction are load-bearing for the Three Documents action beat that follows.

---

### Split: Both Hands Full climax becomes TWO slides (21 → 22)
**Decision:** Pull the personal testimony ("I am more creative, more productive, and more powerful than I have ever been in my entire life") onto its own slide after the Both Hands Full frame.

**Exact words:** *"I think the twist, the part where I say 'Sit with all this stuff. All those things are true, but I'm also more creative, powerful, and productive than I've ever been.' I think that that fucking needs to be in there too. I think it might be his own slide even. It definitely comes after both hands fold."*

**Result:**
- Slide 12 — Both Hands Full: names the frame. ONE sentence. "That's not contradiction. That's complexity. Both hands full. That's the only honest place to stand." Advance fast.
- Slide 13 — More Creative Than Ever: the personal testimony lands as proof. "I am more creative, more productive, and more powerful than I have ever been in my entire life." Let it breathe.

---

## Final 22-Slide Order

| # | Slide | Image Source |
|---|-------|--------------|
| 1 | Both Hands Full (title) | `01-both-hands-full-title.png` |
| 2 | Cult Baby | `02-cult-baby.png` |
| 3 | My Camera Saved My Life | `03-my-camera-saved-my-life.png` |
| 4 | 145,000 Frames | `04-145-000-frames.png` |
| 5 | Dada → AI Lineage | `07-dada-to-ai-lineage.png` |
| 6 | The Selector / Taste | `08-the-selector.png` |
| 7 | Feedback Loop / Mastery Gym | `09-feedback-loop-mastery-gym.png` |
| 8 | Cutting Room Floor | `10-cutting-room-floor.png` |
| 9 | Pattern I Couldn't Name | `11-pattern-i-couldn-t-name.png` |
| 10 | The AI Chapter | `12-the-ai-chapter.png` |
| 11 | **Boosters vs Doomers** | **NEEDS IMAGE** |
| 12 | Both Hands Full (frame) | `15-both-hands-full.png` |
| 13 | **More Creative Than Ever** | **NEEDS IMAGE** |
| 14 | Name What You See (Dr. Joy) | `16-name-what-you-see.png` |
| 15 | Three Fears | `13-three-fears.png` |
| 16 | Stay at the Table | `17-stay-at-the-table.png` |
| 17 | Build a Posse | `19-build-a-posse.png` |
| 18 | Three Documents | `21-three-documents.png` |
| 19 | The Tool Is Never Neutral | `22-the-tool-is-never-neutral.png` |
| 20 | Release Day | `24-release-day.png` |
| 21 | Dead Fish / Live Fish | `25-dead-fish-live-fish.png` |
| 22 | Credits / Thank You | `cmvan-title-redo/26-credits-gpt2-v1.png` |

All existing images live at: `assets/slides/cmvan-v6-gpt2-16x9/run-20260430-150613/`

---

## Image Prompts for New Slides

### Slide 11 — Boosters vs Doomers
> Black background. Two enormous options stacked vertically — BOOSTER in hot pink dripping paint at the top, DOOMER in blood-red stencil below — both violently crossed out with thick spray-paint X marks. A deliberate empty space below them — a white typewriter question mark sits in the void. Blood-red stencil at the bottom: BOTH FEEL CLEAN. BOTH ARE INCOMPLETE. Scattered illegible collage fragments at the edges. Maximum tension. The binary trap made visible — the third option is the empty space.

### Slide 13 — More Creative Than Ever
> Black background. Massive hot pink dripping paint dominates the center, three lines stacked: MORE CREATIVE. MORE PRODUCTIVE. MORE POWERFUL. Blood-red stencil below: THAN I HAVE EVER BEEN IN MY ENTIRE LIFE. A silhouette of a person with a camera — high-contrast B&W halftone — arms mid-motion, caught in the act of making. Hot pink spray paint circle around the figure. White typewriter at the bottom: BOTH STATEMENTS ARE TRUE. AT THE EXACT SAME TIME. Scattered illegible collage fragments. Maximum grain. The personal testimony made visible.

---

## Key Files

| File | Purpose |
|------|---------|
| `script/talk-framework-v6.md` | Stage map — 22 slides, act structure, timing, key lines, physical notes |
| `dress-rehearsal/elevenlabs-full-script.md` | Full audio script v6 — what was sent to ElevenLabs |
| `dress-rehearsal/speaker-notes.md` | 22 slides, stage-ready bullets — use this at the podium |
| `dress-rehearsal/punk-rock-ai-full-talk.mp3` | Full audio, 15.9MB, ~18 min (gitignored) |
| `assets/image-prompts/cmvan-v6-25-rafiki.md` | All 22 prompts in Rafiki format |
| `assets/slides/viewer-22-final.html` | Local viewer — open in Chrome (gitignored) |

---

## Timing (Approximate)

| Time | Beat |
|------|------|
| 0:00 | Cult Baby |
| 3:00 | Dada lineage |
| 7:00 | "I find my relationship with AI completely non-consensual" |
| 11:00 | Slide 12 — Both Hands Full (frame) |
| 11:30 | Slide 13 — "I am more creative than I have ever been" |
| 13:00 | Name What You See / Three Fears |
| 18:00 | Release Day |
| 20:00 | "You coming?" |

---

## The Lines That Have to Land

1. "My mom and dad, Kelly and Debbie — they are in this room today."
2. "The camera interrupted the despair."
3. "Giving away made me invaluable."
4. "I find my relationship with AI completely non-consensual."
5. "The Selector is the job. It always was."
6. "Speed without judgment is kind of like a leaf blower."
7. "Remix has culture. Extraction has appetite."
8. "Both feel clean. Both are incomplete."
9. "Both hands full. That's the only honest place to stand."
10. "I am more creative, more productive, and more powerful than I have ever been in my entire life."
11. "Stop saying bias. Name what you're seeing."
12. "Bias laundering — discrimination that looks like math."
13. "If your values aren't in text, to AI they basically don't exist."
14. "The tool is never neutral. But neither are we."
15. "You coming?"
