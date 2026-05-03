// /widgets/word-ban — paste text, highlight every entry from the refuse list.
// Defaults seed a list of common "AI tells." Custom list autosaves to
// localStorage. Optional: load entries from the Three Documents style-guide
// draft already in localStorage (no roundtrip; same browser, same key).

import { load, save, debounceSave, remove } from "/js/common/storage.js";

const DEFAULTS = [
  "delve",
  "leverage",
  "robust",
  "seamless",
  "navigate",
  "tapestry",
  "journey",
  "realm",
  "landscape",
  "foster",
  "cultivate",
  "elevate",
  "furthermore",
  "moreover",
  "in conclusion",
  "in today's world",
  "in the world of",
  "it's important to note",
  "comprehensive",
  "synergy",
  "best practices",
  "thought leader",
  "low-hanging fruit",
  "circle back",
  "ecosystem",
  "ideate",
  "vibrant",
  "empower",
  "unlock",
  "unleash",
  "pivotal",
];

const STORAGE_KEY = "wban:list";
const LAST_INPUT_KEY = "wban:input";

const inputEl = document.getElementById("wban-input");
const listEl = document.getElementById("wban-list");
const outputEl = document.getElementById("wban-output");
const hitsBox = document.getElementById("wban-hits");
const hitsList = document.getElementById("wban-hit-list");
const countsBox = document.getElementById("wban-counts");
const statusEl = document.getElementById("wban-status");
const listCountEl = document.querySelector("[data-list-count]");

const debouncedSaveList = debounceSave(STORAGE_KEY, 300);
const debouncedSaveInput = debounceSave(LAST_INPUT_KEY, 600);

hydrate();
bind();
paintListMeta();

function hydrate() {
  const { value } = load(STORAGE_KEY, null);
  listEl.value = Array.isArray(value) && value.length ? value.join("\n") : DEFAULTS.join("\n");
  const { value: prevInput } = load(LAST_INPUT_KEY, "");
  if (typeof prevInput === "string" && prevInput) inputEl.value = prevInput;
}

function bind() {
  document.querySelector('[data-action="scan"]').addEventListener("click", scan);
  document.querySelector('[data-action="clear"]').addEventListener("click", clear);
  document.querySelector('[data-action="copy-clean"]').addEventListener("click", copyClean);
  document.querySelector('[data-action="load-style"]').addEventListener("click", loadFromStyleGuide);
  document.querySelector('[data-action="reset-list"]').addEventListener("click", resetList);

  inputEl.addEventListener("input", () => debouncedSaveInput(inputEl.value));
  listEl.addEventListener("input", () => {
    debouncedSaveList(parseList(listEl.value));
    paintListMeta();
  });
}

function parseList(raw) {
  return Array.from(
    new Set(
      String(raw || "")
        .split(/\r?\n/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function paintListMeta() {
  const items = parseList(listEl.value);
  listCountEl.textContent = String(items.length);
}

// ---------------------------------------------------------------------------

function scan() {
  const text = (inputEl.value || "").trim();
  if (!text) {
    flash("paste something first");
    return;
  }
  const banList = parseList(listEl.value);
  if (!banList.length) {
    flash("refuse list is empty");
    return;
  }

  // build a single regex matching any entry on word boundaries (multi-word
  // phrases supported). escape regex metacharacters in entries first.
  const escaped = banList.map(escapeRegex).sort((a, b) => b.length - a.length);
  const re = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");

  // count words for stats
  const totalWords = text.split(/\s+/).filter(Boolean).length;
  const hits = new Map();
  let totalHits = 0;

  // wrap matches in <mark> while preserving the rest of the text safely
  const html = highlight(text, re, (match) => {
    const k = match.toLowerCase();
    hits.set(k, (hits.get(k) || 0) + 1);
    totalHits++;
    return `<mark>${escapeHTML(match)}</mark>`;
  });

  outputEl.innerHTML = html;
  paintCounts(totalHits, hits.size, totalWords);
  paintHits(hits);
  flash(totalHits ? `${totalHits} hit${totalHits === 1 ? "" : "s"} found` : "no offenders — clean draft");
}

function highlight(text, re, wrap) {
  let out = "";
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    out += escapeHTML(text.slice(last, m.index));
    out += wrap(m[0]);
    last = m.index + m[0].length;
  }
  out += escapeHTML(text.slice(last));
  return out;
}

function paintCounts(hits, unique, words) {
  countsBox.hidden = hits === 0;
  setCount("hits", hits);
  setCount("unique", unique);
  setCount("words", words);
  setCount("rate", words ? `${Math.round((hits / words) * 1000) / 10}%` : "0%");
}

function setCount(name, value) {
  const el = document.querySelector(`[data-count="${name}"]`);
  if (el) el.textContent = String(value);
}

function paintHits(hits) {
  if (!hits.size) {
    hitsBox.hidden = true;
    hitsList.innerHTML = "";
    return;
  }
  hitsBox.hidden = false;
  const sorted = [...hits.entries()].sort((a, b) => b[1] - a[1]);
  hitsList.innerHTML = sorted
    .map(
      ([word, count]) =>
        `<li class="wban__hit">${escapeHTML(word)}<span class="wban__hit-count">${count}</span></li>`
    )
    .join("");
}

// ---------------------------------------------------------------------------

function clear() {
  inputEl.value = "";
  outputEl.innerHTML = "";
  countsBox.hidden = true;
  hitsBox.hidden = true;
  remove(LAST_INPUT_KEY);
  flash("cleared");
}

async function copyClean() {
  const clean = outputEl.innerText.trim();
  if (!clean) {
    flash("scan something first");
    return;
  }
  try {
    await navigator.clipboard.writeText(clean);
    flash("copied without highlights");
  } catch {
    flash("copy failed — select manually");
  }
}

function loadFromStyleGuide() {
  // The Three Documents widget stores the style-guide draft at
  // pra:v1:tdoc:style. Pull the raw text and try to extract a "refuse" list
  // from common patterns: lines after "Refuse:" or "Ban:" or "I refuse".
  const { value } = load("tdoc:style", "");
  if (!value || typeof value !== "string") {
    flash("no style guide draft yet — write one in /three-documents");
    return;
  }
  const harvested = harvestRefusals(value);
  if (!harvested.length) {
    flash("could not find a refuse list — list each word on its own line in the style guide");
    return;
  }
  const merged = parseList([listEl.value, harvested.join("\n")].join("\n"));
  listEl.value = merged.join("\n");
  debouncedSaveList(merged);
  paintListMeta();
  flash(`merged ${harvested.length} entr${harvested.length === 1 ? "y" : "ies"} from your style guide`);
}

function harvestRefusals(text) {
  const out = [];
  // pattern 1: explicit list block — "Refuse: a, b, c" or after a heading
  const refuseLine = text.match(/(?:refuse|ban|never use)[^\n]*?:\s*([^\n]+)/i);
  if (refuseLine) {
    refuseLine[1]
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((w) => out.push(w));
  }
  // pattern 2: bulleted list of words after "ten words" or similar
  const inSection = text.split(/\n(?=\s*(?:[-*•]|\d+\.))/);
  for (const block of inSection) {
    if (/refuse|ban/i.test(block.split("\n")[0])) {
      block
        .split(/\n/)
        .slice(1)
        .forEach((line) => {
          const m = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.+?)\s*$/);
          if (m) out.push(m[1].replace(/[.,;]+$/, ""));
        });
    }
  }
  return Array.from(new Set(out.filter((s) => s.length > 1 && s.length < 40)));
}

function resetList() {
  if (!window.confirm("Replace your refuse list with the defaults?")) return;
  listEl.value = DEFAULTS.join("\n");
  debouncedSaveList(DEFAULTS);
  paintListMeta();
  flash("reset to defaults");
}

// ---------------------------------------------------------------------------

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function flash(msg) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  clearTimeout(flash._t);
  flash._t = setTimeout(() => {
    if (statusEl) statusEl.textContent = "";
  }, 2500);
}
