# worker/pattern-finder

Cloudflare Worker prototype that proxies Claude Sonnet 4.6 calls for the
Pattern Finder widget at `/widgets/pattern-finder.html`. Production backend
ownership is still undecided in #139 / BC-56; do not deploy this as the active
path until that decision is accepted. System prompt marked for ephemeral prompt
caching so per-call cost stays low under load. Per-IP rate-limit (10 calls /
hour) via a bound KV namespace.

## Deploy

See `SETUP.md` for the full step-by-step (Anthropic key, KV namespaces,
secret, deploy, smoke test). TL;DR:

```sh
cd worker/pattern-finder
wrangler kv namespace create RATE_LIMIT      # paste id into wrangler.toml
wrangler kv namespace create KV_PATTERNS     # paste id into wrangler.toml
wrangler secret put ANTHROPIC_API_KEY         # paste your key
wrangler deploy
```

Then update `site/_redirects` to point `/api/pattern-finder` at the deployed
worker URL.

If `ANTHROPIC_API_KEY` isn't set, the worker returns 503 with a clear
"not configured" message — the front-end already handles that gracefully.

## Local dev

```sh
wrangler dev                                  # serves on localhost:8787
ANTHROPIC_API_KEY=sk-... wrangler dev         # if not using secret store
```

The widget calls `/api/pattern-finder` — when the worker isn't reachable, the
front-end shows "Pattern Finder isn't connected yet" and offers a copy of the
prompt template the user can paste into Claude / ChatGPT directly. So nothing
is gated on the worker existing.

## Cost control knobs

- `MAX_INPUT_CHARS = 40_000` — caps user corpus size.
- `MAX_TOKENS = 1500` — caps Claude's response.
- Rate limit `10 / IP / hour` — adjustable in `index.js`.
- Response cache in `KV_PATTERNS` — identical corpus skips Anthropic entirely
  for 7 days. `x-cache: HIT` / `MISS` header signals which path served the
  request.
- System prompt has `cache_control: { type: "ephemeral" }` — prompt cache hits
  drop the per-call cost roughly 10x once the cache is warm.
