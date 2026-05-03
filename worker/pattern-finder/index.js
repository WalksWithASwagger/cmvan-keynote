// Cloudflare Worker — Pattern Finder.
//
// POST /pattern-finder { corpus: string }  → { patterns: [{ name, evidence }] }
//
// Calls Claude Sonnet 4.6 via the Anthropic Messages API. The system prompt
// is hardcoded and marked for prompt caching so the per-call cost stays low
// when many users hit the worker. Per-IP rate limit (10 calls / hour) via
// the bound KV namespace.
//
// Required wrangler bindings (see wrangler.toml):
//   secret  ANTHROPIC_API_KEY
//   kv      RATE_LIMIT     (per-IP rate limiting)
//   kv      KV_PATTERNS    (response cache, keyed by sha256 of corpus)
//   var     ALLOWED_ORIGIN (default: https://punkrockai.com)
//
// Deploy:
//   cd worker/pattern-finder
//   wrangler secret put ANTHROPIC_API_KEY
//   wrangler deploy
//
// Then point /api/pattern-finder at the deployed worker URL via site/_redirects.

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1500;
const RATE_LIMIT_PER_HOUR = 10;
const MAX_INPUT_CHARS = 40_000;
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const SYSTEM_PROMPT = `You are a Pattern Finder. The user gives you a corpus
of their own creative work — blog posts, photo captions, project descriptions,
the things they've made. You name the patterns that recur.

You are not a critic and not a hype machine. You are a mirror sharp enough to
show the user the structural choices they keep making without ever consciously
articulating. Decades on the cutting room floor compressed into a sensibility
— that's what you surface.

Process:
1. Identify 4-7 recurring patterns. Stick to what is actually present in the
   corpus. Do not project. Do not invent. If the corpus is too short or too
   sparse to make a confident claim, say so.
2. For each pattern, name it in 2-6 words using the user's own register
   wherever possible. Avoid generic terms like "thoughtful prose" or
   "creative use of color" — those tell the user nothing they didn't already
   know.
3. For each pattern, cite 2-3 specific phrases or short excerpts from the
   corpus as evidence. Quote them directly. Don't paraphrase.
4. Order patterns by confidence — the most clearly present first.

Return ONLY valid JSON of shape:
  { "patterns": [
      { "name": "...", "evidence": ["...", "...", "..."], "note": "..." }
    ],
    "summary": "2-3 sentence reflection on what the patterns add up to"
  }

The "note" field on each pattern is optional — use it when there's something
worth flagging the user toward (a tension between two patterns, a place where
the pattern is more visible in earlier vs later work, etc.).

Do not pad. Do not flatter. Do not include any text outside the JSON.`;

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return cors(env);
    if (request.method !== "POST") {
      return jsonError(405, "method not allowed", env);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const allowed = await checkRateLimit(env, ip);
    if (!allowed) {
      return jsonError(429, `rate limited — ${RATE_LIMIT_PER_HOUR}/hour per IP`, env);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonError(400, "invalid JSON body", env);
    }

    const corpus = typeof body.corpus === "string" ? body.corpus.trim() : "";
    if (!corpus) return jsonError(400, "corpus is required", env);
    if (corpus.length > MAX_INPUT_CHARS) {
      return jsonError(413, `corpus exceeds ${MAX_INPUT_CHARS} chars`, env);
    }

    if (!env.ANTHROPIC_API_KEY) {
      return jsonError(
        503,
        "Pattern Finder is not configured yet — ANTHROPIC_API_KEY missing on the worker",
        env,
      );
    }

    const cacheKey = await sha256(`${MODEL}:${corpus}`);
    const cached = await readCache(env, cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { ...corsHeaders(env), "x-cache": "HIT" },
      });
    }

    try {
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [
            {
              role: "user",
              content: `Here is my corpus. Find the patterns.\n\n---\n\n${corpus}`,
            },
          ],
        }),
      });

      if (!claudeRes.ok) {
        const text = await claudeRes.text();
        return jsonError(502, `claude error: ${claudeRes.status} ${text.slice(0, 300)}`, env);
      }

      const data = await claudeRes.json();
      const text = data?.content?.[0]?.text || "";
      const parsed = safeParseJson(text);
      if (!parsed) {
        return jsonError(502, "claude returned non-JSON output", env);
      }

      ctx.waitUntil(writeCache(env, cacheKey, parsed));

      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { ...corsHeaders(env), "x-cache": "MISS" },
      });
    } catch (err) {
      return jsonError(500, `worker error: ${err.message}`, env);
    }
  },
};

// ---------------------------------------------------------------------------

async function checkRateLimit(env, ip) {
  if (!env.RATE_LIMIT) return true; // KV not bound (e.g. local dev) — allow
  const key = `pf:${ip}:${currentHour()}`;
  const current = Number((await env.RATE_LIMIT.get(key)) || 0);
  if (current >= RATE_LIMIT_PER_HOUR) return false;
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: 3700 });
  return true;
}

async function readCache(env, key) {
  if (!env.KV_PATTERNS) return null;
  try {
    return await env.KV_PATTERNS.get(`pf:${key}`, "json");
  } catch {
    return null;
  }
}

async function writeCache(env, key, value) {
  if (!env.KV_PATTERNS) return;
  try {
    await env.KV_PATTERNS.put(`pf:${key}`, JSON.stringify(value), {
      expirationTtl: CACHE_TTL_SECONDS,
    });
  } catch {
    // best-effort cache; never fail the request on cache write
  }
}

async function sha256(input) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function currentHour() {
  return Math.floor(Date.now() / 3_600_000);
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    // claude sometimes wraps JSON in ```json fences
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function corsHeaders(env) {
  const origin = env.ALLOWED_ORIGIN || "https://punkrockai.com";
  return {
    "content-type": "application/json",
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "vary": "Origin",
  };
}

function cors(env) {
  return new Response(null, { status: 204, headers: corsHeaders(env) });
}

function jsonError(status, message, env) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: corsHeaders(env),
  });
}
