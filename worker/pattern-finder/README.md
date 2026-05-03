# worker/pattern-finder

Cloudflare Worker that proxies Claude Sonnet 4.6 calls for the Pattern Finder
widget at `/widgets/pattern-finder.html`. System prompt marked for ephemeral
prompt caching so per-call cost stays low under load. Per-IP rate-limit
(10 calls / hour) via a bound KV namespace.

## Deploy

```sh
cd worker/pattern-finder
wrangler kv namespace create RATE_LIMIT     # paste id into wrangler.toml
wrangler secret put ANTHROPIC_API_KEY        # paste your key
wrangler deploy
```

Then update `site/_redirects` to point `/api/pattern-finder` at the deployed
worker URL.

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
- System prompt has `cache_control: { type: "ephemeral" }` — prompt cache hits
  drop the per-call cost roughly 10x once the cache is warm.
