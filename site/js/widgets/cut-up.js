// /widgets/cut-up — Burroughs / Dada cut-up generator. All client-side.
// Paste any text → choose a cut size (word / phrase / line) → shuffle the
// fragments → render into a zine-style output canvas. Export as PNG via
// html-to-image (CDN <script>, same dep as Both Hands).
//
// Layouts: "flow" (default) joins fragments inline; "scatter" is the Burroughs
// floor arrangement — strips absolutely-positioned with a deterministic random
// rotation/offset seeded by `currentSeed` so a share-link rehydrates the same
// layout. Falls back to flow under 480px.

import { load } from "/js/common/storage.js";

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
// True when restoreFromHash() pulled a seed from the URL and no shuffle has
// consumed it yet. The first cut() reuses that seed (share-link rehydrates
// identically); subsequent cuts generate a fresh seed.
let pendingRestoredSeed = false;

const SCATTER_MIN_WIDTH = 480;
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

restoreFromHash();
bindToggles();
bindActions();
bindSeeds();
refreshTdocSeed();
bindResize();
bindReducedMotion();
stamp();

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
    });
  });
  document.querySelectorAll("[data-layout]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setMode("data-layout", btn.dataset.layout, (v) => (layoutMode = v));
      if (lastFragments) renderFragments(lastFragments);
      writeHash();
    });
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
    currentSeed = makeSeed();
    const shuffled = seededShuffle([...lastFragments], currentSeed);
    lastFragments = shuffled;
    renderFragments(shuffled);
    writeHash();
    flash("re-shuffled");
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
  const fragments = seededShuffle(sourceFragments, nextCutSeed());
  lastFragments = fragments;
  renderFragments(fragments);
  writeHash();
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

function splitText(text, mode, punct) {
  const cleaned = punct === "strip" ? text.replace(/[.,;:!?"'`*_()\[\]{}]/g, " ") : text;
  if (mode === "word") {
    return cleaned.split(/\s+/).filter(Boolean);
  }
  if (mode === "line") {
    return cleaned
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  // phrase: split on sentence-ish boundaries + comma/semicolon
  return cleaned
    .split(/(?<=[.!?…])\s+|[,;]\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// mulberry32 — small deterministic PRNG so the same seed yields the same
// shuffle + scatter layout (acceptance: share-link rehydrates identically).
function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSeed() {
  return (Math.random() * 2 ** 32) >>> 0;
}

function seededShuffle(arr, seed) {
  const rng = makeRng(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------

function renderFragments(fragments) {
  metaMode.textContent = `cut by ${cutMode}`;
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
      .join(" ");
  } else {
    bodyEl.classList.remove("cutup__output-body--scatter");
    bodyEl.style.height = "";
    const sep = cutMode === "line" ? "\n" : " ";
    bodyEl.textContent = fragments.join(sep);
  }
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
  const colCount = Math.max(2, Math.min(4, Math.round(width / 220)));
  const colWidth = width / colCount;
  const rowHeight = 56;
  const jitterX = colWidth * 0.18;
  const jitterY = rowHeight * 0.45;

  let maxBottom = 0;
  fragments.forEach((text, i) => {
    const col = i % colCount;
    const row = Math.floor(i / colCount);
    const x = col * colWidth + (rng() * 2 - 1) * jitterX;
    const y = row * rowHeight + (rng() * 2 - 1) * jitterY;
    const rot = (rng() * 2 - 1) * (reducedMotionQuery.matches ? 0 : 8);
    const w = colWidth - 12;

    const strip = document.createElement("span");
    strip.className = "cutup__strip" + (marksMode === "on" ? " cut" : "");
    strip.textContent = text;
    strip.style.left = `${Math.max(0, x)}px`;
    strip.style.top = `${Math.max(0, y)}px`;
    strip.style.width = `${w}px`;
    strip.style.transform = `rotate(${rot.toFixed(2)}deg)`;
    bodyEl.appendChild(strip);

    const bottom = Math.max(0, y) + rowHeight;
    if (bottom > maxBottom) maxBottom = bottom;
  });

  bodyEl.style.height = `${maxBottom + 16}px`;
}

function stamp() {
  if (metaStamp) metaStamp.textContent = new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// share-link rehydration: hash carries cut/punct/marks/layout/seed so the
// same URL produces the same arrangement after the user re-seeds the text.

function writeHash() {
  const params = new URLSearchParams({
    cut: cutMode,
    punct: punctMode,
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
    if (kind === "tdoc") {
      const sections = readTdocSections();
      if (!sections.length) {
        flash("no Three Documents drafts found in this browser");
        return;
      }
      inputEl.value = sections.map((s) => `${s.title}\n${s.body}`).join("\n\n");
      flash(`seeded with your ${sections.length} Three Document${sections.length === 1 ? "" : "s"}`);
      return;
    }
    if (kind === "quotes") {
      const r = await fetch("/data/quotes.json");
      const j = await r.json();
      inputEl.value = (j.quotes || []).map((q) => q.text).join("\n");
    } else if (kind === "lineage") {
      const r = await fetch("/data/lineage.json");
      const j = await r.json();
      inputEl.value = [
        j.thesis,
        j.subThesis,
        ...(j.beats || []).map((b) => `${b.title}\n${b.body}`),
      ]
        .filter(Boolean)
        .join("\n\n");
    } else if (kind === "manifesto") {
      const r = await fetch("/source-material/punk-rock-ai/punk-rock-ai-manifesto.md");
      // not committed in repo? graceful fallback below
      if (!r.ok) throw new Error(`manifesto: ${r.status}`);
      inputEl.value = await r.text();
    }
    flash(`seeded with ${kind}`);
  } catch (err) {
    // graceful fallback
    inputEl.value =
      "Pick up the tool. Use it wrong. Share what you learn. Build a posse. The corporations build the infrastructure. The weirdos figure out what it's for. Both hands full — critique in one, capability in the other.";
    flash(`seed unavailable — used a stub (${err.message || err})`);
  }
}

// ---------------------------------------------------------------------------

async function exportPng() {
  if (!window.htmlToImage) {
    flash("html-to-image still loading — try again in a sec");
    return;
  }
  try {
    flash("rendering…");
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
  } catch (err) {
    console.error(err);
    flash("PNG export failed — see console");
  }
}

async function copyText() {
  const text = bodyEl.innerText.trim();
  if (!text || text.startsWith("Paste something")) {
    flash("nothing to copy yet");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    flash("copied to clipboard");
  } catch {
    flash("copy failed — select manually");
  }
}

// ---------------------------------------------------------------------------

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
  clearTimeout(flash._t);
  flash._t = setTimeout(() => {
    if (statusEl) statusEl.textContent = "";
  }, 2500);
}

function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
