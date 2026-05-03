// /widgets/bias-bingo — 5x5 grid wired to bingo.json + cases.json. Click a
// cell to open a modal with the case study (when linked) or the look-for
// hint (when not). Mark cells "seen". Row/column complete unlocks a markdown
// framework checklist download.
//
// Share hash format (#s=<base64url>):
//   25 bits — one per cell, in the order cells appear in bingo.json.
//   Bit i is 1 when bingo.cells[i] is marked seen. Bits are packed
//   most-significant-first into 4 bytes (only 25 bits used; trailing 7
//   bits are zero) and base64url-encoded. Decoder is tolerant of any
//   length so the format can grow without breaking old links.
//   Hash state is merged with localStorage on load (union, never wipe).

import { load, save } from "/js/common/storage.js";

const STORAGE_KEY = "bingo:seen";

const boardEl = document.getElementById("bbingo-board");
const statsEl = document.getElementById("bbingo-stats");
const unlockEl = document.getElementById("bbingo-unlock");
const modalEl = document.getElementById("bbingo-modal");
const modalTag = modalEl.querySelector("[data-modal-tag]");
const modalCell = modalEl.querySelector("[data-modal-cell]");
const modalBody = modalEl.querySelector("[data-modal-body]");
const modalClose = modalEl.querySelector("[data-modal-close]");
const toggleBtn = modalEl.querySelector('[data-action="toggle-seen"]');

let bingo = null;
let cases = null;
let seen = new Set();
let activeCellId = null;
let clearedLines = new Set();
const LINE_ANIM_MS = 1400;

main();

async function main() {
  try {
    const [bRes, cRes] = await Promise.all([
      fetch("/data/bingo.json"),
      fetch("/data/cases.json"),
    ]);
    if (!bRes.ok) throw new Error("bingo.json fetch failed");
    bingo = await bRes.json();
    cases = cRes.ok ? await cRes.json() : { cases: [] };
  } catch (err) {
    boardEl.innerHTML = `<p class="kicker">data unavailable: ${escapeHTML(err.message || err)}</p>`;
    return;
  }

  const stored = load(STORAGE_KEY, []);
  seen = new Set(Array.isArray(stored.value) ? stored.value : []);

  const fromHash = seenFromHash();
  if (fromHash) {
    for (const id of fromHash) seen.add(id);
    save(STORAGE_KEY, [...seen]);
  }

  renderBoard();
  bindModal();
  // seed cleared-line set so pre-existing completed lines don't auto-animate on load
  clearedLines = new Set(detectLines().map((l) => l.key));
  paintStats();
  syncShareUrl();
}

function renderBoard() {
  boardEl.innerHTML = "";
  for (const cell of bingo.cells) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bbingo-cell";
    btn.dataset.cell = cell.id;
    btn.dataset.row = String(cell.row);
    btn.dataset.col = String(cell.col);
    if (cell.free) btn.dataset.free = "true";
    if (seen.has(cell.id)) btn.dataset.seen = "true";
    btn.innerHTML = `
      <span class="bbingo-cell__label">${escapeHTML(cell.label)}</span>
      <span class="bbingo-cell__look">${escapeHTML(cell.look)}</span>
      ${cell.caseId ? `<span class="bbingo-cell__case">↳ case study</span>` : ""}
    `;
    btn.addEventListener("click", () => openCell(cell.id));
    boardEl.appendChild(btn);
  }
}

// ---------------------------------------------------------------------------

function openCell(id) {
  const cell = bingo.cells.find((c) => c.id === id);
  if (!cell) return;
  activeCellId = id;

  const linkedCase = cell.caseId
    ? cases.cases.find((c) => c.id === cell.caseId)
    : null;

  modalTag.textContent = `cell ${cell.id.toUpperCase()}`;
  modalCell.textContent = cell.label.toUpperCase();
  modalBody.innerHTML = renderModalBody(cell, linkedCase);
  toggleBtn.textContent = seen.has(id) ? "Mark as not seen" : "Mark as seen";

  if (typeof modalEl.showModal === "function" && !modalEl.open) {
    modalEl.showModal();
  }
}

function renderModalBody(cell, c) {
  if (cell.free) {
    return `
      <h2>${escapeHTML(cell.label)}</h2>
      <p class="pull">Whoever's missing from the room you build is the bias you ship.</p>
      <p>The center cell is free. Mark it any time you remember to ask the question. Then ask the question.</p>
    `;
  }
  if (c) {
    return `
      <h2>${escapeHTML(c.headline)}</h2>
      <p>${escapeHTML(c.context)}</p>
      <p class="pull">${escapeHTML(c.observation)}</p>
      <dl>
        <dt>Lazy name</dt><dd>${escapeHTML(c.lazyName)}</dd>
        <dt>What it is</dt><dd>${escapeHTML(c.preciseName)}</dd>
        <dt>Prompt</dt><dd>${escapeHTML(c.prompt)}</dd>
        <dt>Citation</dt><dd>${
          c.citationUrl
            ? `<a href="${escapeAttr(c.citationUrl)}">${escapeHTML(c.citation)}</a>`
            : escapeHTML(c.citation)
        }</dd>
        <dt>Talk ref</dt><dd>${escapeHTML(c.talkRef || "")}</dd>
      </dl>
    `;
  }
  return `
    <h2>${escapeHTML(cell.label)}</h2>
    <p class="pull">${escapeHTML(cell.look)}</p>
    <p>This category doesn&rsquo;t have a case study yet. Find one in the wild, open a PR, or use the prompt above as a checklist.</p>
  `;
}

function bindModal() {
  modalClose.addEventListener("click", () => modalEl.close());
  modalEl.addEventListener("click", (e) => {
    if (e.target === modalEl) modalEl.close();
  });
  toggleBtn.addEventListener("click", () => {
    if (!activeCellId) return;
    if (seen.has(activeCellId)) {
      seen.delete(activeCellId);
    } else {
      seen.add(activeCellId);
    }
    save(STORAGE_KEY, [...seen]);
    syncCellState(activeCellId);
    paintStats();
    syncShareUrl();
    toggleBtn.textContent = seen.has(activeCellId) ? "Mark as not seen" : "Mark as seen";
  });

  document.querySelector('[data-action="download-checklist"]').addEventListener("click", (e) => {
    e.preventDefault();
    downloadChecklist();
  });

  document.querySelector('[data-action="share"]')?.addEventListener("click", copyShareLink);
}

function syncCellState(id) {
  const btn = boardEl.querySelector(`[data-cell="${id}"]`);
  if (!btn) return;
  if (seen.has(id)) btn.dataset.seen = "true";
  else delete btn.dataset.seen;
}

// ---------------------------------------------------------------------------

function paintStats() {
  const seenCount = seen.size;
  const lines = detectLines();
  const linesCleared = lines.length;
  setStat("seen", `${seenCount}/${bingo.cells.length}`);
  setStat("lines", String(linesCleared));
  unlockEl.dataset.unlocked = linesCleared > 0 ? "true" : "false";

  for (const line of lines) {
    if (!clearedLines.has(line.key)) {
      clearedLines.add(line.key);
      animateLine(line);
    }
  }
  // forget lines that are no longer complete so they re-trigger if reseen
  for (const key of [...clearedLines]) {
    if (!lines.some((l) => l.key === key)) clearedLines.delete(key);
  }
}

function setStat(name, value) {
  const el = statsEl.querySelector(`[data-stat="${name}"] strong`);
  if (el) el.textContent = value;
}

function countLines() {
  return detectLines().length;
}

function detectLines() {
  const rows = bingo.rows;
  const cols = bingo.cols;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  for (const cell of bingo.cells) {
    grid[cell.row][cell.col] = cell;
  }
  const isSeen = (cell) => cell && seen.has(cell.id);
  const lines = [];
  for (let r = 0; r < rows; r++) {
    if (grid[r].every(isSeen)) {
      lines.push({ key: `row:${r}`, dir: "row", cells: grid[r].slice() });
    }
  }
  for (let c = 0; c < cols; c++) {
    const col = grid.map((row) => row[c]);
    if (col.every(isSeen)) {
      lines.push({ key: `col:${c}`, dir: "col", cells: col });
    }
  }
  const diag1 = grid.map((row, i) => row[i]);
  if (diag1.every(isSeen)) {
    lines.push({ key: "diag:1", dir: "diag1", cells: diag1 });
  }
  const diag2 = grid.map((row, i) => row[cols - 1 - i]);
  if (diag2.every(isSeen)) {
    lines.push({ key: "diag:2", dir: "diag2", cells: diag2 });
  }
  return lines;
}

function animateLine(line) {
  const els = line.cells
    .map((cell, i) => {
      const el = boardEl.querySelector(`[data-cell="${cell.id}"]`);
      return el ? { el, i } : null;
    })
    .filter(Boolean);
  for (const { el, i } of els) {
    el.dataset.lineCleared = line.dir;
    el.style.setProperty("--line-pos", String(i));
  }
  setTimeout(() => {
    for (const { el } of els) {
      // only clear if no other line claimed this cell in the meantime
      if (el.dataset.lineCleared === line.dir) {
        delete el.dataset.lineCleared;
        el.style.removeProperty("--line-pos");
      }
    }
  }, LINE_ANIM_MS);
}

// ---------------------------------------------------------------------------

function downloadChecklist() {
  const seenCells = bingo.cells.filter((c) => seen.has(c.id));
  const lines = [];
  lines.push("# Bias-naming checklist");
  lines.push("");
  lines.push(`_${seen.size} of ${bingo.cells.length} categories seen — generated ${new Date().toISOString().slice(0, 10)} on punkrockai.com / bias-bingo_`);
  lines.push("");
  lines.push(`> ${bingo.thesis}`);
  lines.push("");
  if (seenCells.length === 0) {
    lines.push("No cells marked yet. Mark the categories you've actually seen ship — that's where the audit starts.");
  } else {
    for (const cell of seenCells) {
      lines.push(`## ${cell.label}`);
      lines.push("");
      lines.push(`- **Look for:** ${cell.look}`);
      const c = cell.caseId ? cases.cases.find((cs) => cs.id === cell.caseId) : null;
      if (c) {
        lines.push(`- **Lazy name:** ${c.lazyName}`);
        lines.push(`- **Precise name:** ${c.preciseName}`);
        lines.push(`- **Prompt:** ${c.prompt}`);
        lines.push(`- **Citation:** ${c.citation}${c.citationUrl ? ` — ${c.citationUrl}` : ""}`);
      } else {
        lines.push(`- **Case study:** open — find one in the wild`);
      }
      lines.push("");
    }
  }
  lines.push("---");
  lines.push("");
  lines.push("From the talk: *Stop saying bias. Name what you're seeing.*");
  lines.push("");
  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bias-bingo-${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// ---------------------------------------------------------------------------

function buildShareUrl() {
  const encoded = encodeSeen(seen);
  const base = `${window.location.origin}${window.location.pathname}`;
  return encoded ? `${base}#s=${encoded}` : base;
}

function syncShareUrl() {
  const hash = encodeSeen(seen);
  const next = hash ? `${window.location.pathname}#s=${hash}` : window.location.pathname;
  history.replaceState(null, "", next);
}

async function copyShareLink() {
  const url = buildShareUrl();
  try {
    await navigator.clipboard.writeText(url);
    flashShare("share link copied to clipboard");
  } catch {
    flashShare("copy failed — link in console");
    console.log(url);
  }
}

function flashShare(msg) {
  const status = document.getElementById("bbingo-share-status");
  if (!status) return;
  status.textContent = msg;
  clearTimeout(flashShare._t);
  flashShare._t = setTimeout(() => {
    status.textContent = "";
  }, 3000);
}

function encodeSeen(set) {
  if (!bingo || !set.size) return "";
  const bits = bingo.cells.map((c) => (set.has(c.id) ? 1 : 0));
  const byteCount = Math.ceil(bits.length / 8);
  const bytes = new Uint8Array(byteCount);
  for (let i = 0; i < bits.length; i++) {
    if (bits[i]) bytes[i >> 3] |= 1 << (7 - (i & 7));
  }
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function seenFromHash() {
  const match = (window.location.hash || "").match(/^#s=([A-Za-z0-9_-]+)$/);
  if (!match) return null;
  try {
    const b64 = match[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    const bin = atob(padded);
    const ids = [];
    for (let i = 0; i < bingo.cells.length; i++) {
      const byte = bin.charCodeAt(i >> 3);
      if (Number.isNaN(byte)) break;
      if (byte & (1 << (7 - (i & 7)))) ids.push(bingo.cells[i].id);
    }
    return ids;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------

function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(s) {
  return escapeHTML(s).replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
