// /workshop.html — four printable templates. Print scoping works by adding
// a body class `printing-<template-id>` before window.print(); the print
// stylesheet hides every other .tmpl when that class is present.
// Bias Bingo cells are populated from /data/bingo.json so the printable
// reflects the same categories as the interactive widget.

const PRINT_CLASS_PREFIX = "printing-";

main();

async function main() {
  await renderBingo();
  wirePrintButtons();
  wireAfterPrint();
}

async function renderBingo() {
  const grid = document.getElementById("bingo-grid");
  if (!grid) return;
  try {
    const res = await fetch("/data/bingo.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    const cells = (payload.cells || [])
      .slice()
      .sort((a, b) => a.row - b.row || a.col - b.col);
    for (const cell of cells) {
      grid.appendChild(buildBingoCell(cell));
    }
  } catch (err) {
    grid.textContent = "Bingo categories failed to load. Refresh, or print anyway with the blank grid below.";
    grid.classList.add("bingo-grid--fallback");
    for (let i = 0; i < 25; i += 1) {
      const blank = document.createElement("div");
      blank.className = "bingo-cell bingo-cell--blank";
      grid.appendChild(blank);
    }
  }
}

function buildBingoCell(cell) {
  const el = document.createElement("div");
  el.className = "bingo-cell";
  el.setAttribute("role", "gridcell");
  if (cell.free) el.classList.add("bingo-cell--free");

  const box = document.createElement("span");
  box.className = "bingo-cell__box";
  box.setAttribute("aria-hidden", "true");
  el.appendChild(box);

  const label = document.createElement("span");
  label.className = "bingo-cell__label";
  label.textContent = cell.label;
  el.appendChild(label);

  return el;
}

function wirePrintButtons() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-print]");
    if (!target) return;
    const which = target.getAttribute("data-print");
    if (!which) return;
    if (which === "all") {
      clearPrintScope();
      window.print();
      return;
    }
    setPrintScope(which);
    window.print();
  });
}

function wireAfterPrint() {
  // afterprint fires when the print dialog closes (printed or cancelled).
  // Without this the body keeps the scoping class and the page renders weird.
  window.addEventListener("afterprint", clearPrintScope);
}

function setPrintScope(template) {
  clearPrintScope();
  document.body.classList.add(`${PRINT_CLASS_PREFIX}${template}`);
}

function clearPrintScope() {
  const stale = Array.from(document.body.classList).filter((c) =>
    c.startsWith(PRINT_CLASS_PREFIX)
  );
  for (const c of stale) document.body.classList.remove(c);
}
