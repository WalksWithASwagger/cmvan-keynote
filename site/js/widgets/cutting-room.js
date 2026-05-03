// /widgets/cutting-room — load cutting-room.json, render filterable cards
// for every cut section. Filter pills toggle "all" or one specific reason.
// Vanilla JS, no deps, escape every interpolation.

const kickerEl = document.getElementById("cr-kicker");
const titleEl = document.getElementById("cr-title");
const ledeEl = document.getElementById("cr-lede");
const pullEl = document.getElementById("cr-pull");
const filterRowEl = document.getElementById("cr-filter-row");
const gridEl = document.getElementById("cr-grid");
const emptyEl = document.getElementById("cr-empty");
const countEl = document.getElementById("cr-count");
const totalEl = document.getElementById("cr-total");

const state = {
  cuts: [],
  reasons: new Map(),
  active: "all",
};

main();

async function main() {
  try {
    const res = await fetch("/data/cutting-room.json");
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const data = await res.json();
    renderIntro(data.intro || {});
    state.cuts = Array.isArray(data.cuts) ? data.cuts : [];
    state.reasons = indexReasons(data.reasons || []);
    renderFilter(data.reasons || []);
    if (totalEl) totalEl.textContent = String(state.cuts.length);
    apply();
  } catch (err) {
    if (gridEl) {
      gridEl.innerHTML = `<li class="cr-card cr-card--error"><p>Cutting-room data unavailable.</p></li>`;
    }
    console.warn("[cutting-room]", err);
  }
}

function renderIntro(intro) {
  if (kickerEl && intro.kicker) kickerEl.textContent = intro.kicker;
  if (titleEl && intro.title) titleEl.textContent = intro.title;
  if (ledeEl && intro.lede) ledeEl.textContent = intro.lede;
  if (pullEl && intro.pull) pullEl.textContent = intro.pull;
}

function indexReasons(reasons) {
  const map = new Map();
  for (const r of reasons) map.set(r.id, r);
  return map;
}

function renderFilter(reasons) {
  if (!filterRowEl) return;
  const all = { id: "all", label: "All" };
  const items = [all, ...reasons];
  filterRowEl.innerHTML = items
    .map((r) => filterPillHTML(r))
    .join("");
  filterRowEl.addEventListener("click", onFilterClick);
}

function filterPillHTML(r) {
  const pressed = r.id === state.active ? "true" : "false";
  return `
    <button
      type="button"
      class="cr-pill"
      data-reason="${escapeAttr(r.id)}"
      aria-pressed="${pressed}"
    >${escapeHTML(r.label)}</button>
  `;
}

function onFilterClick(e) {
  const btn = e.target.closest("button.cr-pill");
  if (!btn) return;
  const id = btn.dataset.reason;
  if (!id || id === state.active) return;
  state.active = id;
  for (const b of filterRowEl.querySelectorAll("button.cr-pill")) {
    b.setAttribute("aria-pressed", b.dataset.reason === id ? "true" : "false");
  }
  apply();
}

function apply() {
  if (!gridEl) return;
  const visible =
    state.active === "all"
      ? state.cuts
      : state.cuts.filter((c) => c.reason === state.active);
  gridEl.innerHTML = visible.map(renderCard).join("");
  if (countEl) countEl.textContent = String(visible.length);
  if (emptyEl) emptyEl.hidden = visible.length !== 0;
}

function renderCard(cut) {
  const reason = state.reasons.get(cut.reason);
  const reasonLabel = reason ? reason.label : cut.reason || "uncategorized";
  const reasonBlurb = reason ? reason.blurb : "";
  return `
    <li class="cr-card" data-reason="${escapeAttr(cut.reason || "")}">
      <header class="cr-card__head">
        <span class="cr-card__tag">${escapeHTML(reasonLabel)}</span>
        ${cut.cut_date ? `<time class="cr-card__date" datetime="${escapeAttr(cut.cut_date)}">${escapeHTML(cut.cut_date)}</time>` : ""}
      </header>
      <h2 class="cr-card__title">${escapeHTML(cut.title)}</h2>
      ${cut.from ? `<p class="cr-card__from">${escapeHTML(cut.from)}</p>` : ""}
      <p class="cr-card__body">${escapeHTML(cut.body)}</p>
      ${reasonBlurb ? `<p class="cr-card__reason-blurb">${escapeHTML(reasonBlurb)}</p>` : ""}
      ${cut.rescued_to ? `<p class="cr-card__rescued"><span class="cr-card__rescued-label">Rescued to</span> ${escapeHTML(cut.rescued_to)}</p>` : ""}
      ${cut.source ? `<p class="cr-card__source">↳ ${escapeHTML(cut.source)}</p>` : ""}
    </li>
  `;
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
