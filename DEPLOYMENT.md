# Deployment Runbook — punkrockai.com

> **Live host: Vercel.** The site runs at punkrockai.com on the `punkrockai` project under `walkswithaswaggers-projects`. Push to `main` → auto-deploys to production. See `docs/PROJECT-ROADMAP.md` for DNS details and `vercel.json` for routing config.
>
> This document is the **Cloudflare Pages fallback runbook** — kept as reference if the host ever needs to switch. The `wrangler.toml`, `site/_headers`, and `site/_redirects` files remain in the repo for this reason.

The static site lives in `site/`; two Cloudflare Workers under `worker/` back
the interactive widgets. This document is the field-by-field runbook for the
human with Cloudflare access.

Estimated time end-to-end: ~30 min (Pages project + DNS + TLS) plus 5 min per
worker. Most of that is waiting for DNS/TLS to provision.

---

## 0. Prerequisites

- Cloudflare account with access to `punkrockai.com` (registrar OR DNS-only).
- GitHub access to `WalksWithASwagger/cmvan-keynote`.
- Local: `npm i -g wrangler` (>= 3.x), `wrangler login` once.
- Anthropic API key (for `worker/pattern-finder`).
- Notion integration secret + database id (for `worker/submissions`).

Sanity check before doing anything destructive:

```sh
./scripts/preflight-cf.sh
```

This prints which secrets/bindings are missing for each worker. It does NOT
deploy anything.

---

## 1. Cloudflare Pages — staging project

This connects the GitHub repo to Pages. Every push to the default branch ships
a new production build at `<project>.pages.dev`; every PR ships a preview URL.

### 1a. Create the project (UI)

1. Cloudflare dashboard → **Workers & Pages** → **Create application** →
   **Pages** tab → **Connect to Git**.
2. Select GitHub account `WalksWithASwagger`, repo `cmvan-keynote`. Authorize
   if prompted.
3. **Set up builds and deployments**:
   - **Project name**: `punkrockai`  *(must match `name` in root `wrangler.toml`)*
   - **Production branch**: `main`
   - **Framework preset**: `None`
   - **Build command**: *(leave blank — pure static site, nothing to build)*
   - **Build output directory**: `site`
   - **Root directory**: *(leave blank — repo root)*
   - **Environment variables**: none required for the static site.
4. Click **Save and Deploy**. First build takes ~30s.
5. After the build, the project's pages.dev URL is your **staging URL**.
   Confirm it loads `index.html` and that `/talk`, `/lineage`, `/library`
   resolve (those are `_redirects`-driven aliases).

### 1b. Verify `_headers` and `_redirects` were applied

```sh
curl -sI https://<project>.pages.dev/ | grep -iE 'content-security|x-frame|referrer'
curl -sI https://<project>.pages.dev/talk | grep -i 'location\|content-type'
```

You should see the CSP, `X-Frame-Options: DENY`, and the redirect from `/talk`
returning HTML (rewritten, not 301'd — `_redirects` uses status `200` for
internal rewrites).

### 1c. Build defaults reference

| Field | Value |
|---|---|
| Framework preset | None |
| Build command | *(empty)* |
| Build output directory | `site` |
| Root directory | *(empty)* |
| Node version | default (not used; no build step) |
| Production branch | `main` |
| Build system version | 2 (default) |

If you ever add a build step, update both this table and `package.json`.

---

## 2. Custom domain — punkrockai.com

Cloudflare Pages handles TLS automatically once the domain points at the
project. The recommended setup is to manage DNS for `punkrockai.com` *inside*
Cloudflare (apex CNAME flattening makes this trivial). If the registrar is
elsewhere, point its NS records at Cloudflare first.

### 2a. Add the custom domains in Pages

In Pages project → **Custom domains** → **Set up a custom domain**:

1. Add `punkrockai.com` (apex). Cloudflare will offer to create the DNS record
   for you when the zone is on Cloudflare. Accept it.
2. Add `www.punkrockai.com`. Same flow.

### 2b. DNS records (when zone is on Cloudflare — recommended)

Cloudflare's CNAME flattening lets the apex be a CNAME. Pages auto-creates the
records when you add the custom domain, but verify under **DNS → Records**:

| Type | Name | Target | Proxy | TTL |
|---|---|---|---|---|
| CNAME | `punkrockai.com` (apex) | `<project>.pages.dev` | Proxied (orange cloud) | Auto |
| CNAME | `www` | `<project>.pages.dev` | Proxied (orange cloud) | Auto |

Cloudflare will display the apex as `@` or `punkrockai.com`; both mean the
same thing.

### 2c. DNS records (when zone is at an external registrar — fallback)

If you cannot move DNS to Cloudflare:

| Type | Name | Target | Notes |
|---|---|---|---|
| ALIAS / ANAME | `punkrockai.com` | `<project>.pages.dev` | Use ALIAS/ANAME if the registrar supports it |
| CNAME | `www` | `<project>.pages.dev` | |

If the registrar has neither ALIAS nor ANAME, move the zone to Cloudflare —
A-record IPs for Pages are not stable.

### 2d. Verify TLS

After adding the custom domain, Cloudflare provisions a Universal SSL cert.
Wait for the **Active** status badge in the Pages custom-domain panel
(typically <5 min, sometimes up to 15).

```sh
curl -sI https://punkrockai.com/ | head -1
curl -sI https://www.punkrockai.com/ | head -1
```

Both should return `HTTP/2 200`. No mixed-content warnings in the browser
devtools console on `/`, `/talk`, `/release-day`.

### 2e. Force HTTPS + www→apex redirect (optional but recommended)

In Cloudflare dashboard for the zone:

- **SSL/TLS → Overview**: set mode to **Full (strict)**.
- **SSL/TLS → Edge Certificates**: enable **Always Use HTTPS**.
- **Rules → Redirect Rules**: create a static rule `www.punkrockai.com/*` →
  `https://punkrockai.com/$1` (301). Optional — both hostnames work without
  it.

---

## 3. Workers (deferred — required for Pattern Finder + Submissions)

The static site works without the workers; widgets degrade gracefully (Pattern
Finder shows the prompt for copy-paste; Release Day shows a mailto fallback).
Deploy the workers when you want the live versions.

### 3a. `worker/pattern-finder`

Bindings expected by `worker/pattern-finder/index.js`:

| Binding | Type | How to set |
|---|---|---|
| `ANTHROPIC_API_KEY` | Secret | `wrangler secret put ANTHROPIC_API_KEY` |
| `RATE_LIMIT` | KV namespace | `wrangler kv namespace create RATE_LIMIT`, paste id into `wrangler.toml` |
| `ALLOWED_ORIGIN` | Var | already set to `https://punkrockai.com` in `wrangler.toml` |

Deploy:

```sh
cd worker/pattern-finder
wrangler kv namespace create RATE_LIMIT          # paste id into wrangler.toml
wrangler secret put ANTHROPIC_API_KEY            # paste your key
wrangler deploy
```

Note the deployed URL (e.g. `https://pattern-finder.<your-account>.workers.dev`).

### 3b. `worker/submissions`

Bindings expected by `worker/submissions/index.js`:

| Binding | Type | How to set |
|---|---|---|
| `NOTION_API_KEY` | Secret | `wrangler secret put NOTION_API_KEY` |
| `NOTION_DB_ID` | Var or secret | paste 32-char hex into `wrangler.toml` `[vars]`, or `wrangler secret put NOTION_DB_ID` |
| `RATE_LIMIT` | KV namespace (optional) | `wrangler kv namespace create RATE_LIMIT`, paste id |
| `ALLOWED_ORIGIN` | Var | already set in `wrangler.toml` |

Notion DB schema is documented in `worker/submissions/README.md` — the
property names are referenced verbatim by the worker.

Deploy:

```sh
cd worker/submissions
wrangler kv namespace create RATE_LIMIT          # optional but recommended
wrangler secret put NOTION_API_KEY
wrangler deploy
```

### 3c. Wire workers into the site

After both workers are deployed, edit `site/_redirects` and replace the
`YOUR-WORKERS` placeholders:

```
/api/pattern-finder   https://pattern-finder.<account>.workers.dev/  200
/api/submissions      https://submissions.<account>.workers.dev/     200
```

Commit + push. Pages redeploys on push.

Better long-term: add custom routes in each worker's dashboard
(`api.punkrockai.com/pattern-finder/*`, etc.) and update `_redirects` to point
at the custom hostname. Avoids leaking the account-shaped workers.dev URL.

---

## 4. Promotion: staging → production

Cloudflare Pages does not have an explicit "promote" button; the model is:

- Every push to `main` IS production. No manual promotion step.
- Every PR / non-main branch gets a **preview** URL like
  `<commit-or-branch>.<project>.pages.dev`.

To "promote" a preview:

1. Open the PR in GitHub.
2. Verify the preview URL works end-to-end.
3. Merge the PR. The merge commit triggers a production deploy.
4. Confirm the new build appears at `https://punkrockai.com` within ~60s.

If you want a separate staging environment (different domain, different
data), create a second Pages project (`punkrockai-staging`) pointed at a
`staging` branch in the same repo, with its own custom subdomain like
`staging.punkrockai.com`. Not currently configured.

---

## 5. Manual preview deploy (out-of-band)

For pushing a local build to Cloudflare without going through Git
(useful for hotfixes, content review, demo links):

```sh
./scripts/deploy-preview.sh                 # uploads site/ as a preview
./scripts/deploy-preview.sh --production    # uploads as production
```

The script wraps `wrangler pages deploy site --project-name=punkrockai`. It
prints the resulting URL. See `scripts/deploy-preview.sh` for details.

Requires `wrangler login` to have been run once on the machine.

---

## 6. Rollback

Cloudflare Pages keeps every prior deployment indefinitely. Rollback is a
one-click revert in the dashboard, no Git changes required.

### Dashboard rollback

1. Pages project → **Deployments** tab.
2. Find the last known-good deployment (look at the commit SHA / timestamp).
3. Click **…** menu → **Rollback to this deployment**.
4. Cloudflare instantly switches `punkrockai.com` to that build.

### Git rollback (longer, but rewrites history)

```sh
git revert <bad-sha>
git push origin main
```

A new deploy starts on push. Use this when the bad change must also leave the
codebase, not only the live site.

### Worker rollback

```sh
cd worker/<name>
wrangler rollback                # interactive picker of prior versions
```

---

## 7. Acceptance checklist (issue #58)

Run through this list after Pages + DNS are set up:

- [ ] `https://punkrockai.com/` returns 200
- [ ] `https://www.punkrockai.com/` returns 200
- [ ] No mixed-content warnings on `/`, `/talk`, `/release-day`, `/library`
- [ ] `curl -sI https://punkrockai.com/` shows the CSP header from `_headers`
- [ ] `curl -s https://punkrockai.com/talk` returns the `talk.html` body
      (proves `_redirects` rewrites work)
- [ ] `https://<project>.pages.dev/` also serves the same build (staging URL)
- [ ] Push to `main` triggers a new build within 30s

After workers are deployed (separate, non-blocking):

- [ ] `POST /api/pattern-finder` returns a 200 with a valid Claude response
- [ ] `POST /api/submissions` creates a Notion row with `Published: false`

---

## 8. What's stored where

| Thing | Location |
|---|---|
| Static HTML / CSS / JS | repo `site/`, served by CF Pages |
| Slide hi-res originals | R2 bucket `punkrockai-slides` (provisioned separately) |
| Slide WebP fallbacks | repo `site/public/images/slides/` (committed) |
| Notion submissions | Notion database (id in `worker/submissions/wrangler.toml` `[vars]`) |
| Anthropic API key | CF Worker secret on `pattern-finder` |
| Notion integration key | CF Worker secret on `submissions` |
| Rate-limit counters | CF KV namespaces named `RATE_LIMIT`, one per worker |

`.env.example` documents every env var the local tooling reads. Worker
secrets are listed there as comments only — they are never read from `.env`,
they live in Cloudflare via `wrangler secret put`.

---

## 9. Troubleshooting

**Build fails immediately.** There is no build step. If Pages is running one,
the project was misconfigured — check **Settings → Builds & deployments**,
clear the build command, set output dir to `site`.

**TLS stuck on "Initializing".** Wait 15 min. If still stuck: in the custom
domain panel, click **Retry**. If still stuck: confirm the CNAME points to
`<project>.pages.dev`, not the bare domain or an old A record.

**`_redirects` rules don't apply.** They must live at `site/_redirects`
(top of the build output dir), not at repo root. They do — verify with
`ls site/_redirects`.

**Worker returns 5xx.** Check `wrangler tail` from the worker dir. Most
likely a missing secret. Re-run `./scripts/preflight-cf.sh`.

**Apex domain errors with "no DNS record found".** The Pages project did not
auto-create the apex CNAME. Add it manually in **DNS → Records** per §2b.
