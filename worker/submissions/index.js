// Cloudflare Worker — Release Day submissions.
//
// POST /submissions { name, handle?, url, what, why? }  → { id, status }
// GET  /submissions                                       → { submissions: [] }
//   (returns published items only, mirrored to site/data/submissions.json
//   by a separate cron worker that polls Notion. The GET endpoint here is
//   kept simple for fallback use.)
//
// Required wrangler bindings (see wrangler.toml):
//   secret  NOTION_TOKEN       Notion integration token
//   var     NOTION_DB_ID       database id (from Notion DB share URL)
//   var     ALLOWED_ORIGIN     default https://punkrockai.com
//   kv      RATE_LIMIT         optional, 5 submits/IP/hour
//
// Notion DB schema (see worker/submissions/README.md for setup):
//   Name           title
//   Handle         rich_text
//   URL            url
//   What           rich_text
//   Why            rich_text
//   Submitted      date
//   IP             rich_text
//   Published      checkbox  ← moderation gate. Default false.
//   Status         select    pending | published | rejected

const RATE_LIMIT_PER_HOUR = 5;
const MAX_FIELD_LENGTHS = {
  name: 80,
  handle: 80,
  url: 500,
  what: 120,
  why: 600,
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return cors(env);
    if (request.method === "POST") return handlePost(request, env);
    if (request.method === "GET") return handleGet(request, env);
    return jsonError(405, "method not allowed", env);
  },
};

// ---------------------------------------------------------------------------

async function handlePost(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const allowed = await checkRateLimit(env, ip);
  if (!allowed) return jsonError(429, `rate limited — ${RATE_LIMIT_PER_HOUR}/hour`, env);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid JSON body", env);
  }

  const submission = sanitize(body);
  if (!submission.name) return jsonError(400, "name is required", env);
  if (!submission.url) return jsonError(400, "url is required", env);
  if (!submission.what) return jsonError(400, "what is required", env);
  if (!isValidUrl(submission.url)) return jsonError(400, "url must be a valid http(s) URL", env);

  if (!env.NOTION_TOKEN || !env.NOTION_DB_ID) {
    console.warn(
      "submissions: NOTION_TOKEN or NOTION_DB_ID missing — accepting submission without persistence",
      { name: submission.name, url: submission.url, hasToken: !!env.NOTION_TOKEN, hasDbId: !!env.NOTION_DB_ID },
    );
    return jsonResponse({ id: null, status: "queued-no-backend" }, 202, env);
  }

  try {
    const id = await postToNotion(env, submission, ip);
    return jsonResponse({ id, status: "pending" }, 201, env);
  } catch (err) {
    return jsonError(502, `notion error: ${err.message}`, env);
  }
}

async function handleGet(request, env) {
  if (!env.NOTION_TOKEN || !env.NOTION_DB_ID) {
    return jsonResponse({ submissions: [] }, 200, env);
  }
  try {
    const submissions = await queryNotion(env);
    return jsonResponse({ submissions }, 200, env);
  } catch (err) {
    return jsonError(502, `notion error: ${err.message}`, env);
  }
}

// ---------------------------------------------------------------------------

function sanitize(body) {
  const pick = (key) => {
    const v = body[key];
    if (typeof v !== "string") return "";
    return v.trim().slice(0, MAX_FIELD_LENGTHS[key] ?? 1000);
  };
  return {
    name: pick("name"),
    handle: pick("handle"),
    url: pick("url"),
    what: pick("what"),
    why: pick("why"),
  };
}

function isValidUrl(s) {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function postToNotion(env, sub, ip) {
  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: notionHeaders(env),
    body: JSON.stringify({
      parent: { database_id: env.NOTION_DB_ID },
      properties: {
        Name: { title: [{ text: { content: sub.name } }] },
        Handle: sub.handle ? { rich_text: [{ text: { content: sub.handle } }] } : { rich_text: [] },
        URL: { url: sub.url },
        What: { rich_text: [{ text: { content: sub.what } }] },
        Why: sub.why ? { rich_text: [{ text: { content: sub.why } }] } : { rich_text: [] },
        Submitted: { date: { start: new Date().toISOString() } },
        IP: { rich_text: [{ text: { content: ip } }] },
        Published: { checkbox: false },
        Status: { select: { name: "pending" } },
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.id;
}

async function queryNotion(env) {
  const res = await fetch(`https://api.notion.com/v1/databases/${env.NOTION_DB_ID}/query`, {
    method: "POST",
    headers: notionHeaders(env),
    body: JSON.stringify({
      filter: { property: "Published", checkbox: { equals: true } },
      sorts: [{ property: "Submitted", direction: "descending" }],
      page_size: 100,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.results || []).map(mapNotionRow);
}

function mapNotionRow(row) {
  const p = row.properties || {};
  return {
    id: row.id,
    name: textOf(p.Name?.title),
    handle: textOf(p.Handle?.rich_text),
    url: p.URL?.url || null,
    what: textOf(p.What?.rich_text),
    why: textOf(p.Why?.rich_text),
    submittedAt: p.Submitted?.date?.start || null,
  };
}

function textOf(arr) {
  if (!Array.isArray(arr) || !arr.length) return "";
  return arr.map((b) => b?.plain_text || b?.text?.content || "").join("");
}

function notionHeaders(env) {
  return {
    "content-type": "application/json",
    "authorization": `Bearer ${env.NOTION_TOKEN}`,
    "notion-version": "2022-06-28",
  };
}

// ---------------------------------------------------------------------------

async function checkRateLimit(env, ip) {
  if (!env.RATE_LIMIT) return true;
  const key = `sub:${ip}:${currentHour()}`;
  const current = Number((await env.RATE_LIMIT.get(key)) || 0);
  if (current >= RATE_LIMIT_PER_HOUR) return false;
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: 3700 });
  return true;
}

function currentHour() {
  return Math.floor(Date.now() / 3_600_000);
}

function corsHeaders(env) {
  const origin = env.ALLOWED_ORIGIN || "https://punkrockai.com";
  return {
    "content-type": "application/json",
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "vary": "Origin",
  };
}

function cors(env) {
  return new Response(null, { status: 204, headers: corsHeaders(env) });
}

function jsonResponse(payload, status, env) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders(env) });
}

function jsonError(status, message, env) {
  return jsonResponse({ error: message }, status, env);
}
