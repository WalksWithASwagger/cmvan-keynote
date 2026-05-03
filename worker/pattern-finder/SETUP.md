# Pattern Finder Worker — Setup

End-to-end checklist to take the worker from cloned repo to a live deployment
that proxies Claude Sonnet 4.6 with KV-backed response caching and per-IP rate
limiting.

## 1. Prerequisites

- Cloudflare account with a Workers plan (free tier is fine)
- `wrangler` CLI installed and authenticated (`npx wrangler login`)
- An Anthropic API key

## 2. Get an Anthropic API key

1. Sign in at <https://console.anthropic.com>.
2. Go to **Settings → API Keys → Create Key**.
3. Give it a name (e.g. `pattern-finder-prod`) and copy the value once — you
   cannot view it again.
4. Confirm the workspace has billing enabled and a usage cap that matches what
   you're willing to pay for unauthenticated public traffic. The widget caps
   inbound at 10 requests / IP / hour and 40k input chars per request, but you
   should still set a hard monthly spend ceiling on the Anthropic side.

The worker uses model `claude-sonnet-4-6` by default. To run cheaper, edit
`MODEL` in `index.js` to `claude-haiku-4-5-20251001`.

## 3. Create the KV namespaces

```sh
cd worker/pattern-finder
npx wrangler kv namespace create RATE_LIMIT
npx wrangler kv namespace create KV_PATTERNS
```

Each command prints an `id`. Open `wrangler.toml`, uncomment the two
`[[kv_namespaces]]` blocks, and paste the ids in.

## 4. Set the API key as a secret

```sh
npx wrangler secret put ANTHROPIC_API_KEY
# paste the key from step 2 when prompted
```

The secret is encrypted at rest on Cloudflare and never written to disk
locally. Do not put the key in `wrangler.toml` or `.env` files in the repo.

## 5. Deploy

```sh
npx wrangler deploy
```

Note the worker URL printed at the end (e.g.
`https://pattern-finder.<account>.workers.dev`).

## 6. Wire the front-end

Update `site/_redirects` so `/api/pattern-finder` proxies to the deployed
worker URL. Re-deploy the site.

## 7. Smoke test

```sh
curl -X POST https://pattern-finder.<account>.workers.dev \
  -H 'content-type: application/json' \
  -d '{"corpus":"the night I broke my camera in iceland..."}'
```

- First call: 200, response body contains `patterns` array, response header
  `x-cache: MISS`.
- Identical second call: 200, header `x-cache: HIT` (served from KV, no
  Anthropic spend).
- 11th call from same IP within an hour: 429 with rate-limit message.
- If you intentionally `wrangler secret delete ANTHROPIC_API_KEY` and redeploy,
  the worker should return 503 with a clear "not configured" message instead
  of 5xx-ing.

## 8. Monitoring

```sh
npx wrangler tail
```

Watch logs while hitting the widget. Confirm `x-cache: HIT` shows up on
repeats and that the rate-limit returns 429 once exhausted.

## Reference: env vars and bindings

| Name                | Type   | Required | Notes                                  |
| ------------------- | ------ | -------- | -------------------------------------- |
| `ANTHROPIC_API_KEY` | secret | yes\*    | \*Without it the worker returns 503.   |
| `RATE_LIMIT`        | KV     | no       | If unbound, rate limiting is disabled. |
| `KV_PATTERNS`       | KV     | no       | If unbound, response cache is bypassed.|
| `ALLOWED_ORIGIN`    | var    | no       | Defaults to `https://punkrockai.com`.  |
