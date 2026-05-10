# Linear/GitHub delivery pipeline

This repo uses GitHub for public implementation scope and Linear for delivery
planning. The current execution project is:

- Linear project: [Punk Rock AI Release Day Roadmap](https://linear.app/bc-ai/project/punk-rock-ai-release-day-roadmap-eeed425b8d78)
- Linear team: `Bc-ai` (`BC`)
- GitHub repo: [WalksWithASwagger/cmvan-keynote](https://github.com/WalksWithASwagger/cmvan-keynote)
- Roadmap source: [ROADMAP-2026-05-07.md](./ROADMAP-2026-05-07.md)
- Machine-readable map: [`ops/roadmap/features.json`](../ops/roadmap/features.json)
- Local gate: `npm run eval`

## Contract

Agentic delivery contract: [`agentic/contract.json`](../agentic/contract.json). v1 opens PRs only; humans remain the merge gate. Ready work uses `agent:ready`; `auto-implement` and `autonomous` are migration aliases.


1. Each roadmap implementation item gets a GitHub issue and a linked Linear
   issue.
2. Linear owns project sequencing, milestones, status, due dates, and human
   checkpoints.
3. GitHub owns implementation discussion, acceptance criteria, PRs, and
   merge history.
4. `ops/roadmap/features.json` maps the two systems and is validated by
   `npm run eval`.
5. A PR must include the Linear key and GitHub issue number in the branch,
   title, or body so both systems can link the work.

## Current issue map

| Wave | GitHub | Linear | Priority | Status |
| --- | --- | --- | --- | --- |
| Wave 0 | [#133](https://github.com/WalksWithASwagger/cmvan-keynote/issues/133) | [BC-50](https://linear.app/bc-ai/issue/BC-50/roadmap-p0-reconcile-vercel-production-and-cloudflare-fallback-docs) | P0 | Done |
| Wave 1 | [#135](https://github.com/WalksWithASwagger/cmvan-keynote/issues/135) | [BC-51](https://linear.app/bc-ai/issue/BC-51/roadmap-p0-smoke-test-release-day-submissions-end-to-end) | P0 | Needs human |
| Wave 1 | [#136](https://github.com/WalksWithASwagger/cmvan-keynote/issues/136) | [BC-52](https://linear.app/bc-ai/issue/BC-52/roadmap-p0-resolve-adobe-involvement-and-recording-rights) | P0 | Needs human |
| Wave 1 | [#134](https://github.com/WalksWithASwagger/cmvan-keynote/issues/134) | [BC-53](https://linear.app/bc-ai/issue/BC-53/roadmap-p1-publish-moderation-to-gallery-loop-for-release-day) | P1 | Needs human |
| Wave 0 | [#137](https://github.com/WalksWithASwagger/cmvan-keynote/issues/137) | [BC-54](https://linear.app/bc-ai/issue/BC-54/roadmap-p1-add-route-nav-widget-contract-checker) | P1 | Done |
| Wave 2 | [#138](https://github.com/WalksWithASwagger/cmvan-keynote/issues/138) | [BC-55](https://linear.app/bc-ai/issue/BC-55/roadmap-p1-browser-qa-and-lighthouse-pass-for-core-flows) | P1 | Done |
| Wave 3 | [#139](https://github.com/WalksWithASwagger/cmvan-keynote/issues/139) | [BC-56](https://linear.app/bc-ai/issue/BC-56/roadmap-p1-decide-pattern-finder-production-backend-path) | P1 | Done |

## Branch and PR rules

- Branch from current `main` unless the issue says otherwise.
- Use `codex/BC-<issue>-<short-slug>` for Codex-authored branches.
- Keep changes scoped to the GitHub issue and Linear acceptance criteria.
- Run `npm run eval` before pushing.
- Use `Refs #<github-issue>` when the PR is useful but narrower than the full
  issue.
- Use `Closes #<github-issue>` only when every acceptance criterion is met.

## Issue quality rules

Every new issue should include:

- A concrete action title and deliverable.
- A short description of why the work matters.
- Numbered implementation phases.
- Testable acceptance criteria.
- Agent instructions with the local verification command.
- Human-in-the-loop checkpoints for credentials, public publishing, legal
  claims, DNS, deploy dashboards, or paid services.
- Explicit "Do NOT" boundaries for likely overreach.

## Review rules

Review against the written acceptance criteria, not vibes. A ready PR should
show:

- Linked Linear issue and GitHub issue.
- Summary of changed files and behavior.
- Verification evidence, usually `npm run eval`.
- Any live smoke-test proof for API, deploy, or production-flow work.
- Follow-up issues when scope was intentionally left out.

## Updating the map

When a roadmap issue is added, closed, split, or superseded:

1. Update the GitHub and Linear issues.
2. Patch `ops/roadmap/features.json`.
3. Update the table in this document when the visible roadmap changes.
4. Run `npm run eval`.
