# Issue Queue Cleanup — May 13, 2026

Triage pass on open issues, PRs, and branches. Goal: drop the backlog to
genuinely active work.

## Going in

- Open PRs: 0
- Open issues: 5 (#1, #8, #134, #135, #136)
- Remote branches: `main` only (already clean)

## Decisions

| # | Title | Action | Reason |
| --- | --- | --- | --- |
| #1 | [Epic] Punk Rock AI interactive learning portal | Closed (completed) | Superseded by `docs/ROADMAP-2026-05-07.md` and `docs/PROJECT-ROADMAP.md`. Phase 1 work shipped. |
| #8 | Cloudflare Pages project + staging URL | Closed (not planned) | `DEPLOYMENT.md` and `vercel.json` make Vercel the production host. Cloudflare config is retained as a documented fallback in `DEPLOYMENT.md`, not a primary path. |
| #134 | Publish moderation-to-gallery loop | Closed (completed) | Already shipped. `api/submissions.js` GET filters Notion rows by `Published = true`; `docs/RELEASE-DAY-OPERATIONS.md` has the operator checklist; `site/data/submissions.json` is the documented fallback. |
| #135 | Smoke test Release Day submissions E2E | Left open | Code-side scaffolding shipped (`scripts/smoke-release-day.mjs`, `docs/RELEASE-DAY-SUBMISSIONS-SMOKE-2026-05-08.md`). Only the live preview/prod run with real `NOTION_TOKEN` + `NOTION_DB_ID` remains — that requires a human. Issue comment captures the 5-step checklist. |
| #136 | Adobe involvement + recording rights | Closed (completed) | Acceptance ("resolved or restated with a named blocker") was already met by `OPEN-QUESTIONS.md` Q6/Q7 dated 2026-05-08. Outreach plan committed at `docs/drafts/adobe-recording-outreach.md` for when Mark Busse replies. |

## Going out

- Open PRs: 0
- Open issues: 1 (#135, pending live human smoke)
- Remote branches: `main`, `claude/cleanup-repo-7TlUv` (this cleanup branch)
- New file: `docs/drafts/adobe-recording-outreach.md`
- New file: this log

## Next concrete actions

1. Run the live `/api/submissions` smoke against the Vercel preview or
   production environment (issue #135 acceptance).
2. Send the message in `docs/drafts/adobe-recording-outreach.md` to Mark
   Busse; update `OPEN-QUESTIONS.md` Q6/Q7 when answers land.
3. When ready, open a PR from `claude/cleanup-repo-7TlUv` to `main` to merge
   the outreach draft and this log.
