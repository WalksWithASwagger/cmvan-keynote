// /library — Fuse.js fuzzy search over the markdown index. Keeps the bar
// sticky, debounces input, hydrates filter chips from collections in the
// payload. Highlights matched substrings in the summary excerpt.

const SEARCH_KEYS = [
  { name: "title", weight: 4 },
  { name: "headings.text", weight: 2 },
  { name: "summary", weight: 1.5 },
  { name: "body", weight: 1 },
  { name: "path", weight: 0.5 },
];

const inputEl = document.getElementById("lib-search");
const countEl = document.getElementById("lib-count");
const statsEl = document.getElementById("lib-stats");
const chipsEl = document.getElementById("lib-chips");
const resultsEl = document.getElementById("lib-results");

let docs = [];
let collections = [];
let activeCollections = new Set();
let fuse = null;

main();

async function main() {
  try {
    const res = await fetch("/data/library.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    docs = payload.docs;
    collections = payload.collections;
    activeCollections = new Set(collections.map((c) => c.id));
    statsEl.textContent = `${docs.length} documents · ${(payload.docs.reduce((n, d) => n + d.bytes, 0) / 1024).toFixed(0)} KB indexed`;
    renderChips();
    await whenFuseReady();
    fuse = new Fuse(docs, {
      keys: SEARCH_KEYS,
      threshold: 0.34,
      ignoreLocation: true,
      includeMatches: true,
      includeScore: true,
      minMatchCharLength: 2,
    });
    inputEl.addEventListener("input", debounce(repaint, 120));
    inputEl.focus();
    repaint();
  } catch (err) {
    statsEl.textContent = "library data unavailable — run `npm run build:library`.";
    console.warn("[library]", err);
  }
}

function whenFuseReady() {
  return new Promise((resolve) => {
    if (typeof Fuse !== "undefined") return resolve();
    const t = setInterval(() => {
      if (typeof Fuse !== "undefined") {
        clearInterval(t);
        resolve();
      }
    }, 50);
    setTimeout(() => {
      clearInterval(t);
      resolve();
    }, 4000);
  });
}

function renderChips() {
  chipsEl.innerHTML = "";
  for (const c of collections) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lib-chip";
    btn.textContent = c.label;
    btn.setAttribute("data-collection", c.id);
    btn.setAttribute("aria-pressed", "true");
    btn.addEventListener("click", () => toggleCollection(c.id, btn));
    chipsEl.appendChild(btn);
  }
}

function toggleCollection(id, btn) {
  if (activeCollections.has(id)) {
    activeCollections.delete(id);
    btn.setAttribute("aria-pressed", "false");
  } else {
    activeCollections.add(id);
    btn.setAttribute("aria-pressed", "true");
  }
  if (activeCollections.size === 0) {
    activeCollections = new Set(collections.map((c) => c.id));
    chipsEl.querySelectorAll(".lib-chip").forEach((b) => b.setAttribute("aria-pressed", "true"));
  }
  repaint();
}

function repaint() {
  const q = (inputEl.value || "").trim();
  const filtered = q && fuse
    ? fuse.search(q).filter((r) => activeCollections.has(r.item.collection))
    : docs
        .filter((d) => activeCollections.has(d.collection))
        .map((item) => ({ item, matches: [] }));

  countEl.textContent = q
    ? `${filtered.length} match${filtered.length === 1 ? "" : "es"} for "${q}"`
    : `${filtered.length} of ${docs.length}`;

  resultsEl.innerHTML = "";
  if (!filtered.length) {
    const empty = document.createElement("li");
    empty.className = "lib-empty";
    empty.innerHTML = `<p>${q ? `Nothing matches &ldquo;<strong>${escapeHTML(q)}</strong>&rdquo;.` : "No collection selected."}</p>`;
    resultsEl.appendChild(empty);
    return;
  }
  for (const r of filtered.slice(0, 60)) {
    resultsEl.appendChild(renderCard(r, q));
  }
}

function renderCard(result, q) {
  const d = result.item;
  const li = document.createElement("li");
  li.className = "lib-card";
  const summary = highlight(d.summary || d.body.slice(0, 220), q);
  li.innerHTML = `
    <div class="lib-card__head">
      <h3 class="lib-card__title"><a href="${escapeAttr(d.githubRaw)}" target="_blank" rel="noopener">${escapeHTML(d.title)}</a></h3>
      <span class="lib-card__collection">${escapeHTML(d.collectionLabel)}</span>
    </div>
    <p class="lib-card__path">${escapeHTML(d.path)}</p>
    <p class="lib-card__summary">${summary}</p>
    <div class="lib-card__meta">
      <span>${(d.bytes / 1024).toFixed(0)} KB</span>
      ${d.headings.length ? `<span>${d.headings.length} sections</span>` : ""}
      ${d.truncated ? `<span>excerpt only</span>` : ""}
      <a href="${escapeAttr(d.githubRaw)}" target="_blank" rel="noopener">view source ↗</a>
    </div>
  `;
  return li;
}

function highlight(text, q) {
  const safe = escapeHTML(text || "");
  if (!q) return safe;
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  if (!tokens.length) return safe;
  const re = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "gi");
  return safe.replace(re, "<mark>$1</mark>");
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
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
