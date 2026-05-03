// /widgets/releases-wall — public stream of Release Day submissions.
// Tries the live worker endpoint first; falls back to the static JSON in
// site/data/submissions.json. Cards are recency-sorted (newest first) and
// laid out as a CSS-column masonry stream.

const LIVE_ENDPOINT = "/api/submissions";
const FALLBACK_ENDPOINT = "/data/submissions.json";

const gridEl = document.getElementById("rw-grid");
const emptyEl = document.getElementById("rw-empty");
const errorEl = document.getElementById("rw-error");
const statsEl = document.getElementById("rw-stats");

main();

async function main() {
  const submissions = await loadSubmissions();
  if (submissions === null) {
    if (errorEl) errorEl.hidden = false;
    if (statsEl) statsEl.textContent = "feed unavailable";
    return;
  }
  const sorted = sortByRecency(submissions);
  paintStats(sorted);
  paintGrid(sorted);
}

async function loadSubmissions() {
  const live = await tryFetch(LIVE_ENDPOINT);
  if (live && Array.isArray(live.submissions)) return live.submissions;
  const fallback = await tryFetch(FALLBACK_ENDPOINT);
  if (fallback && Array.isArray(fallback.submissions)) return fallback.submissions;
  return null;
}

async function tryFetch(url) {
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[releases-wall] ${url}`, err);
    return null;
  }
}

function sortByRecency(list) {
  return [...list].sort((a, b) => timestamp(b) - timestamp(a));
}

function timestamp(s) {
  const t = Date.parse(s.submittedAt ?? s.queuedAt ?? "");
  return Number.isNaN(t) ? 0 : t;
}

function paintStats(list) {
  if (!statsEl) return;
  if (!list.length) {
    statsEl.textContent = "0 releases";
    return;
  }
  const newest = list[0];
  const ts = timestamp(newest);
  const when = ts ? formatRelative(ts) : "recently";
  statsEl.textContent = `${list.length} release${list.length === 1 ? "" : "s"} · latest ${when}`;
}

function paintGrid(list) {
  if (!gridEl) return;
  if (!list.length) {
    if (emptyEl) emptyEl.hidden = false;
    gridEl.hidden = true;
    return;
  }
  gridEl.innerHTML = list.map(renderCard).join("");
}

function renderCard(s) {
  const handle = displayHandle(s);
  const when = s.submittedAt ? formatRelative(Date.parse(s.submittedAt)) : "";
  const what = (s.what ?? "").trim() || "Untitled";
  const why = snippet(s.why);
  const url = isHttp(s.url) ? s.url : "";
  const titleNode = url
    ? `<a class="rw-card__title-link" href="${escapeAttr(url)}" target="_blank" rel="noopener">${escapeHTML(what)}</a>`
    : escapeHTML(what);

  return `
    <li class="rw-card">
      <header class="rw-card__head">
        <span class="rw-card__handle">${escapeHTML(handle)}</span>
        ${when ? `<time class="rw-card__time">${escapeHTML(when)}</time>` : ""}
      </header>
      <h3 class="rw-card__title">${titleNode}</h3>
      ${why ? `<p class="rw-card__body">${escapeHTML(why)}</p>` : ""}
      ${url ? `<a class="rw-card__cta" href="${escapeAttr(url)}" target="_blank" rel="noopener">Open the work &rarr;</a>` : ""}
    </li>
  `;
}

function displayHandle(s) {
  const handle = (s.handle ?? "").trim();
  if (handle) return handle.startsWith("@") ? handle : `@${handle}`;
  const name = (s.name ?? "").trim();
  return name || "Anonymous";
}

function snippet(why) {
  const text = (why ?? "").trim();
  if (!text) return "";
  if (text.length <= 240) return text;
  return text.slice(0, 237).replace(/\s+\S*$/, "") + "…";
}

function isHttp(s) {
  if (typeof s !== "string") return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function formatRelative(ts) {
  const diff = Date.now() - ts;
  if (!Number.isFinite(diff) || diff < 0) return "just now";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(s) {
  return escapeHTML(s);
}
