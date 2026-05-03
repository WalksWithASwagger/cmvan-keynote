# Linear + GitHub delivery pipeline

This repo now has a machine-readable backlog at [`ops/roadmap/features.json`](../ops/roadmap/features.json). The narrative roadmap in [`docs/PROJECT-ROADMAP.md`](./PROJECT-ROADMAP.md) remains the human-facing source; the JSON file is the queue that automation reads.

Linear project: [Punk Rock AI Portal](https://linear.app/bc-ai/project/punk-rock-ai-portal-e9aec6edd886), team `Bc-ai`.

## What is automated

- **Roadmap Sync**: [`.github/workflows/roadmap-sync.yml`](../.github/workflows/roadmap-sync.yml) syncs backlog items into GitHub issues whenever the roadmap registry changes on `main`, or on manual dispatch.
- **Issue bodies**: `scripts/sync-roadmap-issues.mjs` renders acceptance criteria, eval commands, tests, blockers, and relevant paths into each issue so Linear mirrors complete implementation context.
- **PR gate**: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs `npm run eval` on every PR and push to `main`.
- **Eval surface**: `npm run eval` validates the roadmap registry, site data contracts, JavaScript syntax, and the static site contract test suite.
- **Linear seed**: Linear project issues `BC-8` through `BC-16` have been created with labels, priorities, states, and links back to the GitHub issue numbers already referenced by the roadmap.

## Seeded Linear Work

| Linear | GitHub | Status | Title |
|--------|--------|--------|-------|
| [BC-8](https://linear.app/bc-ai/issue/BC-8/cloudflare-pages-project-and-staging-url) | [#8](https://github.com/WalksWithASwagger/cmvan-keynote/issues/8) | Backlog | Cloudflare Pages project and staging URL |
| [BC-9](https://linear.app/bc-ai/issue/BC-9/taste-audit-cutting-room-floor) | [#9](https://github.com/WalksWithASwagger/cmvan-keynote/issues/9) | In Progress | Taste Audit / Cutting Room Floor |
| [BC-10](https://linear.app/bc-ai/issue/BC-10/name-what-you-see) | [#10](https://github.com/WalksWithASwagger/cmvan-keynote/issues/10) | In Progress | Name What You See |
| [BC-11](https://linear.app/bc-ai/issue/BC-11/audio-sync) | [#11](https://github.com/WalksWithASwagger/cmvan-keynote/issues/11) | Todo, blocked | Audio sync |
| [BC-12](https://linear.app/bc-ai/issue/BC-12/library-searchable) | [#12](https://github.com/WalksWithASwagger/cmvan-keynote/issues/12) | In Progress | /library searchable |
| [BC-13](https://linear.app/bc-ai/issue/BC-13/pattern-finder-llm) | [#13](https://github.com/WalksWithASwagger/cmvan-keynote/issues/13) | Todo, blocked | Pattern Finder LLM |
| [BC-14](https://linear.app/bc-ai/issue/BC-14/release-day-portal) | [#14](https://github.com/WalksWithASwagger/cmvan-keynote/issues/14) | Todo, blocked | Release Day portal |
| [BC-15](https://linear.app/bc-ai/issue/BC-15/posse-audience-map) | [#15](https://github.com/WalksWithASwagger/cmvan-keynote/issues/15) | In Progress | /posse audience map |
| [BC-16](https://linear.app/bc-ai/issue/BC-16/decisions-log) | [#16](https://github.com/WalksWithASwagger/cmvan-keynote/issues/16) | In Progress | Decisions log |

## One-time setup outside the repo

1. In Linear, connect the GitHub integration to `WalksWithASwagger/cmvan-keynote`.
2. Enable PR, commit, and review linking in Linear so branch and PR activity stays attached to the same work item.
3. If you enable GitHub issue import later, map imported issues to the existing `BC-8` through `BC-16` work instead of creating duplicates.
4. In GitHub, enable Actions for this repository if they are not already enabled.
5. Re-authenticate local GitHub CLI access if you want to run sync commands from this machine. Right now `gh auth status` reports an invalid token.

## Working loop

1. Add or refine a backlog item in [`ops/roadmap/features.json`](../ops/roadmap/features.json).
2. Merge that change to `main` or dispatch `Roadmap Sync` manually.
3. Update or create the matching Linear issue in the `Punk Rock AI Portal` project.
4. Branch from the synced work item. Prefer the Linear issue key if one exists; otherwise use a `codex/issue-<n>-...` branch.
5. Implement the change, run `npm run eval`, and open a PR with the repo template.
6. When the PR lands, update [`docs/PROJECT-ROADMAP.md`](./PROJECT-ROADMAP.md) and [`SESSION-HANDOFF.md`](../SESSION-HANDOFF.md) if the change altered scope, status, or blockers.

Branch names should keep the repo prefix and include the Linear key, for example `codex/bc-17-verify-linear-github-pr-linking`.

## Commands

```sh
npm run check:roadmap
npm run sync:github:dry
npm run sync:github
npm run eval
```

`npm run sync:github` needs `GITHUB_TOKEN`. The GitHub Action already provides that token automatically for the repo workflow.

## Current external blockers

- Local `gh` authentication is invalid on this machine.
- No Linear CLI or local Linear API token is configured.
- The Linear plugin is connected in Codex and was used to seed the project, but Linear's account-level GitHub integration still has to be enabled in the Linear UI.
- Cloudflare, Anthropic, ElevenLabs, and Notion credentials are still required for the blocked roadmap items.
