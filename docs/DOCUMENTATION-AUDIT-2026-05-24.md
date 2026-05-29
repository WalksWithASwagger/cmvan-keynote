# Documentation audit - May 24, 2026

> Historical snapshot as of 2026-05-24. For the current closeout state, see
> `docs/DOCUMENTATION-AUDIT-2026-05-25.md`.

Scope: root operational docs, `docs/`, `site/README.md`, `scripts/README.md`,
worker READMEs, workflow-facing docs, and roadmap/status surfaces. Imported
source packs under `source-material/` and archival notes under `archive/` were
scanned for drift signal but not mass-edited as operational instructions.

## Truth pass

- `git fetch --prune`
- `git status --short --branch` -> `## main...origin/main` (clean, in sync)
- `git log --oneline -n 30` reviewed for latest merged work
- `gh pr list --state open --limit 100` -> no open PRs
- `gh issue list --state open --limit 200` -> `#135` only
- `gh issue view` snapshot for `#14`, `#133`-`#139`
- `gh pr view` snapshot for `#140`, `#142`, `#143`, `#144`, `#145`
- Linear project snapshot via connector for `BC-50` through `BC-56`

## Baseline verification

- `npm run eval` -> pass
- `npm run smoke:release-day` -> pass
- `python3 -m pytest tests/agentic` -> pass (`14 passed`)
- Scoped markdown link check (maintained docs surface) -> pass (`28 files`)

## Fixes made in this pass

- Clarified mixed tracker status in `docs/LINEAR-GITHUB-PIPELINE.md`:
  - split GitHub state vs Linear state
  - added explicit snapshot date (`2026-05-24`)
  - included concrete GitHub closure dates where relevant
- Updated `docs/RELEASE-DAY-OPERATIONS.md`:
  - refreshed as-of date
  - aligned known blockers with verified GitHub + Linear state
- Updated `docs/PROJECT-ROADMAP.md`:
  - replaced ambiguous "current roadmap refresh" wording with explicit
    baseline/snapshot language
  - refreshed Phase D blocker snapshot to `2026-05-24`
  - aligned widget/issue status rows with closed GitHub issues while preserving
    unresolved operational follow-through
- Updated `README.md` docs index:
  - pointed "latest documentation audit" to this file
  - relabeled `docs/ROADMAP-2026-05-07.md` as a historical baseline snapshot

## Findings that remain intentionally unresolved

- `#135` / `BC-51`: live browser-to-Notion smoke still needs env-backed run in
  preview or production.
- `#134` / `BC-53`: moderation-to-gallery proof still needs a real approved row
  visible on `/release-day`.
- `#136` / `BC-52`: Adobe involvement and recording-rights answers still need
  named human confirmation.

## Notes on non-operational link drift

A whole-repo markdown scan still reports broken local links in archived/imported
content packs (for example under `source-material/` and legacy slide-prompt
trees). These files include external provenance and cross-repo references and
are not currently treated as runnable operational docs.
