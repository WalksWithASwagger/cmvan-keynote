// /widgets/three-documents.html — three textareas, autosave, two export
// formats. No network calls. localStorage is the only sink.

import { load, save, debounceSave, remove } from "/js/common/storage.js";

const DOCS = [
  { id: "policy", title: "Personal AI policy" },
  { id: "style", title: "Style and voice guide" },
  { id: "worldview", title: "Worldview" },
];
const READY_THRESHOLD = 60; // words

const state = Object.fromEntries(DOCS.map((d) => [d.id, ""]));
const debouncedSavers = Object.fromEntries(
  DOCS.map((d) => [d.id, debounceSave(`tdoc:${d.id}`, 350)])
);

const previewEl = document.getElementById("tdoc-preview");
let previewMode = "md";

hydrate();
wireInputs();
wireExport();
wireTabs();
paint();

// ---------------------------------------------------------------------------

function hydrate() {
  for (const doc of DOCS) {
    const { value } = load(`tdoc:${doc.id}`, "");
    state[doc.id] = typeof value === "string" ? value : "";
    const ta = document.querySelector(`[data-doc-input="${doc.id}"]`);
    if (ta) ta.value = state[doc.id];
  }
}

function wireInputs() {
  for (const doc of DOCS) {
    const ta = document.querySelector(`[data-doc-input="${doc.id}"]`);
    if (!ta) continue;
    ta.addEventListener("input", () => {
      state[doc.id] = ta.value;
      debouncedSavers[doc.id](ta.value);
      paint();
    });
  }
}

function wireExport() {
  document.querySelector('[data-export="download"]').addEventListener("click", download);
  document.querySelector('[data-export="copy"]').addEventListener("click", copyAll);
  document.querySelector('[data-export="reset"]').addEventListener("click", resetAll);
}

function wireTabs() {
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      previewMode = btn.dataset.tab;
      document.querySelectorAll("[data-tab]").forEach((b) =>
        b.setAttribute("aria-pressed", String(b === btn))
      );
      paint();
    });
  });
}

// ---------------------------------------------------------------------------

function paint() {
  for (const doc of DOCS) {
    const text = state[doc.id] ?? "";
    const words = countWords(text);
    const chars = text.length;
    const ready = words >= READY_THRESHOLD;

    setText(`[data-doc-words="${doc.id}"]`, formatNumber(words));
    setText(`[data-doc-chars="${doc.id}"]`, formatNumber(chars));
    setText(`[data-doc-state="${doc.id}"]`, ready ? "ready" : words === 0 ? "empty" : "draft");
    document
      .querySelector(`[data-doc-state="${doc.id}"]`)
      ?.setAttribute("data-state", ready ? "ready" : "draft");

    const pill = document.querySelector(`[data-progress="${doc.id}"]`);
    if (pill) {
      pill.querySelector("[data-progress-words]").textContent = words === 0 ? "empty" : `${formatNumber(words)} w`;
      pill.setAttribute("data-state", ready ? "ready" : "draft");
    }
  }

  if (previewEl) {
    previewEl.textContent = anyContent() ? render(previewMode) : "";
  }
}

function anyContent() {
  return DOCS.some((d) => (state[d.id] ?? "").trim().length > 0);
}

function render(mode) {
  if (mode === "prompt") return renderPrompt();
  return renderMarkdown();
}

function renderMarkdown() {
  const stamp = new Date().toISOString().slice(0, 10);
  const sections = DOCS.map((d) => {
    const body = (state[d.id] ?? "").trim();
    if (!body) return null;
    return `## ${d.title}\n\n${body}\n`;
  }).filter(Boolean);
  return [
    `# Three documents`,
    `_drafted ${stamp} via punkrockai.com / three-documents_`,
    ``,
    ...sections,
    `---`,
    `Feed these documents back to whatever AI you use every day. The machine`,
    `stops giving you the average of the internet. It starts amplifying what`,
    `makes you you.`,
    ``,
  ].join("\n");
}

function renderPrompt() {
  const sections = DOCS.map((d) => {
    const body = (state[d.id] ?? "").trim();
    if (!body) return null;
    return `## ${d.title}\n${body}`;
  }).filter(Boolean);
  return [
    `You are an assistant calibrated to my voice and values. I am giving you`,
    `three reference documents. Use them to ground every reply. When my`,
    `request would conflict with my refusals, name the conflict and ask me`,
    `before proceeding. When you write in my voice, match my refusals,`,
    `references, and rhythm. Do not write in your default register.`,
    ``,
    ...sections,
    ``,
    `Acknowledge that you have read all three documents, then wait for my`,
    `next message. Do not summarize them back to me.`,
  ].join("\n");
}

// ---------------------------------------------------------------------------

function download() {
  if (!anyContent()) return flash("nothing to export yet");
  const ext = previewMode === "prompt" ? "txt" : "md";
  const filename = previewMode === "prompt"
    ? `three-documents.bot-prompt.${ext}`
    : `three-documents.${ext}`;
  const blob = new Blob([render(previewMode)], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  flash(`downloaded ${filename}`);
}

async function copyAll() {
  if (!anyContent()) return flash("nothing to copy yet");
  try {
    await navigator.clipboard.writeText(render(previewMode));
    flash(`copied ${previewMode === "prompt" ? "prompt" : "markdown"} to clipboard`);
  } catch {
    flash("copy failed — select preview text manually");
  }
}

function resetAll() {
  const ok = window.confirm(
    "Wipe all three drafts from this browser? This cannot be undone — download a copy first if you want to keep them."
  );
  if (!ok) return;
  for (const doc of DOCS) {
    state[doc.id] = "";
    remove(`tdoc:${doc.id}`);
    const ta = document.querySelector(`[data-doc-input="${doc.id}"]`);
    if (ta) ta.value = "";
  }
  paint();
  flash("drafts cleared");
}

// ---------------------------------------------------------------------------

let flashTimer;
function flash(msg) {
  // tiny ephemeral status — reuse the export hint paragraph if present
  let host = document.querySelector(".tdoc-export__hint");
  if (!host) return;
  if (!host.dataset.original) host.dataset.original = host.innerHTML;
  host.textContent = msg;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    host.innerHTML = host.dataset.original;
  }, 2500);
}

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
}

function countWords(text) {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function formatNumber(n) {
  return n.toLocaleString("en-US");
}
