// /widgets/name-what-you-see.html — case browser + bias-naming workbench.
// No LLM call. Local-first. The "framework" is a deterministic Markdown
// checklist generated from the user's pasted text.

import { load, save, debounceSave } from "/js/common/storage.js";

const STORAGE_KEY = "nwys:input";

const caseEl = document.getElementById("nwys-case");
const progressEl = document.getElementById("nwys-progress");
const prevBtn = document.getElementById("nwys-prev");
const nextBtn = document.getElementById("nwys-next");

const inputEl = document.getElementById("nwys-input");
const goBtn = document.getElementById("nwys-go");
const dlBtn = document.getElementById("nwys-download");
const copyBtn = document.getElementById("nwys-copy");
const outputEl = document.getElementById("nwys-output");

let cases = [];
let active = 0;

main();

async function main() {
  try {
    const res = await fetch("/data/cases.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cases = data.cases || [];
    if (!cases.length) throw new Error("no cases");
    paint();
    wireNav();
    wireBench();
    hydrateInput();
  } catch (err) {
    if (caseEl) caseEl.innerHTML = `<p class="kicker">cases unavailable.</p>`;
    console.warn("[nwys]", err);
  }
}

function wireNav() {
  prevBtn?.addEventListener("click", () => step(-1));
  nextBtn?.addEventListener("click", () => step(1));
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("textarea, input, button")) return;
    if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
  });
}

function step(delta) {
  const next = active + delta;
  if (next < 0 || next >= cases.length) return;
  active = next;
  paint();
}

function paint() {
  const c = cases[active];
  if (!c) return;
  progressEl.textContent = `case ${active + 1} / ${cases.length}`;
  prevBtn.disabled = active === 0;
  nextBtn.disabled = active === cases.length - 1;

  const citation = c.citation
    ? `<p class="nwys__citation">↳ ${c.citationUrl ? `<a href="${escapeAttr(c.citationUrl)}" target="_blank" rel="noopener">${escapeHTML(c.citation)} ↗</a>` : escapeHTML(c.citation)}</p>`
    : "";

  caseEl.innerHTML = `
    <h2 class="nwys__headline">${escapeHTML(c.headline)}</h2>
    <p class="nwys__context">${escapeHTML(c.context)}</p>
    <p class="nwys__observation">${escapeHTML(c.observation)}</p>
    <div class="nwys__split">
      <div class="nwys__col">
        <h3>The lazy word</h3>
        <p class="nwys__lazy">${escapeHTML(c.lazyName)}</p>
      </div>
      <div class="nwys__col">
        <h3>What it actually is</h3>
        <p class="nwys__precise">${escapeHTML(c.preciseName)}</p>
      </div>
    </div>
    <aside class="nwys__prompt">
      <strong>Use it like this</strong>
      <span>${escapeHTML(c.prompt)}</span>
    </aside>
    ${citation}
  `;
}

// ---------------------------------------------------------------------------

function wireBench() {
  inputEl?.addEventListener("input", (e) => debouncedSaveInput(e.target.value));
  goBtn?.addEventListener("click", generate);
  dlBtn?.addEventListener("click", download);
  copyBtn?.addEventListener("click", copyOutput);
}

const debouncedSaveInput = debounceSave(STORAGE_KEY, 300);

function hydrateInput() {
  const { value } = load(STORAGE_KEY, "");
  if (typeof value === "string" && value && inputEl) {
    inputEl.value = value;
    generate();
  }
}

function generate() {
  const text = (inputEl?.value || "").trim();
  if (!text) {
    outputEl.textContent = "";
    return;
  }
  outputEl.textContent = renderFramework(text);
}

function renderFramework(text) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `# Name what you see

_drafted ${stamp} via punkrockai.com / name-what-you-see_

## The output you saw

> ${text.split("\n").join("\n> ")}

## Step 1 — Stop saying bias.

What is the precise harm? Not "the model is biased" — what specifically is
the model doing? Who does it advantage and who does it disadvantage, and by
roughly how much?

> Your answer:

## Step 2 — Name the pattern.

Is this discrimination by category (race, gender, class, language, region)?
Is it amplification of a historical pattern? Is it differential enforcement
of a single rule? Pick the most precise frame.

> Your answer:

## Step 3 — Find the source.

Where did this pattern come from? The training data? The labeling pipeline?
The objective function? The deployment context? Each maps to a different
remediation.

> Your answer:

## Step 4 — Write the precise sentence.

Replace the lazy framing ("the model is biased") with one sentence that
names the harm, names who it lands on, and names roughly how much. Make it
sharp enough that the people building the system can't pretend it's
neutral.

> Your answer:

---

## Five reference cases

${listCases()}
`;
}

function listCases() {
  return cases
    .map(
      (c, i) =>
        `${i + 1}. **${c.headline}** — lazy: ${c.lazyName} · precise: ${c.preciseName}${c.citation ? ` _(${c.citation}${c.citationUrl ? ` — ${c.citationUrl}` : ""})_` : ""}`
    )
    .join("\n");
}

function download() {
  const text = renderFramework((inputEl?.value || "").trim() || "(paste your AI output here)");
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `name-what-you-see.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function copyOutput() {
  const text = outputEl?.textContent || "";
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    flash("copied");
  } catch {
    flash("copy failed");
  }
}

let flashTimer;
function flash(msg) {
  if (!copyBtn) return;
  const original = copyBtn.dataset.original ?? copyBtn.textContent;
  copyBtn.dataset.original = original;
  copyBtn.textContent = msg;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    copyBtn.textContent = original;
  }, 1600);
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
