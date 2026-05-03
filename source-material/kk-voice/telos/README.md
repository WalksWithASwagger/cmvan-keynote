# KK TELOS v4

This directory is the **TELOS substrate** for Kris Krüg's Personal AI Infrastructure (PAI/Athena).
It follows Daniel Miessler's v4 schema (April 2026) — 10 core files plus `current-state.md` and `ideal-state.md`.

## What is TELOS?

TELOS is the mission/goals/beliefs layer of a Personal AI — the "what I'm trying to do" files that every Athena skill loads when it needs to act in KK's voice, with KK's values, toward KK's goals.

## Files

| File | Purpose |
|---|---|
| `MISSION.md` | Why KK exists; top-level purpose |
| `GOALS.md` | What he's trying to achieve (time-bounded) |
| `PROJECTS.md` | Concrete initiatives driving toward goals |
| `BELIEFS.md` | Core convictions that shape decisions |
| `MODELS.md` | How KK thinks the world works |
| `STRATEGIES.md` | Repeatable approaches he uses |
| `NARRATIVES.md` | Stories KK tells about himself and the world |
| `LEARNED.md` | Lessons captured from experience |
| `CHALLENGES.md` | What's currently blocking him |
| `IDEAS.md` | Seed thoughts to develop |
| `current-state.md` | Where KK / BC+AI is today |
| `ideal-state.md` | Where KK / BC+AI wants to be |

## Schema source

Daniel Miessler's PAI v4.0.3 — `github.com/danielmiessler/Personal_AI_Infrastructure`

## Status

Files marked `status: draft` need KK to review and flip to `status: active`.
Gaps are marked with `<!-- NEEDS KK -->` — placeholder, not an invention.

## Update cadence

- Weekly: GOALS, CHALLENGES, current-state
- Monthly: PROJECTS, LEARNED
- Quarterly: MISSION, BELIEFS, STRATEGIES, ideal-state
- As-needed: NARRATIVES, MODELS, IDEAS

Sync from Notion: `python3 scripts/athena/sync-telos.py pull`
