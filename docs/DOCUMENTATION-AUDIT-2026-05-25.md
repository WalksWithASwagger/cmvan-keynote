# Documentation reliability closeout - May 25, 2026

Scope: close the May 24 documentation audit findings that can be resolved from
the repo, verify the live Release Day submission path, and leave the remaining
account-gated blockers with exact evidence and next actions.

## Truth pass

- `git fetch --prune` completed.
- `git status --short --branch` started from
  `codex/documentation-reliability-closeout` with only documentation-audit
  changes already in progress.
- `gh pr list --state open --limit 100` returned no open PRs.
- `gh issue list --state open --limit 200` returned only `#135`.
- GitHub `#134` and `#136` remain closed; GitHub `#135` remains open.
- Linear snapshot: `BC-51` In Review, `BC-53` In Review, `BC-52` Todo.

## Fixes made

- Added `scripts/check-doc-links.mjs` with maintained-doc and full-repo modes.
- Added `npm run docs:links` and `npm run docs:links:all`.
- Wired the maintained-doc link check into `npm run eval`.
- Repaired all broken local markdown links across tracked markdown files:
  - moved prompt/deck files now point to their `archive/` locations
  - non-mirrored source-pack references are labeled `external/not mirrored`
- Hardened `api/submissions.js` so upstream Notion failures return a generic
  `502 { error: "submission backend unavailable" }` instead of exposing raw
  Notion database/integration details to the browser.

## Live Release Day evidence

Environment: production `https://www.punkrockai.com`, timestamp
`2026-05-25T04:25:33Z`.

- `GET /api/submissions` returned HTTP 200 with `{"submissions":[]}`.
- Invalid `POST /api/submissions` with missing `name` returned HTTP 400 with
  `{"error":"name required"}`.
- Valid `POST /api/submissions` returned HTTP 404 from Notion before this code
  change could be deployed. The response said the configured database
  `8b726851-21ce-499f-bd0b-4cceee9a0d52` could not be found or was not shared
  with the integration.

## Remaining blockers

- `#135` / `BC-51`: production has `NOTION_TOKEN` and `NOTION_DB_ID`, but the
  Notion database is not accessible to the configured integration. Share the
  database with that integration, redeploy if needed, then rerun the valid POST
  smoke and record the Notion page id.
- `#134` / `BC-53`: moderation-to-gallery proof remains blocked until a real
  pending row can be created, approved/published, verified on `/release-day`,
  and rolled back.
- `#136` / `BC-52`: Adobe involvement and recording-rights confirmation still
  needs a named answer. Keep Linear `BC-52` open with owner/date until that
  answer lands.

## Verification

- `npm run eval` -> pass
- `npm run smoke:release-day` -> pass
- `python3 -m pytest tests/agentic` -> pass (`14 passed`)
- `npm run docs:links` -> pass (`30 files`)
- `npm run docs:links:all` -> pass (`153 files`)
- `git diff --check` -> pass
