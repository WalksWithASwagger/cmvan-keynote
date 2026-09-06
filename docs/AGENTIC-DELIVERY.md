# Agentic Delivery Contract

This repo uses GitHub issues and PRs for planning, execution, and status. v1 turns a qualified GitHub issue into a tested PR. It does not auto-merge.

## Repo Identity

- GitHub repo: `WalksWithASwagger/cmvan-keynote`
- Canonical local root: `/Users/kk/Code/cmvan-keynote`

## Labels

- Ready: `agent:ready`
- Ready aliases accepted for migration: `auto-implement`, `autonomous`
- Review: `review-ready`
- Stop labels: `needs-human`, `blocked`, `in-progress`

New work should use `agent:ready`. The issue quality workflow normalizes aliases to `agent:ready`.

## Required Issue Shape

An issue can only keep a ready label when it includes all required sections:

- `## Context`
- `## Acceptance Criteria`
- `## Tests/Evals`
- `## Verification`
- `## Agent Instructions`
- `## Out of Scope`

Acceptance criteria must include Markdown checkboxes. The linter rejects ready issues missing tests/evals or other required sections.

## Runner Flow

1. A human or chat command creates a complete GitHub issue.
2. `agent:ready` triggers `.github/workflows/agentic-issue-quality.yml`.
3. The dev loop independently validates current issue quality before claiming work; intake and execution events can arrive in either order.
4. The dev loop checks pause controls, stop labels, issue quality, clean worktree state, provider output, repo verification commands, and diff limits.
5. If verification passes and the diff is within 20 files and 500 changed lines, the runner opens a PR on `codex/issue-<number>-<slug>`.
6. `.github/workflows/agentic-pr-review.yml` comments an acceptance verdict and applies `review-ready` or `needs-human`.
7. A human reviews and merges. v1 never auto-merges.

## Verification Commands

- `npm run eval`

## Pause Controls

Use either control to stop new dev-loop work:

- Add `.dev-loop-pause` at the repo root.
- Set the Actions variable `LOOP_PAUSED` to a truthy value.

Repos without provider secrets remain dry-run only through the `noop` adapter.

## Provider Adapter

Config lives in [`agentic/contract.json`](../agentic/contract.json). v1 supports:

- `noop`: deterministic dry-run with no file changes.
- `command`: runs the command in `AGENTIC_PROVIDER_COMMAND`.

A successful `noop` run opens no PR and implements nothing. It never claims or clears
`in-progress`. A failed preflight does not mutate labels. The command adapter only
clears a claim made by that run.

For hosted implementation, an operator must authorize and configure the `command`
provider through `AGENTIC_PROVIDER` and `AGENTIC_PROVIDER_COMMAND`, then dispatch
with `provider=command`. This can execute code and incur provider costs; a ready
label alone does not configure a provider. No configuration or credentials are
changed by intake. Alternatively, explicitly assign a native coding agent a
GitHub issue in an isolated worktree, review its tests and diff, and open a PR;
this does not require the hosted command adapter.

Intake evaluates content without treating `in-progress` as a defect. Execution's
linter still rejects all stop labels, including `in-progress`, to prevent duplicate
work. Malformed content and explicit `blocked`/`needs-human` labels still remove
ready labels and require review. Intake reads body, labels, and state together and
rechecks immediately before a label edit, retrying a changed snapshot up to three
times. Closed or no-longer-ready issues are untouched, and repeated events are
idempotent. GitHub label edits have no compare-and-swap guarantee: an external
edit after the final read can still race. Stop labels are never removed by intake;
execution must retain its independent preflight check.

## Break Glass

To disable the system:

1. Set `LOOP_PAUSED=true` in Actions variables.
2. Add or commit `.dev-loop-pause` for an immediate repo-local hard stop.
3. Remove `agent:ready`, `auto-implement`, and `autonomous` labels from active issues.
4. Add `needs-human` to active agentic issues and PRs.
5. Disable `agentic-dev-loop.yml` in GitHub Actions if labels are still being applied externally.

## Local Commands

```bash
python3 scripts/agentic/issue_lint.py --issue-file issue.md --labels agent:ready
python3 scripts/agentic/dev_loop.py --issue-number 1 --issue-title "Example" --issue-file issue.md --labels agent:ready --provider noop
python3 scripts/agentic/ensure_labels.py --dry-run
python3 -m pytest tests/agentic
```
