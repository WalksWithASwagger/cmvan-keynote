# GitHub delivery pipeline

GitHub issues and PRs are the sole planning, sequencing, status, and delivery
tracker as of 2026-09-06. No Linear account, mirror, key, or synchronization is
required. The filename stays stable for existing links and repo-doctor consumers.

- Repository: [WalksWithASwagger/cmvan-keynote](https://github.com/WalksWithASwagger/cmvan-keynote)
- Current Studio sequence: [#201](https://github.com/WalksWithASwagger/cmvan-keynote/issues/201)
- Delivery contract: [`agentic/contract.json`](../agentic/contract.json)
- Runner instructions: [AGENTIC-DELIVERY.md](./AGENTIC-DELIVERY.md)
- Earlier roadmap snapshot: [`ops/roadmap/features.json`](../ops/roadmap/features.json)

## Contract

1. Each bounded implementation has one GitHub issue with scope, dependencies,
   acceptance criteria, verification, and exclusions.
2. Use GitHub issue links for ordering and PR links for completion evidence.
   A closed issue alone does not prove account-gated or participant checks ran.
3. Use `codex/issue-<number>-<slug>` branches and link the issue in the PR body.
4. Use `Refs #<number>` for partial work; use `Closes #<number>` only when all
   acceptance criteria are met. Preserve human gates and report unavailable checks.
5. Run `npm run eval` and relevant focused checks before review. Merge only with
   authorization and current CI/review evidence.

## Maintaining the queue

Update the GitHub issue and parent sequence when scope, evidence, or status
changes. Earlier roadmap records below and in the JSON map retain historical
Linear links for traceability; they are not active dependencies or current status.
No agent should reconnect Linear or create mirrors to execute this workflow.

## Historical issue map (2026-05-25; not current queue state)

| Wave | GitHub | Linear | Priority | GitHub state | Linear state |
| --- | --- | --- | --- | --- | --- |
| Wave 0 | [#133](https://github.com/WalksWithASwagger/cmvan-keynote/issues/133) | [BC-50](https://linear.app/bc-ai/issue/BC-50/roadmap-p0-reconcile-vercel-production-and-cloudflare-fallback-docs) | P0 | Closed (2026-05-08) | Done |
| Wave 1 | [#135](https://github.com/WalksWithASwagger/cmvan-keynote/issues/135) | [BC-51](https://linear.app/bc-ai/issue/BC-51/roadmap-p0-smoke-test-release-day-submissions-end-to-end) | P0 | Open | In Review (human-gated) |
| Wave 1 | [#136](https://github.com/WalksWithASwagger/cmvan-keynote/issues/136) | [BC-52](https://linear.app/bc-ai/issue/BC-52/roadmap-p0-resolve-adobe-involvement-and-recording-rights) | P0 | Closed (2026-05-13) | Todo (human-gated) |
| Wave 1 | [#134](https://github.com/WalksWithASwagger/cmvan-keynote/issues/134) | [BC-53](https://linear.app/bc-ai/issue/BC-53/roadmap-p1-publish-moderation-to-gallery-loop-for-release-day) | P1 | Closed (2026-05-13) | In Review (human-gated) |
| Wave 0 | [#137](https://github.com/WalksWithASwagger/cmvan-keynote/issues/137) | [BC-54](https://linear.app/bc-ai/issue/BC-54/roadmap-p1-add-route-nav-widget-contract-checker) | P1 | Closed (2026-05-08) | Done |
| Wave 2 | [#138](https://github.com/WalksWithASwagger/cmvan-keynote/issues/138) | [BC-55](https://linear.app/bc-ai/issue/BC-55/roadmap-p1-browser-qa-and-lighthouse-pass-for-core-flows) | P1 | Closed (2026-05-10) | Done |
| Wave 3 | [#139](https://github.com/WalksWithASwagger/cmvan-keynote/issues/139) | [BC-56](https://linear.app/bc-ai/issue/BC-56/roadmap-p1-decide-pattern-finder-production-backend-path) | P1 | Closed (2026-05-08) | Done |
