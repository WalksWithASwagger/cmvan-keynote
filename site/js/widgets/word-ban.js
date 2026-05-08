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
const HISTORY_KEY = "wordban:history";
const LAST_PRESET_KEY = "wban:preset";
const PRESET_MODE_KEY = "wban:preset-mode";
const HISTORY_MAX = 10;

const inputEl = document.getElementById("wban-input");
const listEl = document.getElementById("wban-list");
const outputEl = document.getElementById("wban-output");
const hitsBox = document.getElementById("wban-hits");
const hitsList = document.getElementById("wban-hit-list");
const countsBox = document.getElementById("wban-counts");
const statusEl = document.getElementById("wban-status");
const listCountEl = document.querySelector("[data-list-count]");
const presetSelectEl = document.getElementById("wban-preset");
const presetBlurbEl = document.getElementById("wban-preset-blurb");
const presetModeEls = document.querySelectorAll('input[name="wban-preset-mode"]');
const historyBox = document.getElementById("wban-history");
const historyList = document.getElementById("wban-history-list");
const sparkEl = document.getElementById("wban-sparkline");
const diffBox = document.getElementById("wban-diff");
const diffMeta = document.getElementById("wban-diff-meta");
const diffAddedEl = document.getElementById("wban-diff-added");
const diffRemovedEl = document.getElementById("wban-diff-removed");
const diffSameEl = document.getElementById("wban-diff-same");

const selectedIds = new Set();

const debouncedSaveList = debounceSave(STORAGE_KEY, 300);
const debouncedSaveInput = debounceSave(LAST_INPUT_KEY, 600);

let presets = [];

hydrate();
bind();
paintListMeta();
loadPresets();
paintHistory();

function hydrate() {
  const { value } = load(STORAGE_KEY, null);
  listEl.value = Array.isArray(value) && value.length ? value.join("\n") : DEFAULTS.join("\n");
  const { value: prevInput } = load(LAST_INPUT_KEY, "");
  if (typeof prevInput === "string" && prevInput) inputEl.value = prevInput;
  const { value: presetMode } = load(PRESET_MODE_KEY, "stack");
  setPresetMode(presetMode === "replace" ? "replace" : "stack");
}

function bind() {
  document.querySelector('[data-action="scan"]').addEventListener("click", scan);
  document.querySelector('[data-action="clear"]').addEventListener("click", clear);
  document.querySelector('[data-action="copy-clean"]').addEventListener("click", copyClean);
  document.querySelector('[data-action="load-style"]').addEventListener("click", loadFromStyleGuide);
  document.querySelector('[data-action="reset-list"]').addEventListener("click", resetList);
  document.querySelector('[data-action="apply-preset"]').addEventListener("click", applySelectedPreset);

  if (presetSelectEl) {
    presetSelectEl.addEventListener("change", () => {
      save(LAST_PRESET_KEY, presetSelectEl.value);
      paintPresetBlurb();
    });
  }
  presetModeEls.forEach((el) => {
    el.addEventListener("change", () => save(PRESET_MODE_KEY, getPresetMode()));
  });

  document.querySelector('[data-action="clear-history"]').addEventListener("click", clearHistory);
  historyList.addEventListener("change", onHistoryToggle);

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
  recordScan({ text, banList, hits, totalHits, totalWords });
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
// industry presets — fetched from /data/word-ban-presets.json, stacked onto
// the user's current list when chosen. Custom additions persist alongside.

async function loadPresets() {
  if (!presetSelectEl) return;
  try {
    const res = await fetch("/data/word-ban-presets.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    presets = Array.isArray(data?.presets) ? data.presets : [];
    paintPresetOptions();
  } catch (err) {
    presetSelectEl.disabled = true;
    flash("presets failed to load");
  }
}

function paintPresetOptions() {
  const placeholder = presetSelectEl.querySelector('option[value=""]');
  presetSelectEl.innerHTML = "";
  if (placeholder) presetSelectEl.appendChild(placeholder);
  for (const p of presets) {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.label;
    presetSelectEl.appendChild(opt);
  }
  const { value: lastPresetId } = load(LAST_PRESET_KEY, "");
  if (presets.some((p) => p.id === lastPresetId)) presetSelectEl.value = lastPresetId;
  paintPresetBlurb();
}

function paintPresetBlurb() {
  if (!presetBlurbEl) return;
  const id = presetSelectEl.value;
  const p = presets.find((x) => x.id === id);
  presetBlurbEl.textContent = p?.blurb || "";
}

function applySelectedPreset() {
  const id = presetSelectEl?.value;
  if (!id) {
    flash("pick a preset first");
    return;
  }
  const preset = presets.find((p) => p.id === id);
  if (!preset || !Array.isArray(preset.words) || !preset.words.length) {
    flash("preset is empty");
    return;
  }
  save(LAST_PRESET_KEY, id);
  const mode = getPresetMode();
  const before = parseList(listEl.value);
  const next = mode === "replace"
    ? parseList(preset.words.join("\n"))
    : parseList([listEl.value, preset.words.join("\n")].join("\n"));
  listEl.value = next.join("\n");
  save(STORAGE_KEY, next);
  paintListMeta();
  if (mode === "replace") {
    flash(`replaced list with ${preset.label}`);
  } else {
    const added = next.length - before.length;
    flash(added ? `added ${added} from ${preset.label}` : `${preset.label} already in your list`);
  }
}

function getPresetMode() {
  const picked = [...presetModeEls].find((el) => el.checked);
  return picked?.value === "replace" ? "replace" : "stack";
}

function setPresetMode(mode) {
  presetModeEls.forEach((el) => {
    el.checked = el.value === mode;
  });
}

// ---------------------------------------------------------------------------
// Scan history. Each scan stores { id, ts, input, banlist, flagged, totalWords,
// totalHits, rate, banlistHash }. Capped at last HISTORY_MAX. Two scans can be
// selected to render a Set-difference diff of flagged words.

function loadHistory() {
  const { value } = load(HISTORY_KEY, []);
  return Array.isArray(value) ? value : [];
}

function recordScan({ text, banList, hits, totalHits, totalWords }) {
  const flagged = [...hits.keys()].sort();
  const entry = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    ts: Date.now(),
    input: text.slice(0, 4000), // cap to avoid blowing storage on giant pastes
    banlist: banList,
    banlistHash: hashList(banList),
    flagged,
    totalWords,
    totalHits,
    rate: totalWords ? Math.round((totalHits / totalWords) * 1000) / 10 : 0,
  };
  const next = [entry, ...loadHistory()].slice(0, HISTORY_MAX);
  save(HISTORY_KEY, next);
  paintHistory();
}

function paintHistory() {
  const items = loadHistory();
  if (!items.length) {
    historyBox.hidden = true;
    historyList.innerHTML = "";
    sparkEl.hidden = true;
    diffBox.hidden = true;
    selectedIds.clear();
    return;
  }
  historyBox.hidden = false;
  // prune selection to ids that still exist
  const livingIds = new Set(items.map((i) => i.id));
  for (const id of [...selectedIds]) if (!livingIds.has(id)) selectedIds.delete(id);

  historyList.innerHTML = items.map(renderHistoryItem).join("");
  paintSparkline(items);
  paintDiff(items);
}

function renderHistoryItem(item) {
  const checked = selectedIds.has(item.id) ? " checked" : "";
  const disabled = !checked && selectedIds.size >= 2 ? " disabled" : "";
  const when = formatWhen(item.ts);
  const preview = escapeHTML(firstLine(item.input));
  return `
    <li class="wban__history-item">
      <label class="wban__history-row">
        <input type="checkbox" name="wban-history-pick" value="${item.id}"${checked}${disabled} />
        <span class="wban__history-when">${escapeHTML(when)}</span>
        <span class="wban__history-rate">${item.rate}%</span>
        <span class="wban__history-counts">${item.totalHits}/${item.totalWords}</span>
        <code class="wban__history-hash" title="banlist hash">${escapeHTML(item.banlistHash)}</code>
        <span class="wban__history-preview">${preview}</span>
      </label>
    </li>`;
}

function onHistoryToggle(e) {
  const cb = e.target;
  if (!(cb instanceof HTMLInputElement) || cb.name !== "wban-history-pick") return;
  if (cb.checked) {
    if (selectedIds.size >= 2) {
      cb.checked = false;
      return;
    }
    selectedIds.add(cb.value);
  } else {
    selectedIds.delete(cb.value);
  }
  paintHistory();
}

function paintDiff(items) {
  if (selectedIds.size !== 2) {
    diffBox.hidden = true;
    return;
  }
  // order picks by recency: older = "from", newer = "to"
  const picked = items.filter((i) => selectedIds.has(i.id)).sort((a, b) => a.ts - b.ts);
  const [from, to] = picked;
  const fromSet = new Set(from.flagged);
  const toSet = new Set(to.flagged);
  const added = [...toSet].filter((w) => !fromSet.has(w)).sort();
  const removed = [...fromSet].filter((w) => !toSet.has(w)).sort();
  const same = [...toSet].filter((w) => fromSet.has(w)).sort();

  diffBox.hidden = false;
  diffMeta.textContent = `${formatWhen(from.ts)} → ${formatWhen(to.ts)}`;
  paintDiffList(diffAddedEl, added, "added");
  paintDiffList(diffRemovedEl, removed, "removed");
  paintDiffList(diffSameEl, same, "same");
}

function paintDiffList(el, words, kind) {
  const countEl = document.querySelector(`[data-diff-count="${kind}"]`);
  if (countEl) countEl.textContent = String(words.length);
  el.innerHTML = words.length
    ? words.map((w) => `<li>${escapeHTML(w)}</li>`).join("")
    : `<li class="wban__diff-empty">none</li>`;
}

function paintSparkline(items) {
  if (items.length < 2) {
    sparkEl.hidden = true;
    return;
  }
  // chronological order, oldest left
  const series = [...items].reverse().map((i) => i.rate);
  const maxRate = Math.max(...series, 1);
  const w = 200;
  const h = 40;
  const stepX = series.length > 1 ? w / (series.length - 1) : 0;
  const points = series
    .map((r, idx) => {
      const x = idx * stepX;
      const y = h - (r / maxRate) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const lastX = (series.length - 1) * stepX;
  const lastY = h - (series[series.length - 1] / maxRate) * (h - 4) - 2;
  sparkEl.hidden = false;
  sparkEl.innerHTML = `
    <polyline fill="none" stroke="currentColor" stroke-width="1.5" points="${points}" />
    <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="2.5" fill="currentColor" />
  `;
}

function clearHistory() {
  if (!loadHistory().length) {
    flash("history already empty");
    return;
  }
  if (!window.confirm("Clear all saved scans?")) return;
  remove(HISTORY_KEY);
  selectedIds.clear();
  paintHistory();
  flash("history cleared");
}

function hashList(list) {
  // small, stable, non-cryptographic fingerprint of the banlist so users can
  // see which list a rate corresponds to. djb2 over the sorted joined string.
  const joined = [...list].sort().join("|");
  let h = 5381;
  for (let i = 0; i < joined.length; i++) h = ((h << 5) + h + joined.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0").slice(0, 8);
}

function formatWhen(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return time;
  const date = d.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${date} ${time}`;
}

function firstLine(text) {
  const line = String(text || "").split(/\r?\n/)[0].trim();
  return line.length > 80 ? line.slice(0, 77) + "…" : line;
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
