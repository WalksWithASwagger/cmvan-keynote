const matrixEl = document.getElementById("tnnm-matrix");
const detailEl = document.getElementById("tnnm-detail");
const statusEl = document.getElementById("tnnm-status");

const toolTypes = [
  { id: "vision", label: "Vision", note: "face, image, recognition" },
  { id: "selection", label: "Selection", note: "hiring, ads, ranking" },
  { id: "risk", label: "Risk", note: "courts, care, policing" },
  { id: "speech", label: "Speech", note: "language, voice, moderation" },
  { id: "generation", label: "Generation", note: "image, text, captions" },
];

const designAxes = [
  { id: "data", label: "Training data", note: "who shows up" },
  { id: "proxy", label: "Proxy target", note: "what stands in for truth" },
  { id: "audit", label: "Audit frame", note: "what gets measured" },
  { id: "loop", label: "Feedback loop", note: "what the system reinforces" },
  { id: "default", label: "Default image", note: "who counts as normal" },
];

const caseByCell = {
  "vision:data": "gender-shades",
  "vision:proxy": "indigenous-representation",
  "vision:audit": "gender-shades",
  "vision:loop": "sweeney-ads",
  "vision:default": "marketing-professor",
  "selection:data": "amazon-resume",
  "selection:proxy": "sweeney-ads",
  "selection:audit": "amazon-resume",
  "selection:loop": "amazon-resume",
  "selection:default": "marketing-professor",
  "risk:data": "predictive-policing",
  "risk:proxy": "healthcare-algorithm",
  "risk:audit": "compas",
  "risk:loop": "predictive-policing",
  "risk:default": "compas",
  "speech:data": "asr-accent",
  "speech:proxy": "aave-moderation",
  "speech:audit": "asr-accent",
  "speech:loop": "english-default",
  "speech:default": "english-default",
  "generation:data": "indigenous-representation",
  "generation:proxy": "disability-captions",
  "generation:audit": "disability-captions",
  "generation:loop": "indigenous-representation",
  "generation:default": "marketing-professor",
};

let casesById = new Map();
let cells = [];
let active = 0;
let touchStartX = null;
let touchStartY = null;

main();

async function main() {
  try {
    const res = await fetch("/data/tool-cases.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const cases = Array.isArray(data.cases) ? data.cases : [];
    casesById = new Map(cases.map((item) => [item.id, item]));
    cells = buildCells();
    if (!cells.length) throw new Error("no matrix cells");
    renderMatrix();
    activateCellFromHash() || activateCell(0, { pushHash: false });
    wireInteractions();
  } catch (err) {
    if (statusEl) statusEl.textContent = "Cases unavailable.";
    console.warn("[tool-not-neutral-matrix]", err);
  }
}

function buildCells() {
  return toolTypes.flatMap((tool) =>
    designAxes.map((axis) => {
      const key = `${tool.id}:${axis.id}`;
      const caseId = caseByCell[key];
      const example = casesById.get(caseId);
      return example ? { key, tool, axis, example } : null;
    })
  ).filter(Boolean);
}

function renderMatrix() {
  if (!matrixEl) return;
  const headers = [
    `<div class="tnnm__corner" aria-hidden="true">tool / axis</div>`,
    ...designAxes.map((axis) => axisHeader(axis)),
  ];
  const rows = toolTypes.flatMap((tool) => [
    rowHeader(tool),
    ...designAxes.map((axis) => cellButton(`${tool.id}:${axis.id}`)),
  ]);

  matrixEl.innerHTML = [...headers, ...rows].join("");
  matrixEl.addEventListener("click", handleCellEvent);
  matrixEl.addEventListener("focusin", handleCellEvent);
  matrixEl.addEventListener("mouseover", (e) => {
    if (window.matchMedia("(hover: hover)").matches) handleCellEvent(e);
  });
}

function axisHeader(axis) {
  return `
    <div class="tnnm__axis-head">
      <span>${escapeHTML(axis.label)}</span>
      <small>${escapeHTML(axis.note)}</small>
    </div>
  `;
}

function rowHeader(tool) {
  return `
    <div class="tnnm__tool-head">
      <span>${escapeHTML(tool.label)}</span>
      <small>${escapeHTML(tool.note)}</small>
    </div>
  `;
}

function cellButton(key) {
  const index = cells.findIndex((cell) => cell.key === key);
  const cell = cells[index];
  if (!cell) return `<div class="tnnm__empty" aria-hidden="true"></div>`;

  return `
    <button class="tnnm-cell" type="button" data-i="${index}" aria-expanded="false">
      <span class="tnnm-cell__axis">${escapeHTML(cell.axis.label)}</span>
      <span class="tnnm-cell__tool">${escapeHTML(cell.tool.label)}</span>
      <strong>${escapeHTML(cell.example.tool)}</strong>
      <span>${escapeHTML(shortOutcome(cell.example))}</span>
    </button>
  `;
}

function wireInteractions() {
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("textarea, input, a")) return;
    if (e.key === "ArrowLeft") activateByDelta(-1);
    if (e.key === "ArrowRight") activateByDelta(1);
    if (e.key === "ArrowUp") activateByDelta(-designAxes.length);
    if (e.key === "ArrowDown") activateByDelta(designAxes.length);
  });
  window.addEventListener("hashchange", activateCellFromHash);
  for (const el of [matrixEl, detailEl]) {
    el?.addEventListener("touchstart", rememberTouch, { passive: true });
    el?.addEventListener("touchend", handleSwipe, { passive: true });
  }
}

function handleCellEvent(e) {
  const button = e.target.closest(".tnnm-cell[data-i]");
  if (!button) return;
  activateCell(Number(button.dataset.i));
}

function activateCellFromHash() {
  const raw = decodeURIComponent((location.hash || "").replace(/^#/, ""));
  if (!raw) return false;
  const index = cells.findIndex((cell) => cell.key === raw || cell.example.id === raw);
  if (index < 0) return false;
  activateCell(index, { pushHash: false });
  return true;
}

function activateByDelta(delta) {
  if (!cells.length) return;
  const next = Math.max(0, Math.min(cells.length - 1, active + delta));
  activateCell(next);
}

function activateCell(index, options = {}) {
  if (!cells[index]) return;
  const pushHash = options.pushHash !== false;
  active = index;
  for (const button of matrixEl.querySelectorAll(".tnnm-cell[data-i]")) {
    const isActive = Number(button.dataset.i) === active;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-expanded", String(isActive));
  }
  renderDetail(cells[active]);
  if (statusEl) {
    statusEl.textContent = `${cells[active].tool.label} by ${cells[active].axis.label}: ${cells[active].example.tool}`;
  }
  if (pushHash) history.replaceState(null, "", `#${encodeURIComponent(cells[active].key)}`);
}

function renderDetail(cell) {
  if (!detailEl) return;
  const c = cell.example;
  const citation = c.citation
    ? c.citationUrl
      ? `<a href="${escapeAttr(c.citationUrl)}" target="_blank" rel="noopener">${escapeHTML(c.citation)} &nearr;</a>`
      : escapeHTML(c.citation)
    : "";

  detailEl.innerHTML = `
    <header>
      <p class="kicker kicker--accent">${escapeHTML(cell.tool.label)} x ${escapeHTML(cell.axis.label)}</p>
      <h3>${escapeHTML(c.tool)}</h3>
    </header>
    <dl>
      <div>
        <dt>design choice</dt>
        <dd>${escapeHTML(c.decision)}</dd>
      </div>
      <div>
        <dt>outcome</dt>
        <dd>${escapeHTML(c.outcome)}</dd>
      </div>
    </dl>
    ${c.preciseName ? `<p class="tnnm__precise">${escapeHTML(c.preciseName)}</p>` : ""}
    ${citation ? `<p class="tnnm__cite">${citation}</p>` : ""}
  `;
}

function rememberTouch(e) {
  const touch = e.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}

function handleSwipe(e) {
  if (touchStartX === null || touchStartY === null) return;
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  touchStartX = null;
  touchStartY = null;
  if (Math.abs(dx) < 44 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
  activateByDelta(dx < 0 ? 1 : -1);
}

function shortOutcome(c) {
  return c.harm || c.preciseName || c.outcome;
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
