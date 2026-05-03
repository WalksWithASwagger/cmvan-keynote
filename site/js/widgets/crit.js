// /widgets/crit — template-driven critique.
//
// User picks a kind of work + an angle of crit. Widget composes a structured
// prompt-form that can be pasted into any external LLM, OR shows a worked
// exemplar for the (kind, angle) pair when one exists. Fully client-side,
// no backend, no LLM call. Selections persist in localStorage.

import { load, save, debounceSave, remove } from "/js/common/storage.js";

const STATE_KEY = "crit:state";
const RUBRICS_URL = "/data/crit-rubrics.json";

const kindsEl = document.getElementById("crit-kinds");
const anglesEl = document.getElementById("crit-angles");
const workEl = document.getElementById("crit-work");
const outputEl = document.getElementById("crit-output");
const statusEl = document.getElementById("crit-status");
const lensTitleEl = document.querySelector("#crit-lens .crit__lens-title");
const lensTagEl = document.getElementById("crit-lens-tag");
const lensQEl = document.getElementById("crit-lens-q");
const imageBoxEl = document.getElementById("crit-image");
const imageEl = document.getElementById("crit-image-el");

const debouncedSave = debounceSave(STATE_KEY, 400);

let rubrics = { kinds: [], angles: [], exemplars: {} };
let state = { kind: null, angle: null, work: "" };

init();

async function init() {
  try {
    const res = await fetch(RUBRICS_URL);
    rubrics = await res.json();
  } catch (err) {
    console.warn("[crit] failed to load rubrics:", err);
    flash("could not load rubrics — refresh");
    return;
  }

  hydrate();
  paintChips();
  paintLens();
  paintImage();
  bind();
}

function hydrate() {
  const { value } = load(STATE_KEY, null);
  if (value && typeof value === "object") {
    state = {
      kind: typeof value.kind === "string" ? value.kind : null,
      angle: typeof value.angle === "string" ? value.angle : null,
      work: typeof value.work === "string" ? value.work : "",
    };
    if (state.work) workEl.value = state.work;
  }
}

function bind() {
  kindsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-kind]");
    if (!btn) return;
    state.kind = btn.dataset.kind;
    debouncedSave(state);
    paintChips();
  });

  anglesEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-angle]");
    if (!btn) return;
    state.angle = btn.dataset.angle;
    debouncedSave(state);
    paintChips();
    paintLens();
  });

  workEl.addEventListener("input", () => {
    state.work = workEl.value;
    debouncedSave(state);
    paintImage();
  });

  document.querySelector('[data-action="build"]').addEventListener("click", build);
  document.querySelector('[data-action="copy"]').addEventListener("click", copy);
  document.querySelector('[data-action="exemplar"]').addEventListener("click", showExemplar);
  document.querySelector('[data-action="reset"]').addEventListener("click", reset);
}

// -----------------------------------------------------------------------------

function paintChips() {
  kindsEl.innerHTML = rubrics.kinds
    .map(
      (k) =>
        `<button type="button" class="crit__chip" role="radio" aria-pressed="${
          state.kind === k.id ? "true" : "false"
        }" data-kind="${escapeAttr(k.id)}">${escapeHTML(k.label)}<span class="crit__chip-hint">${escapeHTML(
          k.hint
        )}</span></button>`
    )
    .join("");

  anglesEl.innerHTML = rubrics.angles
    .map(
      (a) =>
        `<button type="button" class="crit__chip" role="radio" aria-pressed="${
          state.angle === a.id ? "true" : "false"
        }" data-angle="${escapeAttr(a.id)}">${escapeHTML(a.label)}<span class="crit__chip-hint">${escapeHTML(
          a.tagline
        )}</span></button>`
    )
    .join("");
}

function paintLens() {
  const angle = rubrics.angles.find((a) => a.id === state.angle);
  if (!angle) {
    lensTitleEl.textContent = "Pick an angle to see the lens";
    lensTagEl.textContent = "";
    lensQEl.innerHTML = "";
    return;
  }
  lensTitleEl.textContent = angle.label;
  lensTagEl.textContent = angle.tagline;
  lensQEl.innerHTML = angle.questions.map((q) => `<li>${escapeHTML(q)}</li>`).join("");
}

function paintImage() {
  const url = extractImageUrl(state.work);
  if (!url) {
    imageBoxEl.hidden = true;
    imageEl.removeAttribute("src");
    return;
  }
  imageEl.onerror = () => { imageBoxEl.hidden = true; };
  imageEl.onload = () => { imageBoxEl.hidden = false; };
  imageEl.src = url;
}

function extractImageUrl(text) {
  if (!text) return null;
  const lines = String(text).split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (/^https?:\/\/\S+\.(?:png|jpe?g|gif|webp|avif)(?:\?\S*)?$/i.test(t)) return t;
  }
  return null;
}

// -----------------------------------------------------------------------------

function build() {
  if (!state.kind || !state.angle) {
    flash("pick a kind and an angle first");
    return;
  }
  outputEl.textContent = composeTemplate();
  flash("template built — copy it into your LLM");
}

function composeTemplate() {
  const kind = rubrics.kinds.find((k) => k.id === state.kind);
  const angle = rubrics.angles.find((a) => a.id === state.angle);
  const work = (state.work || "").trim();

  const lines = [];
  lines.push(`# Crit request — ${kind.label} × ${angle.label}`);
  lines.push("");
  lines.push(`You are a critic who works in the Punk Rock AI tradition: taste over throughput, refusal as practice, the maker's hand visible in the work.`);
  lines.push("");
  lines.push(`The piece is a ${kind.label.toLowerCase()}. The angle of critique is ${angle.label} — ${angle.tagline}`);
  lines.push("");
  lines.push(`Answer each of the following, in order, in plain prose. Do not flatter. Do not hedge. Refuse the urge to be balanced; this is a single-angle pass.`);
  lines.push("");
  angle.questions.forEach((q, i) => {
    lines.push(`${i + 1}. ${q}`);
  });
  lines.push("");
  lines.push(`Close with one paragraph: "If this piece were 30% shorter / tighter / braver, what would the cut version look like?"`);
  lines.push("");
  lines.push(`---`);
  lines.push(`THE WORK:`);
  lines.push("");
  lines.push(work || "[paste the work here]");
  return lines.join("\n");
}

function showExemplar() {
  if (!state.kind || !state.angle) {
    flash("pick a kind and an angle first");
    return;
  }
  const key = `${state.kind}__${state.angle}`;
  const exemplar = rubrics.exemplars[key];
  if (!exemplar) {
    outputEl.textContent = `No exemplar yet for ${state.kind} × ${state.angle}.\n\nUse the build button to compose a template you can run yourself, then save the result back here as a worked example for the next person.`;
    flash("no exemplar — build a template instead");
    return;
  }
  outputEl.textContent = exemplar;
  flash("exemplar shown");
}

async function copy() {
  const text = outputEl.textContent.trim();
  if (!text) {
    flash("build something first");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    flash("copied");
  } catch {
    flash("copy failed — select manually");
  }
}

function reset() {
  if (!window.confirm("Clear your selection and pasted work?")) return;
  state = { kind: null, angle: null, work: "" };
  workEl.value = "";
  outputEl.textContent = "";
  remove(STATE_KEY);
  paintChips();
  paintLens();
  paintImage();
  flash("reset");
}

// -----------------------------------------------------------------------------

function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(s) {
  return String(s ?? "").replaceAll('"', "&quot;");
}

function flash(msg) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  clearTimeout(flash._t);
  flash._t = setTimeout(() => {
    if (statusEl) statusEl.textContent = "";
  }, 2500);
}
