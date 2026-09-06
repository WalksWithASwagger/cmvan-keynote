// /widgets/cut-up — Burroughs / Dada cut-up generator. All client-side.
// Paste any text → choose a cut size (word / phrase / line) → shuffle the
// fragments → render into a zine-style output canvas. Export as PNG via
// html-to-image (CDN <script>, same dep as Both Hands).
//
// Layouts: "flow" (default) joins fragments inline; "scatter" is the Burroughs
// floor arrangement — strips absolutely-positioned with a deterministic random
// rotation/offset seeded by `currentSeed` so a share-link rehydrates the same
// layout. Falls back to flow under 480px.

import { load, save } from "/js/common/storage.js";
import { splitText, makeRng, seededShuffle, moveFragment, compositionText, parseDraft } from "./cut-up-state.js";

const TDOC_DOCS = [
  { id: "policy", title: "Personal AI policy" },
  { id: "style", title: "Style and voice guide" },
  { id: "worldview", title: "Worldview" },
];

const inputEl = document.getElementById("cutup-input");
const outputEl = document.getElementById("cutup-output");
const bodyEl = document.getElementById("cutup-body");
const statusEl = document.getElementById("cutup-status");
const metaMode = document.querySelector("[data-meta-mode]");
const metaCount = document.querySelector("[data-meta-count]");
const metaStamp = document.querySelector("[data-meta-stamp]");

let cutMode = "phrase";
let punctMode = "keep";
let marksMode = "off";
let layoutMode = "flow";
let lastFragments = null;
let currentSeed = null;
let generatedCutMode = "phrase";
let generatedPunctMode = "keep";
const creditEl = document.getElementById("cutup-credit");
const noteEl = document.getElementById("cutup-note");
const editorEl = document.getElementById("cutup-fragments");
const textEl = document.getElementById("cutup-text");
const savedEl = document.getElementById("cutup-saved");
// True when restoreFromHash() pulled a seed from the URL and no shuffle has
// consumed it yet. The first cut() reuses that seed (share-link rehydrates
// identically); subsequent cuts generate a fresh seed.
let pendingRestoredSeed = false;

const SCATTER_MIN_WIDTH = 480;
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

restoreFromHash();
restoreDraft();
bindToggles();
bindActions();
bindSeeds();
refreshTdocSeed();
bindResize();
bindReducedMotion();
stamp();
for (const el of [inputEl, creditEl, noteEl]) {
  el.addEventListener("input", () => { persistDraft(); renderCredits(); });
}
editorEl.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-edit]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const action = btn.dataset.edit;
  if (action === "toggle") {
    const fragment = lastFragments.find((f) => f.id === id);
    fragment.kept = !fragment.kept;
  } else {
    lastFragments = moveFragment(lastFragments, id, action === "up" ? -1 : 1);
  }
  renderFragments(lastFragments);
  persistDraft();
  const next = editorEl.querySelector(`[data-id="${id}"][data-edit="${action}"]`);
  (next.disabled ? editorEl.querySelector(`[data-id="${id}"][data-edit="toggle"]`) : next).focus();
  flash("composition updated");
});
document.fonts.ready.then(() => { if (lastFragments) renderFragments(lastFragments); });

// ---------------------------------------------------------------------------

function bindToggles() {
  document.querySelectorAll("[data-cut]").forEach((btn) => {
    btn.addEventListener("click", () => setMode("data-cut", btn.dataset.cut, (v) => (cutMode = v)));
  });
  document.querySelectorAll("[data-punct]").forEach((btn) => {
    btn.addEventListener("click", () => setMode("data-punct", btn.dataset.punct, (v) => (punctMode = v)));
  });
  document.querySelectorAll("[data-marks]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setMode("data-marks", btn.dataset.marks, (v) => (marksMode = v));
      if (lastFragments) renderFragments(lastFragments);
      writeHash();
    });
  });
  document.querySelectorAll("[data-layout]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setMode("data-layout", btn.dataset.layout, (v) => (layoutMode = v));
      if (lastFragments) renderFragments(lastFragments);
      writeHash();
    });
  });
  document.querySelectorAll("[data-cut], [data-punct], [data-marks], [data-layout]").forEach((btn) => {
    btn.addEventListener("click", persistDraft);
  });
}

function setMode(attr, value, apply) {
  apply(value);
  document.querySelectorAll(`[${attr}]`).forEach((b) => {
    b.setAttribute("aria-pressed", String(b.getAttribute(attr) === value));
  });
}

function bindActions() {
  document.querySelector('[data-action="cut"]').addEventListener("click", cut);
  document.querySelector('[data-action="recut"]').addEventListener("click", () => {
    if (!lastFragments) return cut();
    if (!confirm("Re-shuffle this composition? Your selection stays; your current order will be replaced.")) return;
    currentSeed = makeSeed();
    const shuffled = seededShuffle([...lastFragments], currentSeed);
    lastFragments = shuffled;
    renderFragments(shuffled);
    writeHash();
    persistDraft();
    flash("re-shuffled — selection preserved");
  });
  document.querySelector('[data-action="png"]').addEventListener("click", exportPng);
  document.querySelector('[data-action="copy"]').addEventListener("click", copyText);
}

function bindSeeds() {
  document.querySelectorAll("[data-seed]").forEach((btn) => {
    btn.addEventListener("click", () => seedFrom(btn.dataset.seed));
  });
}

function bindResize() {
  let t;
  window.addEventListener("resize", () => {
    if (layoutMode !== "scatter" || !lastFragments) return;
    clearTimeout(t);
    t = setTimeout(() => renderFragments(lastFragments), 120);
  });
}

function bindReducedMotion() {
  reducedMotionQuery.addEventListener("change", () => {
    if (layoutMode === "scatter" && lastFragments) renderFragments(lastFragments);
  });
}

// ---------------------------------------------------------------------------

function cut() {
  const text = (inputEl.value || "").trim();
  if (!text) {
    flash("paste something first");
    return;
  }
  const sourceFragments = splitText(text, cutMode, punctMode);
  if (!sourceFragments.length) {
    flash("nothing to cut");
    return;
  }
  if (lastFragments && !confirm("Replace this composition with a new cut? Removed fragments and your current order will be replaced.")) return;
  const fragments = seededShuffle(sourceFragments.map((text, id) => ({ id, text, kept: true })), nextCutSeed());
  generatedCutMode = cutMode;
  generatedPunctMode = punctMode;
  lastFragments = fragments;
  renderFragments(fragments);
  writeHash();
  persistDraft();
  flash(`cut into ${fragments.length} fragment${fragments.length === 1 ? "" : "s"}`);
}

function nextCutSeed() {
  if (pendingRestoredSeed && currentSeed != null) {
    pendingRestoredSeed = false;
    return currentSeed;
  }
  currentSeed = makeSeed();
  return currentSeed;
}

function makeSeed() {
  return (Math.random() * 2 ** 32) >>> 0;
}

// ---------------------------------------------------------------------------

function renderFragments(items) {
  const fragments = items.filter((f) => f.kept).map((f) => f.text);
  metaMode.textContent = `cut by ${generatedCutMode}`;
  metaCount.textContent = `${fragments.length} fragment${fragments.length === 1 ? "" : "s"}`;

  const useScatter =
    layoutMode === "scatter" && window.innerWidth >= SCATTER_MIN_WIDTH;

  if (useScatter) {
    renderScatter(fragments);
  } else if (marksMode === "on") {
    bodyEl.classList.remove("cutup__output-body--scatter");
    bodyEl.style.height = "";
    bodyEl.innerHTML = fragments
      .map((f) => `<span class="cut">${escapeHTML(f)}</span>`)
      .join(generatedCutMode === "line" ? "\n" : " ");
  } else {
    bodyEl.classList.remove("cutup__output-body--scatter");
    bodyEl.style.height = "";
    const sep = generatedCutMode === "line" ? "\n" : " ";
    bodyEl.textContent = fragments.join(sep);
  }
  renderEditor();
  renderCredits();
  stamp();
}

// Burroughs floor arrangement: strips scattered across a bounded canvas with
// per-fragment rotation (-8°..+8°) and offset. Layout is deterministic from
// `currentSeed` so a share-link rehydrates the same arrangement.
function renderScatter(fragments) {
  bodyEl.classList.add("cutup__output-body--scatter");
  bodyEl.innerHTML = "";

  const rng = makeRng((currentSeed ?? 0) ^ 0x5cabbed);
  const width = bodyEl.clientWidth || outputEl.clientWidth || 600;
  const colCount = Math.max(1, Math.min(4, Math.floor(width / 180)));
  const colWidth = width / colCount;
  let rowTop = 0;
  let rowHeight = 0;
  fragments.forEach((text, i) => {
    const col = i % colCount;
    if (i && col === 0) { rowTop += rowHeight; rowHeight = 0; }
    const x = col * colWidth + 16 + (rng() * 2 - 1) * 4;
    const jitterY = rng() * 8;
    const rotation = rng() * 2 - 1;

    const strip = document.createElement("span");
    strip.className = "cutup__strip" + (marksMode === "on" ? " cut" : "");
    strip.textContent = text;
    strip.style.width = `${colWidth - 32}px`;
    bodyEl.appendChild(strip);

    const h = strip.offsetHeight;
    const w = strip.offsetWidth;
    // Tall strips need less rotation to stay inside their column.
    const rot = reducedMotionQuery.matches ? 0 : rotation * Math.min(8, Math.atan(12 / h) * 180 / Math.PI);
    const radians = Math.abs(rot) * Math.PI / 180;
    const height = h * Math.cos(radians) + w * Math.sin(radians);
    strip.style.left = `${x}px`;
    strip.style.top = `${rowTop + (height - h) / 2 + 8 + jitterY}px`;
    strip.style.transform = `rotate(${rot}deg)`;
    rowHeight = Math.max(rowHeight, height + 32);
  });

  bodyEl.style.height = `${rowTop + rowHeight}px`;
}

function stamp() {
  if (metaStamp) metaStamp.textContent = new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// share-link rehydration: hash carries cut/punct/marks/layout/seed so the
// same URL produces the same arrangement after the user re-seeds the text.

function writeHash() {
  const params = new URLSearchParams({
    cut: lastFragments ? generatedCutMode : cutMode,
    punct: lastFragments ? generatedPunctMode : punctMode,
    marks: marksMode,
    layout: layoutMode,
  });
  if (currentSeed != null) params.set("seed", String(currentSeed));
  const next = `#${params.toString()}`;
  if (window.location.hash !== next) {
    history.replaceState(null, "", next);
  }
}

function restoreFromHash() {
  const hash = (window.location.hash || "").replace(/^#/, "");
  if (!hash) return;
  const params = new URLSearchParams(hash);
  const cut = params.get("cut");
  const punct = params.get("punct");
  const marks = params.get("marks");
  const layout = params.get("layout");
  const seed = params.get("seed");
  if (cut === "word" || cut === "phrase" || cut === "line") {
    cutMode = cut;
    setMode("data-cut", cut, () => {});
  }
  if (punct === "keep" || punct === "strip") {
    punctMode = punct;
    setMode("data-punct", punct, () => {});
  }
  if (marks === "on" || marks === "off") {
    marksMode = marks;
    setMode("data-marks", marks, () => {});
  }
  if (layout === "flow" || layout === "scatter") {
    layoutMode = layout;
    setMode("data-layout", layout, () => {});
  }
  if (seed !== null && /^\d+$/.test(seed)) {
    currentSeed = Number(seed) >>> 0;
    pendingRestoredSeed = true;
  }
}

// ---------------------------------------------------------------------------

async function seedFrom(kind) {
  try {
    let text;
    let credit;
    if (kind === "tdoc") {
      const sections = readTdocSections();
      if (!sections.length) return flash("no Three Documents drafts found in this browser");
      text = sections.map((s) => `${s.title}\n${s.body}`).join("\n\n");
      credit = "My Three Documents";
    } else {
      const r = await fetch(kind === "quotes" ? "/data/quotes.json" : "/data/lineage.json");
      if (!r.ok) throw new Error("seed unavailable");
      const j = await r.json();
      text = kind === "quotes" ? (j.quotes || []).map((q) => q.text).join("\n") :
        [j.thesis, j.subThesis, ...(j.beats || []).map((b) => `${b.title}\n${b.body}`)].filter(Boolean).join("\n\n");
      credit = kind === "quotes" ? "Kris Krüg · Punk Rock AI talk quotes" : "Punk Rock AI · Lineage prose";
    }
    if (!text) throw new Error("empty seed");
    if ((inputEl.value || lastFragments) && !confirm("Replace the source text and credit? Your current fragments stay until you choose Cut + shuffle.")) return;
    inputEl.value = text;
    creditEl.value = credit;
    persistDraft();
    renderCredits();
    flash("source loaded — choose Cut + shuffle to make a new composition");
  } catch {
    flash("seed unavailable — your work is unchanged; paste source text to continue");
  }
}

// ---------------------------------------------------------------------------

async function exportPng() {
  if (!lastFragments?.some((f) => f.kept)) return flash("keep at least one fragment to export");
  if (!window.htmlToImage) {
    flash("poster export unavailable — use the selectable text below");
    return;
  }
  try {
    flash("rendering…");
    await document.fonts.ready;
    renderFragments(lastFragments);
    const dataUrl = await window.htmlToImage.toPng(outputEl, {
      pixelRatio: 2,
      backgroundColor: "#f4ede0",
      cacheBust: true,
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `cut-up-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    flash("PNG downloaded");
  } catch {
    flash("poster export failed — use the selectable text below");
  }
}

async function copyText() {
  const text = textEl.value;
  if (!lastFragments?.some((f) => f.kept)) {
    flash("nothing to copy yet");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    flash("copied to clipboard");
  } catch {
    textEl.focus();
    textEl.select();
    flash("copy unavailable — text selected below; use your browser’s Copy command");
  }
}

// ---------------------------------------------------------------------------

function draft() {
  return { version: 1, source: inputEl.value, credit: creditEl.value, note: noteEl.value,
    cutMode, punctMode, marksMode, layoutMode, generatedCutMode, generatedPunctMode, currentSeed,
    fragments: lastFragments };
}

function persistDraft() {
  savedEl.textContent = save("cutup:draft", draft())
    ? "Draft saved in this browser."
    : "Draft could not be saved. Keep this page open and copy your text before leaving.";
}

function restoreDraft() {
  try {
    // Parse locally: a malformed JSON error from the shared loader can echo draft text to the console.
    const raw = localStorage.getItem("pra:v1:cutup:draft");
    if (raw === null) return;
    const d = parseDraft(raw);
    if (!d) { savedEl.textContent = "Saved draft could not be read. New edits will replace it."; return; }
    inputEl.value = d.source;
    creditEl.value = d.credit;
    noteEl.value = d.note;
    ({ cutMode, punctMode, marksMode, layoutMode, generatedCutMode, generatedPunctMode, currentSeed } = d);
    lastFragments = d.fragments;
    pendingRestoredSeed = lastFragments === null && currentSeed !== null;
    for (const [attr, value] of [["cut", cutMode], ["punct", punctMode], ["marks", marksMode], ["layout", layoutMode]]) {
      setMode(`data-${attr}`, value, () => {});
    }
    if (lastFragments) renderFragments(lastFragments);
    else renderCredits();
    writeHash();
    savedEl.textContent = "Draft restored from this browser. Links contain settings and a seed, never your text.";
  } catch {
    savedEl.textContent = "Draft storage unavailable. Keep this page open and copy your text before leaving.";
  }
}

function renderCredits() {
  for (const [name, el] of [["credit", creditEl], ["note", noteEl]]) {
    const target = document.querySelector(`[data-meta-${name}]`);
    target.textContent = el.value.trim() ? `${name === "credit" ? "Source" : "Note"}: ${el.value.trim()}` : "";
    target.hidden = !target.textContent;
  }
  textEl.value = lastFragments ? compositionText({ ...draft(), fragments: lastFragments }) : "";
}

function renderEditor() {
  const retained = lastFragments.filter((f) => f.kept);
  editorEl.innerHTML = lastFragments.map((f, i) => `<li class="${f.kept ? "" : "cutup__removed"}">
    <span>${escapeHTML(f.text)}</span><div class="cutup__row">
    <button type="button" data-id="${f.id}" data-edit="toggle" aria-label="${f.kept ? "Remove" : "Restore"} fragment ${i + 1}">${f.kept ? "Remove" : "Restore"}</button>
    <button type="button" data-id="${f.id}" data-edit="up" aria-label="Move fragment ${i + 1} up" ${!f.kept || retained[0] === f ? "disabled" : ""}>Up</button>
    <button type="button" data-id="${f.id}" data-edit="down" aria-label="Move fragment ${i + 1} down" ${!f.kept || retained.at(-1) === f ? "disabled" : ""}>Down</button>
    </div></li>`).join("");
}

function readTdocSections() {
  return TDOC_DOCS
    .map((d) => {
      const { value } = load(`tdoc:${d.id}`, "");
      const body = typeof value === "string" ? value.trim() : "";
      return body ? { title: d.title, body } : null;
    })
    .filter(Boolean);
}

function refreshTdocSeed() {
  const btn = document.querySelector('[data-seed="tdoc"]');
  if (!btn) return;
  const has = readTdocSections().length > 0;
  btn.disabled = !has;
  btn.title = has
    ? "Seed the cut-up with your saved Three Documents drafts."
    : "Draft your Three Documents first to unlock this seed.";
}

// ---------------------------------------------------------------------------

function flash(msg) {
  if (!statusEl) return;
  statusEl.textContent = msg;
}

function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
