// /widgets/receipt.html — Open Source Receipt
// Toy estimator. The user answers a short questionnaire about their
// open-web footprint; we multiply through illustrative numbers and
// render a paper-receipt-style estimate. Heuristic, not truth — see
// the talk's "1,800 of mine" beat for the real-world anchor.

import { load, save, remove } from "/js/common/storage.js";

const STORAGE_KEY = "osr:state";

// ---------------------------------------------------------------------------
// Questionnaire — illustrative multipliers. Kept deliberately transparent:
// every multiplier shows up in the receipt math so the user can see what we
// did and disagree with it. The numbers are made up to feel honest, not to
// be accurate.
// ---------------------------------------------------------------------------

const QUESTIONS = [
  {
    id: "cc_publishing",
    type: "yesno",
    label:
      "Did you publish CC-licensed work on the open web before 2020?",
    hint: "Photos, writing, code, design files, anything.",
    receiptName: "CC-licensed publisher",
    fixedArtifacts: 200,
    multiplier: 1.0,
    mathLabel: "fixed bundle x 1.0",
  },
  {
    id: "flickr_photos",
    type: "number",
    label: "Public Flickr photos (approximate)",
    hint: "Skip if zero. The 1,800 figure came from 145,000 here.",
    placeholder: "e.g. 5000",
    receiptName: "Flickr public photos",
    multiplier: 0.7,
    mathLabel: "x 0.7 likely indexed",
  },
  {
    id: "github_repos",
    type: "number",
    label: "GitHub repos with code committed before 2022",
    hint: "Public repos only. Forks count if you actually committed.",
    placeholder: "e.g. 12",
    receiptName: "GitHub repos",
    multiplier: 18,
    mathLabel: "x 18 files per repo",
  },
  {
    id: "deviantart",
    type: "yesno",
    label: "Account on DeviantArt or similar art platform older than 5 years",
    hint: "ArtStation, Behance, Newgrounds, FurAffinity, etc.",
    receiptName: "Art platform footprint",
    fixedArtifacts: 80,
    multiplier: 1.0,
    mathLabel: "fixed bundle x 1.0",
  },
  {
    id: "old_blog",
    type: "yesno",
    label: "Personal blog older than 5 years (still indexable)",
    hint: "WordPress, Tumblr, Blogger, Jekyll, anything self-hosted.",
    receiptName: "Personal blog",
    fixedArtifacts: 120,
    multiplier: 1.0,
    mathLabel: "fixed bundle x 1.0",
  },
  {
    id: "longform_posts",
    type: "number",
    label: "Long-form public posts (Medium, Substack, personal site)",
    hint: "Anything 500+ words you put on the open web.",
    placeholder: "e.g. 40",
    receiptName: "Long-form posts",
    multiplier: 1.0,
    mathLabel: "x 1.0 one artifact each",
  },
  {
    id: "forum_participation",
    type: "yesno",
    label: "Public mailing list / forum / Stack Overflow participation",
    hint: "Hundreds of public posts under a stable handle counts.",
    receiptName: "Forum / list participation",
    fixedArtifacts: 250,
    multiplier: 1.0,
    mathLabel: "fixed bundle x 1.0",
  },
  {
    id: "wiki_edits",
    type: "yesno",
    label: "Edited Wikipedia or another public wiki under your name",
    hint: "Even a small handful of edits — they get scraped.",
    receiptName: "Public wiki edits",
    fixedArtifacts: 30,
    multiplier: 1.0,
    mathLabel: "fixed bundle x 1.0",
  },
];

// Global multipliers shown on the receipt after the subtotal. These exist
// to make the widget feel less confidently large. Both are made up.
const INDEXING_FACTOR = 0.62; // not everything public is actually indexed
const CORPUS_OVERLAP = 0.18; // not every indexed thing made it into a corpus

// ---------------------------------------------------------------------------
// State + bootstrap
// ---------------------------------------------------------------------------

let state = freshState();
let statusEl, actionsStatusEl;

hydrate();
renderQuestions();
wireForm();
wireActions();

// ---------------------------------------------------------------------------

function freshState() {
  const out = {};
  for (const q of QUESTIONS) {
    out[q.id] = q.type === "yesno" ? null : "";
  }
  return out;
}

function hydrate() {
  const { value } = load(STORAGE_KEY, null);
  if (value && typeof value === "object") {
    state = { ...freshState(), ...sanitize(value) };
  }
}

function sanitize(value) {
  const out = {};
  for (const q of QUESTIONS) {
    const v = value[q.id];
    if (q.type === "yesno") {
      out[q.id] = v === true || v === false ? v : null;
    } else {
      out[q.id] = typeof v === "string" ? v : "";
    }
  }
  return out;
}

function persist() {
  save(STORAGE_KEY, state);
}

// ---------------------------------------------------------------------------
// Questionnaire render
// ---------------------------------------------------------------------------

function renderQuestions() {
  const list = document.querySelector("[data-questions]");
  if (!list) return;
  list.innerHTML = "";
  QUESTIONS.forEach((q, idx) => {
    list.appendChild(renderQuestion(q, idx));
  });
}

function renderQuestion(q, idx) {
  const li = document.createElement("li");
  li.className = "osr-q";
  const num = String(idx + 1).padStart(2, "0");
  const labelHtml = `
    <span class="osr-q__num">${escapeHTML(num)}.</span>
    <label class="osr-q__label" for="osr-q-${escapeAttr(q.id)}">
      ${escapeHTML(q.label)}
      <span class="osr-q__hint">${escapeHTML(q.hint || "")}</span>
    </label>
  `;
  if (q.type === "yesno") {
    li.innerHTML = `
      ${labelHtml}
      <span class="osr-q__control">
        <span class="osr-q__yesno" role="group" aria-labelledby="osr-q-${escapeAttr(q.id)}-label">
          <button type="button" data-q="${escapeAttr(q.id)}" data-val="yes" aria-pressed="false">Yes</button>
          <button type="button" data-q="${escapeAttr(q.id)}" data-val="no" aria-pressed="false">No</button>
        </span>
      </span>
    `;
    const buttons = li.querySelectorAll(".osr-q__yesno button");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.dataset.val === "yes";
        // toggle off if pressing the active button again
        state[q.id] = state[q.id] === next ? null : next;
        paintYesNo(li, q.id);
        persist();
      });
    });
    paintYesNo(li, q.id);
  } else {
    li.innerHTML = `
      ${labelHtml}
      <span class="osr-q__control">
        <input
          type="number"
          inputmode="numeric"
          min="0"
          step="1"
          class="osr-q__number"
          id="osr-q-${escapeAttr(q.id)}"
          data-q="${escapeAttr(q.id)}"
          placeholder="${escapeAttr(q.placeholder || "0")}"
        />
      </span>
    `;
    const input = li.querySelector("input");
    input.value = state[q.id] || "";
    input.addEventListener("input", () => {
      const cleaned = input.value.replace(/[^0-9]/g, "");
      if (cleaned !== input.value) input.value = cleaned;
      state[q.id] = cleaned;
      persist();
    });
  }
  return li;
}

function paintYesNo(li, qId) {
  const value = state[qId];
  li.querySelectorAll(".osr-q__yesno button").forEach((btn) => {
    const isYes = btn.dataset.val === "yes";
    const pressed = value === true ? isYes : value === false ? !isYes : false;
    btn.setAttribute("aria-pressed", pressed ? "true" : "false");
  });
}

// ---------------------------------------------------------------------------
// Wire actions
// ---------------------------------------------------------------------------

function wireForm() {
  statusEl = document.getElementById("osr-status");
  actionsStatusEl = document.getElementById("osr-actions-status");
  document
    .querySelector('[data-action="compute"]')
    ?.addEventListener("click", compute);
  document
    .querySelector('[data-action="reset"]')
    ?.addEventListener("click", reset);
}

function wireActions() {
  document
    .querySelector('[data-action="png"]')
    ?.addEventListener("click", exportPng);
  document
    .querySelector('[data-action="recompute"]')
    ?.addEventListener("click", () => {
      hideReceipt();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

// ---------------------------------------------------------------------------
// Compute — deterministic math from current state.
// ---------------------------------------------------------------------------

function compute() {
  const lines = buildLines();
  if (!lines.length) {
    flash(statusEl, "answer at least one question to print");
    return;
  }
  renderReceipt(lines);
  showReceipt();
  flash(statusEl, "receipt printed below");
  // bring the receipt into view
  document
    .getElementById("osr-receipt-wrap")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buildLines() {
  const lines = [];
  for (const q of QUESTIONS) {
    const v = state[q.id];
    if (q.type === "yesno") {
      if (v === true) {
        const artifacts = Math.round(q.fixedArtifacts * q.multiplier);
        lines.push({
          name: q.receiptName,
          math: `yes - ${q.fixedArtifacts} ${q.mathLabel}`,
          value: artifacts,
        });
      }
    } else {
      const n = Number.parseInt(v, 10);
      if (Number.isFinite(n) && n > 0) {
        const artifacts = Math.round(n * q.multiplier);
        lines.push({
          name: q.receiptName,
          math: `${n} ${q.mathLabel}`,
          value: artifacts,
        });
      }
    }
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Receipt render
// ---------------------------------------------------------------------------

function renderReceipt(lines) {
  const linesEl = document.querySelector("[data-lines]");
  if (linesEl) {
    linesEl.innerHTML = lines
      .map(
        (line) => `
          <li class="osr-receipt__line osr-receipt__line--item">
            <span class="osr-receipt__item-name">
              ${escapeHTML(line.name)}
              <span class="osr-receipt__item-math">${escapeHTML(line.math)}</span>
            </span>
            <span class="osr-receipt__item-value">${formatNum(line.value)}</span>
          </li>
        `,
      )
      .join("");
  }

  const subtotal = lines.reduce((sum, l) => sum + l.value, 0);
  const indexed = Math.round(subtotal * INDEXING_FACTOR);
  const overlap = Math.round(indexed * CORPUS_OVERLAP);

  setText("[data-subtotal]", formatNum(subtotal));
  setText("[data-indexed]", formatNum(indexed));
  setText("[data-overlap]", formatNum(overlap));
  setText("[data-total]", formatNum(overlap));

  const now = new Date();
  setText("[data-stamp]", isoDate(now));
  setText("[data-time]", isoTime(now));
  setText("[data-receipt-id]", receiptId(state));
}

function showReceipt() {
  const wrap = document.getElementById("osr-receipt-wrap");
  const actions = document.getElementById("osr-actions");
  if (wrap) wrap.hidden = false;
  if (actions) actions.hidden = false;
}

function hideReceipt() {
  const wrap = document.getElementById("osr-receipt-wrap");
  const actions = document.getElementById("osr-actions");
  if (wrap) wrap.hidden = true;
  if (actions) actions.hidden = true;
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

function reset() {
  const ok = window.confirm("Clear all answers and the receipt?");
  if (!ok) return;
  state = freshState();
  remove(STORAGE_KEY);
  renderQuestions();
  hideReceipt();
  flash(statusEl, "answers cleared");
}

// ---------------------------------------------------------------------------
// PNG export — mirrors both-hands.js
// ---------------------------------------------------------------------------

async function exportPng() {
  const node = document.getElementById("osr-receipt");
  if (!node) return;
  if (!window.htmlToImage) {
    flash(actionsStatusEl, "html-to-image still loading - try again in a sec.");
    return;
  }
  try {
    flash(actionsStatusEl, "rendering...");
    const dataUrl = await window.htmlToImage.toPng(node, {
      pixelRatio: 2,
      backgroundColor: "#f4ede0",
      cacheBust: true,
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `open-source-receipt-${isoDate(new Date())}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    flash(actionsStatusEl, "PNG downloaded");
  } catch (err) {
    console.error(err);
    flash(actionsStatusEl, "PNG export failed - see console");
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function setText(selector, text) {
  const el = document.querySelector(selector);
  if (el) el.textContent = text;
}

function formatNum(n) {
  return Number(n).toLocaleString("en-US");
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function isoTime(d) {
  return d.toTimeString().slice(0, 5);
}

// Deterministic-ish receipt ID derived from state so the same answers print
// the same number. djb2 hash, six digits.
function receiptId(s) {
  const str = JSON.stringify(s);
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  const id = Math.abs(h) % 1000000;
  return String(id).padStart(6, "0");
}

function flash(target, msg) {
  if (!target) return;
  target.textContent = msg;
  clearTimeout(target._t);
  target._t = setTimeout(() => {
    if (target) target.textContent = "";
  }, 3000);
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(str) {
  return escapeHTML(str);
}
