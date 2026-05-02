// /widgets/pattern-finder.html — POSTs corpus to /api/pattern-finder, renders
// results. When the worker isn't reachable, surfaces a fallback panel with
// the same prompt template ready to paste into Claude or ChatGPT directly.

import { load, save, debounceSave, remove } from "/js/common/storage.js";

const ENDPOINT = "/api/pattern-finder";
const STORAGE_KEY = "pf:corpus";
const MAX_CHARS = 40_000;

const SYSTEM_PROMPT = `You are a Pattern Finder. The user gives you a corpus of their own creative work. You name 4-7 recurring structural patterns in 2-6 words each, citing 2-3 specific quoted excerpts as evidence. Order patterns by confidence (most clearly present first). Do not flatter. Do not pad. Return ONLY valid JSON of shape:

{ "patterns": [ { "name": "...", "evidence": ["...", "...", "..."], "note": "..." } ], "summary": "..." }`;

const inputEl = document.getElementById("pf-input");
const wordsEl = document.querySelector("[data-pf-words]");
const charsEl = document.querySelector("[data-pf-chars]");
const budgetEl = document.querySelector("[data-pf-budget]");
const submitBtn = document.getElementById("pf-submit");
const clearBtn = document.getElementById("pf-clear");
const copyPromptBtn = document.getElementById("pf-copy-prompt");
const resultsEl = document.getElementById("pf-results");
const statusEl = document.getElementById("pf-status");
const fallbackEl = document.getElementById("pf-fallback");
const fallbackPromptEl = document.getElementById("pf-fallback-prompt");
const fallbackCopyBtn = document.getElementById("pf-fallback-copy");

const debouncedSave = debounceSave(STORAGE_KEY, 350);

hydrate();
wireInput();
wireActions();

// ---------------------------------------------------------------------------

function hydrate() {
  const { value } = load(STORAGE_KEY, "");
  if (typeof value === "string" && value) {
    inputEl.value = value;
  }
  paintMeta();
}

function wireInput() {
  inputEl.addEventListener("input", () => {
    debouncedSave(inputEl.value);
    paintMeta();
  });
}

function paintMeta() {
  const text = inputEl.value || "";
  const words = countWords(text);
  const chars = text.length;
  if (wordsEl) wordsEl.textContent = words.toLocaleString("en-US");
  if (charsEl) charsEl.textContent = chars.toLocaleString("en-US");
  if (budgetEl) {
    if (chars > MAX_CHARS) {
      budgetEl.textContent = `over by ${(chars - MAX_CHARS).toLocaleString()}`;
      budgetEl.style.color = "var(--accent)";
    } else if (chars > MAX_CHARS * 0.85) {
      budgetEl.textContent = "close to limit";
      budgetEl.style.color = "var(--fg)";
    } else {
      budgetEl.textContent = "fits";
      budgetEl.style.color = "var(--muted)";
    }
  }
}

function wireActions() {
  submitBtn?.addEventListener("click", findPatterns);
  clearBtn?.addEventListener("click", () => {
    if (!inputEl.value) return;
    if (!window.confirm("Wipe the corpus from this browser?")) return;
    inputEl.value = "";
    remove(STORAGE_KEY);
    resultsEl.innerHTML = "";
    paintMeta();
    flash("corpus cleared");
  });
  copyPromptBtn?.addEventListener("click", () => copyPromptToClipboard(false));
  fallbackCopyBtn?.addEventListener("click", () => copyPromptToClipboard(true));
}

async function findPatterns() {
  const corpus = (inputEl.value || "").trim();
  if (!corpus) {
    flash("paste a corpus first");
    return;
  }
  if (corpus.length > MAX_CHARS) {
    flash(`corpus is ${corpus.length - MAX_CHARS} chars over limit`);
    return;
  }
  resultsEl.innerHTML = "";
  fallbackEl.hidden = true;
  flash("calling pattern finder…");
  submitBtn.disabled = true;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ corpus }),
    });
    if (res.status === 429) {
      throw new Error("rate limited — try again in an hour");
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`worker returned ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    if (!data?.patterns?.length) throw new Error("no patterns returned");
    renderResults(data);
    flash(`found ${data.patterns.length} pattern${data.patterns.length === 1 ? "" : "s"}`);
  } catch (err) {
    console.warn("[pattern-finder]", err);
    showFallback(corpus);
    flash(err.message);
  } finally {
    submitBtn.disabled = false;
  }
}

// ---------------------------------------------------------------------------

function renderResults(data) {
  resultsEl.innerHTML = "";
  const patterns = data.patterns ?? [];
  for (const p of patterns) {
    const article = document.createElement("article");
    article.className = "pf__pattern";
    article.innerHTML = `
      <h3>${escapeHTML(p.name ?? "(unnamed)")}</h3>
      ${
        Array.isArray(p.evidence) && p.evidence.length
          ? `<ul class="pf__pattern__evidence">${p.evidence.map((e) => `<li>&ldquo;${escapeHTML(e)}&rdquo;</li>`).join("")}</ul>`
          : ""
      }
      ${p.note ? `<p class="pf__pattern__note">${escapeHTML(p.note)}</p>` : ""}
    `;
    resultsEl.appendChild(article);
  }
  if (data.summary) {
    const sum = document.createElement("aside");
    sum.className = "pf__summary";
    sum.innerHTML = `<strong>What it adds up to</strong><span>${escapeHTML(data.summary)}</span>`;
    resultsEl.appendChild(sum);
  }
}

function showFallback(corpus) {
  fallbackEl.hidden = false;
  fallbackPromptEl.textContent = renderFallbackPrompt(corpus);
}

function renderFallbackPrompt(corpus) {
  return `${SYSTEM_PROMPT}

---

Here is my corpus. Find the patterns.

---

${corpus.slice(0, MAX_CHARS)}`;
}

async function copyPromptToClipboard(includeCorpus) {
  const corpus = (inputEl.value || "").trim();
  const text = includeCorpus
    ? renderFallbackPrompt(corpus || "(paste your corpus here)")
    : SYSTEM_PROMPT;
  try {
    await navigator.clipboard.writeText(text);
    flash(includeCorpus ? "prompt + corpus copied" : "prompt template copied");
  } catch {
    flash("copy failed");
  }
}

// ---------------------------------------------------------------------------

let flashTimer;
function flash(msg) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    statusEl.textContent = "";
  }, 4000);
}

function countWords(s) {
  const t = (s ?? "").trim();
  return t ? t.split(/\s+/).length : 0;
}

function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
