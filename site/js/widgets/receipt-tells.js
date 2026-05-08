// /widgets/receipt-tells.html — local, non-definitive AI-output tell receipt.

import { load, save } from "/js/common/storage.js";

const DATA_URL = "/data/ai-tells.json";
const STORAGE_KEY = "rctl:input";
const WORD_RE = /[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g;

const els = {};
let tells = {
  sample: "",
  phraseMatches: [],
  hedges: [],
  watchedTerms: ["delve", "leverage", "optimize"],
};

init();

async function init() {
  cacheEls();
  hydrate();
  wire();
  paintMeta();
  await loadTells();
}

function cacheEls() {
  els.form = document.getElementById("rctl-form");
  els.input = document.getElementById("rctl-input");
  els.output = document.getElementById("rctl-output");
  els.status = document.getElementById("rctl-status");
  els.stamp = document.querySelector("[data-stamp]");
  els.time = document.querySelector("[data-time]");
  els.sample = document.querySelector('[data-action="sample"]');
}

function hydrate() {
  const { value } = load(STORAGE_KEY, "");
  if (typeof value === "string" && els.input) els.input.value = value;
}

function wire() {
  els.form?.addEventListener("submit", (event) => {
    event.preventDefault();
    analyze();
  });
  els.form?.addEventListener("reset", () => {
    setTimeout(() => {
      save(STORAGE_KEY, "");
      paintEmpty();
      flash("cleared");
    }, 0);
  });
  els.input?.addEventListener("input", () => {
    save(STORAGE_KEY, els.input.value || "");
  });
  els.sample?.addEventListener("click", () => {
    if (!els.input) return;
    els.input.value = tells.sample || "";
    save(STORAGE_KEY, els.input.value);
    analyze();
    els.input.focus();
  });
}

async function loadTells() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    tells = {
      sample: typeof data?.sample === "string" ? data.sample : "",
      phraseMatches: Array.isArray(data?.phraseMatches) ? data.phraseMatches : [],
      hedges: Array.isArray(data?.hedges) ? data.hedges : [],
      watchedTerms: Array.isArray(data?.watchedTerms) ? data.watchedTerms : tells.watchedTerms,
    };
  } catch (err) {
    console.warn("[receipt-tells] tell data unavailable:", err);
    flash("tell list unavailable - basic scan only");
  }
}

function analyze() {
  const text = (els.input?.value || "").trim();
  if (!text) {
    flash("paste text first");
    return;
  }

  const metrics = buildMetrics(text);
  paintMeta();
  renderReceipt(metrics);
  flash("receipt printed");
}

function buildMetrics(text) {
  const words = text.match(WORD_RE) || [];
  const wordCount = words.length;
  const phraseHits = tells.phraseMatches
    .map((item) => {
      const count = countRegex(text, item.pattern);
      return { ...item, count };
    })
    .filter((item) => item.count > 0);
  const hedgeHits = tells.hedges
    .map((term) => ({ term, count: countTerm(text, term) }))
    .filter((item) => item.count > 0);
  const watchedHits = tells.watchedTerms.map((term) => ({
    term,
    count: countTerm(text, term),
  }));
  const emDashes = (text.match(/—/g) || []).length;
  const hedgeTotal = sum(hedgeHits);
  const watchedTotal = sum(watchedHits);

  return {
    wordCount,
    phraseHits,
    hedgeHits,
    watchedHits,
    emDashes,
    hedgeTotal,
    watchedTotal,
    hedgeScore: rate(hedgeTotal, wordCount, 100),
    emDashDensity: rate(emDashes, wordCount, 100),
    watchedDensity: rate(watchedTotal, wordCount, 100),
  };
}

function renderReceipt(metrics) {
  if (!els.output) return;

  const phraseRows = metrics.phraseHits.length
    ? metrics.phraseHits.map((hit) => row(hit.label, hit.count)).join("")
    : `<li class="rctl-line"><span>No listed phrase matches</span><strong>0</strong></li>`;

  const hedgeRows = metrics.hedgeHits.length
    ? metrics.hedgeHits.slice(0, 8).map((hit) => row(hit.term, hit.count)).join("")
    : `<li class="rctl-line"><span>No listed hedges</span><strong>0</strong></li>`;

  const watchedRows = metrics.watchedHits.map((hit) => row(hit.term, hit.count)).join("");

  els.output.innerHTML = `
    <section class="rctl-ticket-section">
      <p class="rctl-label">SCAN BASIS</p>
      <p class="rctl-total"><span>Words inspected</span><strong>${metrics.wordCount}</strong></p>
      <p class="rctl-note">Local text scan. No model call. No upload.</p>
    </section>

    <section class="rctl-ticket-section">
      <p class="rctl-label">PHRASE MATCHES</p>
      <ul class="rctl-list">${phraseRows}</ul>
      <p class="rctl-note">Stock phrases are weak tells. Context still matters.</p>
    </section>

    <section class="rctl-ticket-section">
      <p class="rctl-label">HEDGING SCORE</p>
      <p class="rctl-score">${metrics.hedgeScore.toFixed(1)} / 100 words</p>
      <ul class="rctl-list">${hedgeRows}</ul>
    </section>

    <section class="rctl-ticket-section">
      <p class="rctl-label">EM-DASH DENSITY</p>
      <p class="rctl-total"><span>Em dashes</span><strong>${metrics.emDashes}</strong></p>
      <p class="rctl-score">${metrics.emDashDensity.toFixed(1)} / 100 words</p>
    </section>

    <section class="rctl-ticket-section">
      <p class="rctl-label">DELVE / LEVERAGE / OPTIMIZE</p>
      <ul class="rctl-list">${watchedRows}</ul>
      <p class="rctl-score">${metrics.watchedDensity.toFixed(1)} / 100 words</p>
    </section>

    <section class="rctl-ticket-section rctl-ticket-section--verdict">
      <p class="rctl-label">ANNOTATION</p>
      <p>${escapeHTML(annotation(metrics))}</p>
      <p class="rctl-note">Non-definitive heuristic. Do not use as proof of AI authorship.</p>
    </section>
  `;
}

function annotation(metrics) {
  const signals = [
    metrics.phraseHits.length,
    metrics.hedgeScore >= 3 ? 1 : 0,
    metrics.emDashDensity >= 1.5 ? 1 : 0,
    metrics.watchedTotal > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  if (signals >= 3) return "Several familiar AI-output tells are visible. Name the pattern, then read the prose.";
  if (signals >= 1) return "A few listed tells appear. Treat them as prompts for editing, not evidence.";
  return "Few listed tells appear. That does not prove the text is human-written.";
}

function paintEmpty() {
  if (!els.output) return;
  els.output.innerHTML = '<p class="rctl-receipt__placeholder">Paste text and print the tells.</p>';
}

function countRegex(text, source) {
  try {
    const re = new RegExp(source, "gi");
    return (text.match(re) || []).length;
  } catch {
    return 0;
  }
}

function countTerm(text, term) {
  const escaped = escapeRegExp(term).replace(/\\ /g, "\\s+");
  return countRegex(text, `\\b${escaped}\\b`);
}

function row(label, count) {
  return `<li class="rctl-line"><span>${escapeHTML(label)}</span><strong>${count}</strong></li>`;
}

function rate(count, wordCount, per) {
  if (!wordCount) return 0;
  return (count / wordCount) * per;
}

function sum(rows) {
  return rows.reduce((total, row) => total + row.count, 0);
}

function paintMeta() {
  const now = new Date();
  if (els.stamp) els.stamp.textContent = now.toISOString().slice(0, 10);
  if (els.time) els.time.textContent = now.toTimeString().slice(0, 5);
}

function flash(message) {
  if (!els.status) return;
  els.status.textContent = message;
  clearTimeout(flash._t);
  if (!message) return;
  flash._t = setTimeout(() => {
    if (els.status) els.status.textContent = "";
  }, 3000);
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
