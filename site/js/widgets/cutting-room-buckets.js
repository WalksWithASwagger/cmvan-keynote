const buckets = [
  { id: "keep", label: "Keep" },
  { id: "cut", label: "Cut" },
  { id: "later", label: "Save for later" },
];

const bucketIds = new Set(buckets.map((bucket) => bucket.id));
const poolEl = document.getElementById("crb-pool");
const bucketsEl = document.getElementById("crb-buckets");
const statusEl = document.getElementById("crb-status");
const countsEl = document.getElementById("crb-counts");
const copyLinkEl = document.getElementById("crb-copy-link");
const exportEl = document.getElementById("crb-export");
const resetEl = document.getElementById("crb-reset");

const state = {
  cuts: [],
  assignments: new Map(),
};

main();

async function main() {
  try {
    const res = await fetch("/data/cutting-room.json");
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const data = await res.json();
    state.cuts = Array.isArray(data.cuts) ? data.cuts : [];
    readHash();
    render();
    bindActions();
  } catch (err) {
    if (statusEl) statusEl.textContent = "Cutting-room data unavailable.";
    console.warn("[cutting-room-buckets]", err);
  }
}

function bindActions() {
  document.addEventListener("dragstart", onDragStart);
  document.addEventListener("dragend", onDragEnd);
  document.addEventListener("dragover", onDragOver);
  document.addEventListener("dragleave", onDragLeave);
  document.addEventListener("drop", onDrop);
  document.addEventListener("click", onBucketButtonClick);
  window.addEventListener("hashchange", () => {
    readHash();
    render();
  });
  copyLinkEl?.addEventListener("click", copyShareLink);
  exportEl?.addEventListener("click", exportPNG);
  resetEl?.addEventListener("click", resetBoard);
}

function readHash() {
  state.assignments.clear();
  const params = new URLSearchParams(location.hash.replace(/^#/, ""));
  const encoded = params.get("s");
  if (!encoded) return;
  for (const pair of encoded.split(",")) {
    const [id, bucket] = pair.split(":");
    if (id && bucketIds.has(bucket) && state.cuts.some((cut) => cut.id === id)) {
      state.assignments.set(id, bucket);
    }
  }
}

function render() {
  renderCounts();
  renderPool();
  renderBuckets();
}

function renderCounts() {
  if (!countsEl) return;
  const counts = countAssignments();
  countsEl.innerHTML = [
    countHTML("Unsorted", counts.unassigned),
    ...buckets.map((bucket) => countHTML(bucket.label, counts[bucket.id] || 0)),
  ].join("");
}

function renderPool() {
  if (!poolEl) return;
  poolEl.querySelectorAll(".crb-card").forEach((card) => card.remove());
  const unsorted = state.cuts.filter((cut) => !state.assignments.has(cut.id));
  if (statusEl) {
    statusEl.textContent = unsorted.length
      ? `${unsorted.length} waiting for a call.`
      : "All cuts have a bucket.";
  }
  poolEl.insertAdjacentHTML("beforeend", unsorted.map(cardHTML).join(""));
}

function renderBuckets() {
  for (const bucket of buckets) {
    const dropzone = document.querySelector(`[data-dropzone="${bucket.id}"]`);
    if (!dropzone) continue;
    const cards = state.cuts.filter((cut) => state.assignments.get(cut.id) === bucket.id);
    dropzone.innerHTML = cards.length
      ? cards.map(cardHTML).join("")
      : `<p class="crb-empty">Drop cards here.</p>`;
  }
}

function cardHTML(cut) {
  const assigned = state.assignments.get(cut.id) || "unassigned";
  return `
    <article class="crb-card" draggable="true" data-card-id="${escapeAttr(cut.id)}">
      <header class="crb-card__head">
        <span>${escapeHTML(cut.reason || "cut")}</span>
        ${cut.cut_date ? `<time datetime="${escapeAttr(cut.cut_date)}">${escapeHTML(cut.cut_date)}</time>` : ""}
      </header>
      <h3>${escapeHTML(cut.title)}</h3>
      <p>${escapeHTML(cut.body)}</p>
      <div class="crb-card__moves" aria-label="Move ${escapeAttr(cut.title)}">
        ${bucketButtonHTML(cut.id, assigned, "keep", "Keep")}
        ${bucketButtonHTML(cut.id, assigned, "cut", "Cut")}
        ${bucketButtonHTML(cut.id, assigned, "later", "Later")}
      </div>
    </article>
  `;
}

function bucketButtonHTML(id, assigned, bucket, label) {
  return `
    <button
      type="button"
      data-card-move="${escapeAttr(id)}"
      data-bucket-target="${bucket}"
      aria-pressed="${assigned === bucket ? "true" : "false"}"
    >${label}</button>
  `;
}

function countHTML(label, value) {
  return `<span><strong>${value}</strong> ${escapeHTML(label)}</span>`;
}

function onDragStart(e) {
  const card = e.target.closest(".crb-card");
  if (!card || !e.dataTransfer) return;
  e.dataTransfer.setData("text/plain", card.dataset.cardId);
  e.dataTransfer.effectAllowed = "move";
  card.classList.add("is-dragging");
}

function onDragEnd(e) {
  e.target.closest(".crb-card")?.classList.remove("is-dragging");
  clearDropTargets();
}

function onDragOver(e) {
  const target = closestDropTarget(e.target);
  if (!target) return;
  e.preventDefault();
  target.classList.add("is-over");
  if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
}

function onDragLeave(e) {
  const target = closestDropTarget(e.target);
  if (target && !target.contains(e.relatedTarget)) target.classList.remove("is-over");
}

function onDrop(e) {
  const target = closestDropTarget(e.target);
  if (!target || !e.dataTransfer) return;
  e.preventDefault();
  const id = e.dataTransfer.getData("text/plain");
  const bucket = target.dataset.dropzone || target.dataset.bucket;
  moveCard(id, bucket);
  clearDropTargets();
}

function onBucketButtonClick(e) {
  const button = e.target.closest("[data-card-move]");
  if (!button) return;
  moveCard(button.dataset.cardMove, button.dataset.bucketTarget);
}

function closestDropTarget(target) {
  return target.closest("[data-dropzone], .crb-pool");
}

function moveCard(id, bucket) {
  if (!state.cuts.some((cut) => cut.id === id)) return;
  if (bucketIds.has(bucket)) {
    state.assignments.set(id, bucket);
  } else {
    state.assignments.delete(id);
  }
  writeHash();
  render();
}

function writeHash() {
  const encoded = [...state.assignments.entries()]
    .filter(([, bucket]) => bucketIds.has(bucket))
    .map(([id, bucket]) => `${id}:${bucket}`)
    .join(",");
  if (encoded) {
    history.replaceState(null, "", `#s=${encoded}`);
  } else {
    history.replaceState(null, "", location.pathname + location.search);
  }
}

async function copyShareLink() {
  writeHash();
  const url = location.href;
  try {
    await navigator.clipboard.writeText(url);
    flash(copyLinkEl, "Copied");
  } catch {
    window.prompt("Share link", url);
  }
}

function resetBoard() {
  state.assignments.clear();
  writeHash();
  render();
}

function countAssignments() {
  const counts = { unassigned: 0, keep: 0, cut: 0, later: 0 };
  for (const cut of state.cuts) {
    const bucket = state.assignments.get(cut.id);
    if (bucketIds.has(bucket)) counts[bucket] += 1;
    else counts.unassigned += 1;
  }
  return counts;
}

function exportPNG() {
  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = 1200 * scale;
  canvas.height = 900 * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, 1200, 900);
  ctx.fillStyle = "#f4f0e8";
  ctx.font = "700 44px sans-serif";
  ctx.fillText("Cutting Room Buckets", 48, 72);
  ctx.font = "18px monospace";
  ctx.fillStyle = "#ffcc00";
  ctx.fillText(new Date().toLocaleDateString(), 48, 108);

  const columns = [
    { id: "keep", label: "KEEP", x: 48 },
    { id: "cut", label: "CUT", x: 424 },
    { id: "later", label: "SAVE FOR LATER", x: 800 },
  ];

  for (const column of columns) {
    drawColumn(ctx, column);
  }

  const link = document.createElement("a");
  link.download = "cutting-room-buckets.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function drawColumn(ctx, column) {
  const cards = state.cuts.filter((cut) => state.assignments.get(cut.id) === column.id);
  ctx.strokeStyle = "#ffcc00";
  ctx.lineWidth = 2;
  ctx.strokeRect(column.x, 140, 328, 700);
  ctx.fillStyle = "#ffcc00";
  ctx.font = "700 22px monospace";
  ctx.fillText(`${column.label} (${cards.length})`, column.x + 18, 178);
  ctx.fillStyle = "#f4f0e8";
  ctx.font = "16px sans-serif";
  let y = 220;
  for (const cut of cards.slice(0, 10)) {
    y = drawWrappedText(ctx, cut.title, column.x + 18, y, 292, 20) + 18;
  }
  if (cards.length > 10) {
    ctx.fillStyle = "#8f8a80";
    ctx.fillText(`+ ${cards.length - 10} more`, column.x + 18, y);
  }
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(/\s+/);
  let line = "";
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineHeight;
}

function flash(button, label) {
  if (!button) return;
  const original = button.textContent;
  button.textContent = label;
  window.setTimeout(() => {
    button.textContent = original;
  }, 1200);
}

function clearDropTargets() {
  document.querySelectorAll(".is-over").forEach((el) => el.classList.remove("is-over"));
}

function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(s) {
  return escapeHTML(s).replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
