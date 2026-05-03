// /widgets/cut-up — Burroughs / Dada cut-up generator. All client-side.
// Paste any text → choose a cut size (word / phrase / line) → shuffle the
// fragments → render into a zine-style output canvas. Export as PNG via
// html-to-image (CDN <script>, same dep as Both Hands).

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
let lastFragments = null;

bindToggles();
bindActions();
bindSeeds();
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
    const shuffled = shuffle([...lastFragments]);
    lastFragments = shuffled;
    renderFragments(shuffled);
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

// ---------------------------------------------------------------------------

function cut() {
  const text = (inputEl.value || "").trim();
  if (!text) {
    flash("paste something first");
    return;
  }
  const fragments = shuffle(splitText(text, cutMode, punctMode));
  if (!fragments.length) {
    flash("nothing to cut");
    return;
  }
  lastFragments = fragments;
  renderFragments(fragments);
  flash(`cut into ${fragments.length} fragment${fragments.length === 1 ? "" : "s"}`);
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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------

function renderFragments(fragments) {
  metaMode.textContent = `cut by ${cutMode}`;
  metaCount.textContent = `${fragments.length} fragment${fragments.length === 1 ? "" : "s"}`;
  if (marksMode === "on") {
    bodyEl.innerHTML = fragments
      .map((f) => `<span class="cut">${escapeHTML(f)}</span>`)
      .join(" ");
  } else {
    const sep = cutMode === "line" ? "\n" : " ";
    bodyEl.textContent = fragments.join(sep);
  }
  stamp();
}

function stamp() {
  if (metaStamp) metaStamp.textContent = new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------

async function seedFrom(kind) {
  try {
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
