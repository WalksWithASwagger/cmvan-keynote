# Documentation audit - May 18, 2026

> Historical snapshot as of 2026-05-18. For current operational doc truth, see
> `docs/DOCUMENTATION-AUDIT-2026-05-24.md`.

Scope: root docs, `docs/`, `site/README.md`, `scripts/README.md`,
`ops/roadmap/features.json`, deployment notes, tracker-facing docs, and obvious
agent handoff surfaces. Source-material and archive notes were scanned for link
rot but not mass-edited because many are imported provenance records.

## Sync status

- Local `main` was fast-forwarded from `e9f6665` to `31e2131`.
- `git rev-list --left-right --count HEAD...origin/main` returned `0 0`
  after the pull.
- A nested untracked checkout at `cmvan-keynote/` was found at the same
  commit as the root checkout and with no local changes. It was safe workspace
  noise, not project content, and was removed.

## Current source of truth

- Production host: Vercel project `punkrockai`; output directory `site`.
- Cloudflare Pages, Workers, `_headers`, `_redirects`, R2, and Wrangler docs:
  fallback/deferred paths unless a new backend decision says otherwise.
- Local gate: `npm run eval`.
- Roadmap tracker: `ops/roadmap/features.json` plus
  `docs/LINEAR-GITHUB-PIPELINE.md`.
- Live tracker refresh used the GitHub and Linear connectors because `gh` is
  not installed in this shell.

## Status corrections made

- `ops/roadmap/features.json` now records the May 18 tracker snapshot:
  BC-50 done, BC-51 in review and human-gated, BC-52 todo and human-gated,
  BC-53 in review and human-gated, BC-54 done, BC-55 done, and BC-56 done.
- `docs/LINEAR-GITHUB-PIPELINE.md` now explains that GitHub issue closure is
  not enough to prove account-gated work. BC-51, BC-52, and BC-53 still need
  human or live-environment follow-through.
- `docs/PROJECT-ROADMAP.md` now points at the current local kk-bb mirror path
  instead of a `file://` markdown link, and it removes stale guidance to work
  from the old `chore/cmvan-2026-creative-mornings-mirror` branch.
- `docs/RELEASE-DAY-OPERATIONS.md` now names the remaining Release Day proof
  items: live browser-to-Notion smoke, approved-row gallery proof, and
  Adobe/recording-rights confirmation.
- `docs/SESSION-HANDOFF.md` now matches the current HTTPS origin and warns
  agents to verify the old kk-bb branch name before using it.

## Link and stale-reference scan

- No tracked docs reference the deleted `docs/sync-from-kk-bb-README.md`.
- Operational docs agree that Vercel is production and Cloudflare is fallback.
- Root, `docs/`, `site/README.md`, and `scripts/README.md` local links should
  be treated as the maintained documentation surface for agents.
- A broad tracked-markdown scan found broken links inside `archive/`,
  `assets/`, and imported `source-material/` notes. Those are mostly old KB
  relative paths, slide-planning paths that moved under `archive/`, and
  source-pack references that were not copied into this repo. Do not use those
  imported notes as operational instructions without checking the target path.

## Remaining human-gated items

- #135 / BC-51: live Release Day browser-to-Notion smoke in preview or
  production with configured Vercel env vars.
- #134 / BC-53: approved/published Notion row appears on `/release-day`.
- #136 / BC-52: named confirmation for Adobe involvement and recording rights.
- `punk.ceo` and `plump.co`: domain routing decision and verification.

## Verification

- `git fetch --prune origin`
- `git pull --ff-only`
- GitHub connector issue/PR search for #133-#139 and PR #140/#142/#144
- Linear connector list for project `Punk Rock AI Release Day Roadmap`
- Markdown stale-reference scan with `rg`
- Scoped markdown link scan for maintained docs
- `node scripts/eval.mjs` (equivalent to `npm run eval`; `npm` was not on
  `PATH` in this Codex desktop shell)
