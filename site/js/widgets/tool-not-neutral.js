// /widgets/tool-not-neutral.html — case showcase for slide 19.
// Walks through paired tool / design-decision / outcome examples.
// Vanilla JS, no dependencies, no LLM. Respects prefers-reduced-motion.

const cardEl = document.getElementById("tnn-card");
const progressEl = document.getElementById("tnn-progress");
const stripEl = document.getElementById("tnn-strip");
const prevBtn = document.getElementById("tnn-prev");
const nextBtn = document.getElementById("tnn-next");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let cases = [];
let active = 0;

main();

async function main() {
  try {
    const res = await fetch("/data/tool-cases.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cases = Array.isArray(data.cases) ? data.cases : [];
    if (!cases.length) throw new Error("no cases");
    renderStrip();
    paint();
    wireNav();
    hydrateFromHash();
  } catch (err) {
    if (cardEl) cardEl.innerHTML = `<p class="kicker">cases unavailable.</p>`;
    console.warn("[tool-not-neutral]", err);
  }
}

function wireNav() {
  prevBtn?.addEventListener("click", () => step(-1));
  nextBtn?.addEventListener("click", () => step(1));
  document.addEventListener("keydown", (e) => {
    if (e.target.matches("textarea, input, button, a")) return;
    if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
  });
  window.addEventListener("hashchange", hydrateFromHash);
}

function step(delta) {
  const next = active + delta;
  if (next < 0 || next >= cases.length) return;
  goTo(next);
}

function goTo(i) {
  if (i === active) return;
  active = i;
  paint();
  const id = cases[active]?.id;
  if (id) history.replaceState(null, "", `#${encodeURIComponent(id)}`);
}

function hydrateFromHash() {
  const raw = decodeURIComponent((location.hash || "").replace(/^#/, ""));
  if (!raw) return;
  const idx = cases.findIndex((c) => c.id === raw);
  if (idx >= 0 && idx !== active) {
    active = idx;
    paint();
  }
}

function renderStrip() {
  if (!stripEl) return;
  stripEl.innerHTML = cases
    .map(
      (c, i) =>
        `<li><button type="button" data-i="${i}" aria-label="Case ${i + 1}: ${escapeAttr(c.tool)}">${pad(i + 1)}</button></li>`
    )
    .join("");
  stripEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-i]");
    if (!btn) return;
    goTo(Number(btn.dataset.i));
  });
}

function paint() {
  const c = cases[active];
  if (!c || !cardEl) return;

  progressEl.textContent = `case ${active + 1} / ${cases.length}`;
  prevBtn.disabled = active === 0;
  nextBtn.disabled = active === cases.length - 1;

  for (const btn of stripEl.querySelectorAll("button[data-i]")) {
    btn.classList.toggle("is-active", Number(btn.dataset.i) === active);
  }

  const valence = c.valence === "benefit" ? "benefit" : "harm";
  const valenceLabel = valence === "benefit" ? "outcome · benefit" : "outcome · harm";

  const citation = c.citation
    ? c.citationUrl
      ? `<a href="${escapeAttr(c.citationUrl)}" target="_blank" rel="noopener">${escapeHTML(c.citation)} &nearr;</a>`
      : escapeHTML(c.citation)
    : "";

  const harmLine = c.harm
    ? `<p class="tnn-card__harm-name"><span class="kicker kicker--accent">harm name</span> ${escapeHTML(c.harm)}</p>`
    : "";

  const preciseLine = c.preciseName
    ? `<p class="tnn-card__precise"><span class="kicker">precise name</span> ${escapeHTML(c.preciseName)}</p>`
    : "";

  cardEl.dataset.valence = valence;
  cardEl.classList.toggle("tnn-card--no-motion", reduceMotion);
  if (!reduceMotion) {
    cardEl.classList.remove("tnn-card--in");
    // force reflow for the entrance animation
    void cardEl.offsetWidth;
    cardEl.classList.add("tnn-card--in");
  }

  cardEl.innerHTML = `
    <header class="tnn-card__head">
      <span class="tnn-card__num">${pad(active + 1)} / ${pad(cases.length)}</span>
      <h2 class="tnn-card__tool">${escapeHTML(c.tool)}</h2>
    </header>
    <dl class="tnn-card__pairs">
      <div class="tnn-card__row tnn-card__row--decision">
        <dt>design decision</dt>
        <dd>${escapeHTML(c.decision)}</dd>
      </div>
      <div class="tnn-card__row tnn-card__row--outcome" data-valence="${valence}">
        <dt>${valenceLabel}</dt>
        <dd>${escapeHTML(c.outcome)}</dd>
      </div>
    </dl>
    ${harmLine}
    ${preciseLine}
    ${citation ? `<p class="tnn-card__cite">&darr; ${citation}</p>` : ""}
  `;
}

function pad(n) {
  return String(n).padStart(2, "0");
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
