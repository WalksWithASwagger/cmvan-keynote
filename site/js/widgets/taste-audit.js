// /widgets/taste-audit.html — cutting-room-floor reflection.
// Local-first. No LLM call. The "synthesis" is the user's own writing,
// composed from prompts; export combines the structured input + synthesis
// into a Markdown document.

import { load, save } from "/js/common/storage.js";

const STORAGE_KEY = "ta:state";
const MAX_ITEMS = 12;
const STATES = ["", "kept", "refused", "undecided"];

let prompts = null;
let state = freshState();

const listEl = document.getElementById("ta-list");
const addBtn = document.getElementById("ta-add");
const refusalsEl = document.getElementById("ta-refusals");
const synthInput = document.getElementById("ta-synth-input");
const promptsEl = document.getElementById("ta-prompts");
const introPromptEl = document.getElementById("ta-prompt");

main();

async function main() {
  try {
    const res = await fetch("/data/taste-prompts.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    prompts = await res.json();
    populateCopy();
    hydrateState();
    renderList();
    renderRefusals();
    wireAdd();
    wireSynth();
    wireExport();
    populateSynthPrompts();
  } catch (err) {
    console.warn("[taste-audit]", err);
  }
}

function populateCopy() {
  if (introPromptEl && prompts.promptCopy) introPromptEl.textContent = prompts.promptCopy;
  setStepCopy(0, "step-list");
  setStepCopy(2, "step-refusals");
  setStepCopy(3, "step-synth");
}

function setStepCopy(idx, prefix) {
  const f = prompts.framework[idx];
  if (!f) return;
  const t = document.getElementById(`${prefix}-title`);
  const b = document.getElementById(`${prefix}-body`);
  if (t) t.textContent = f.title;
  if (b) b.textContent = f.body;
}

function freshState() {
  return {
    items: Array.from({ length: 5 }, () => ({ what: "", state: "", why: "" })),
    synth: "",
  };
}

function hydrateState() {
  const { value } = load(STORAGE_KEY, null);
  if (!value || !Array.isArray(value.items)) return;
  state = {
    items: value.items.slice(0, MAX_ITEMS).map((it) => ({
      what: typeof it.what === "string" ? it.what : "",
      state: STATES.includes(it.state) ? it.state : "",
      why: typeof it.why === "string" ? it.why : "",
    })),
    synth: typeof value.synth === "string" ? value.synth : "",
  };
  if (state.items.length < 3) {
    while (state.items.length < 5) state.items.push({ what: "", state: "", why: "" });
  }
  if (synthInput) synthInput.value = state.synth;
}

let _persistT;
function persist() {
  clearTimeout(_persistT);
  _persistT = setTimeout(() => save(STORAGE_KEY, state), 250);
}

// ---------------------------------------------------------------------------

function renderList() {
  listEl.innerHTML = "";
  state.items.forEach((item, idx) => {
    listEl.appendChild(renderItem(item, idx));
  });
  if (state.items.length >= MAX_ITEMS) addBtn.disabled = true;
  else addBtn.disabled = false;
}

function renderItem(item, idx) {
  const li = document.createElement("li");
  li.className = "ta-item";
  li.innerHTML = `
    <span class="ta-item__num">${String(idx + 1).padStart(2, "0")}</span>
    <input
      type="text"
      class="ta-item__what"
      data-idx="${idx}"
      placeholder="${escapeAttr(placeholderFor(idx))}"
    />
    <span class="ta-item__states">
      ${prompts.framework[1].states.map((s) =>
        `<button type="button" class="ta-item__state" data-state="${s.id}" data-idx="${idx}" aria-pressed="false">${escapeHTML(s.label)}</button>`
      ).join("")}
    </span>
  `;
  const input = li.querySelector(".ta-item__what");
  input.value = item.what;
  input.addEventListener("input", () => {
    state.items[idx].what = input.value;
    persist();
    renderRefusals();
  });
  li.querySelectorAll("[data-state]").forEach((btn) => {
    if (btn.dataset.state === item.state) btn.setAttribute("aria-pressed", "true");
    btn.addEventListener("click", () => setItemState(idx, btn.dataset.state, li));
  });
  return li;
}

function placeholderFor(idx) {
  const examples = [
    "the album, two songs in",
    "the photo book that needed one more pass",
    "the essay I started last March",
    "the side project nobody asked for",
    "the talk I almost said yes to",
    "the redesign I half-finished",
    "the zine I made for ten people",
    "the screenplay opening I deleted",
    "the workshop I never ran",
    "the brand I almost took on",
    "the collab I said no to",
    "the move I didn't make",
  ];
  return examples[idx % examples.length];
}

function setItemState(idx, newState, li) {
  state.items[idx].state = state.items[idx].state === newState ? "" : newState;
  li.querySelectorAll("[data-state]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.state === state.items[idx].state));
  });
  persist();
  renderRefusals();
}

function wireAdd() {
  addBtn.addEventListener("click", () => {
    if (state.items.length >= MAX_ITEMS) return;
    state.items.push({ what: "", state: "", why: "" });
    persist();
    renderList();
    // focus the new input
    listEl.querySelector(`.ta-item__what[data-idx="${state.items.length - 1}"]`)?.focus();
  });
}

function renderRefusals() {
  refusalsEl.innerHTML = "";
  const refused = state.items
    .map((item, idx) => ({ ...item, idx }))
    .filter((it) => it.state === "refused" && it.what.trim());
  if (!refused.length) {
    const p = document.createElement("p");
    p.className = "ta-empty";
    p.textContent = "Nothing marked refused yet — that's where the pattern lives.";
    refusalsEl.appendChild(p);
    return;
  }
  for (const it of refused) {
    const div = document.createElement("div");
    div.className = "ta-refusal";
    div.innerHTML = `
      <p class="ta-refusal__what">${escapeHTML(it.what)}</p>
      <input
        type="text"
        class="ta-refusal__why"
        data-idx="${it.idx}"
        placeholder="Why did you refuse it? One sentence."
      />
    `;
    const input = div.querySelector("input");
    input.value = it.why;
    input.addEventListener("input", () => {
      state.items[it.idx].why = input.value;
      persist();
    });
    refusalsEl.appendChild(div);
  }
}

function wireSynth() {
  synthInput?.addEventListener("input", () => {
    state.synth = synthInput.value;
    persist();
  });
}

function populateSynthPrompts() {
  if (!promptsEl || !prompts.promptsForExport) return;
  promptsEl.innerHTML = prompts.promptsForExport.map((p) => `<li>${escapeHTML(p)}</li>`).join("");
}

// ---------------------------------------------------------------------------

function wireExport() {
  document.querySelector('[data-export="download"]').addEventListener("click", download);
  document.querySelector('[data-export="copy"]').addEventListener("click", copyAll);
  document.querySelector('[data-export="reset"]').addEventListener("click", reset);
}

function renderMarkdown() {
  const stamp = new Date().toISOString().slice(0, 10);
  const filled = state.items.filter((it) => it.what.trim());
  const kept = filled.filter((it) => it.state === "kept");
  const refused = filled.filter((it) => it.state === "refused");
  const undecided = filled.filter((it) => it.state === "undecided");
  const orphan = filled.filter((it) => !it.state);
  return [
    `# Taste Audit — Cutting Room Floor`,
    `_drafted ${stamp} via punkrockai.com / taste-audit_`,
    ``,
    `## The list`,
    ...filled.map((it, i) => `${i + 1}. ${it.what}${it.state ? ` _[${it.state}]_` : ""}`),
    filled.length ? `` : `_(empty)_`,
    ``,
    `## What I refused (and why)`,
    ...(refused.length
      ? refused.map((it) => `- **${it.what}** — ${it.why || "(no reason given)"}`)
      : [`_(no refusals listed yet)_`]),
    ``,
    `## What I kept`,
    ...(kept.length ? kept.map((it) => `- ${it.what}`) : [`_(no kept items yet)_`]),
    ``,
    ...(undecided.length
      ? [`## Undecided`, ...undecided.map((it) => `- ${it.what}`), ``]
      : []),
    ...(orphan.length
      ? [`## Unsorted`, ...orphan.map((it) => `- ${it.what}`), ``]
      : []),
    `## Synthesis — what your refusals say about your taste`,
    ``,
    state.synth.trim() || `_(write the pattern that connects the refusals)_`,
    ``,
    `## Prompts to think with next`,
    ...prompts.promptsForExport.map((p, i) => `${i + 1}. ${p}`),
    ``,
    `---`,
    ``,
    `_What you call artistic instinct? That's encoded choice. Decades on the cutting`,
    `room floor, compressed into a sensibility._`,
    ``,
  ].join("\n");
}

function download() {
  const md = renderMarkdown();
  const blob = new Blob([md], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `taste-audit.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function copyAll() {
  try {
    await navigator.clipboard.writeText(renderMarkdown());
  } catch {
    /* noop */
  }
}

function reset() {
  if (!window.confirm("Wipe the audit and synthesis from this browser?")) return;
  state = freshState();
  if (synthInput) synthInput.value = "";
  save(STORAGE_KEY, state);
  renderList();
  renderRefusals();
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
