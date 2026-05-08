const titleEl = document.getElementById("cratio-title");
const ledeEl = document.getElementById("cratio-lede");
const sliderEl = document.getElementById("cratio-slider");
const outputEl = document.getElementById("cratio-output");
const anchorsEl = document.getElementById("cratio-anchors");
const cardEl = document.getElementById("cratio-card");
const fillEl = document.querySelector("[data-fill]");
const closingTitleEl = document.getElementById("cratio-closing-title");
const closingBodyEl = document.getElementById("cratio-closing-body");
const closingCiteEl = document.getElementById("cratio-closing-cite");

let anchors = [];

main();

async function main() {
  try {
    const res = await fetch("/data/conductor-tradeoffs.json");
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const data = await res.json();
    anchors = normalizeAnchors(data.anchors);

    if (titleEl && data.title) titleEl.textContent = data.title;
    if (ledeEl && data.lede) ledeEl.textContent = data.lede;
    if (closingTitleEl && data.closing?.title) closingTitleEl.textContent = data.closing.title;
    if (closingBodyEl && data.closing?.body) closingBodyEl.textContent = data.closing.body;
    if (closingCiteEl && data.closing?.cite) closingCiteEl.textContent = "↳ " + data.closing.cite;

    renderAnchors();
    wireSlider();
    update(Number(sliderEl?.value || 50));
  } catch (err) {
    if (cardEl) cardEl.innerHTML = `<p class="kicker">ratio data unavailable.</p>`;
    console.warn("[conductor-ratio]", err);
  }
}

function normalizeAnchors(items) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => Number.isFinite(Number(item.value)))
    .map((item) => ({ ...item, value: clamp(Number(item.value)) }))
    .sort((a, b) => b.value - a.value);
}

function renderAnchors() {
  if (!anchorsEl) return;
  anchorsEl.innerHTML = anchors.map((anchor) => {
    const value = escapeAttr(anchor.value);
    return `
      <button
        type="button"
        class="cratio-anchor"
        data-value="${value}"
        style="--x:${anchor.value}%"
        aria-label="Jump to ${value}% machine throughput"
      >
        <span class="cratio-anchor__tick" aria-hidden="true"></span>
        <span class="cratio-anchor__label">${escapeHTML(anchor.value)}%</span>
      </button>
    `;
  }).join("");

  anchorsEl.querySelectorAll("[data-value]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = Number(button.getAttribute("data-value"));
      if (!sliderEl || !Number.isFinite(value)) return;
      sliderEl.value = String(value);
      sliderEl.focus();
      update(value);
    });
  });
}

function wireSlider() {
  if (!sliderEl) return;
  sliderEl.addEventListener("input", () => update(Number(sliderEl.value)));
  sliderEl.addEventListener("keydown", (event) => {
    const current = Number(sliderEl.value);
    let next = null;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 100;
    else if (event.key === "PageUp") next = current + 10;
    else if (event.key === "PageDown") next = current - 10;
    if (next === null) return;
    event.preventDefault();
    sliderEl.value = String(clamp(next));
    update(Number(sliderEl.value));
  });
}

function update(value) {
  const safeValue = clamp(value);
  const active = nearestAnchor(safeValue);
  const machine = safeValue;
  const human = 100 - safeValue;
  const loss = Math.round(Math.abs(machine - 50) * 1.3);

  if (outputEl) outputEl.textContent = `${machine}% machine / ${human}% human`;
  if (fillEl) fillEl.style.width = `${machine}%`;
  if (sliderEl) {
    sliderEl.setAttribute("aria-valuetext", `${machine}% machine throughput, ${human}% human craft`);
  }
  paintAnchors(active);
  renderCard(active, { machine, human, loss });
}

function nearestAnchor(value) {
  return anchors.reduce((closest, anchor) => {
    if (!closest) return anchor;
    return Math.abs(anchor.value - value) < Math.abs(closest.value - value) ? anchor : closest;
  }, null);
}

function paintAnchors(active) {
  if (!anchorsEl) return;
  anchorsEl.querySelectorAll("[data-value]").forEach((button) => {
    button.toggleAttribute("aria-current", Number(button.getAttribute("data-value")) === active?.value);
  });
}

function renderCard(anchor, values) {
  if (!cardEl || !anchor) return;
  cardEl.innerHTML = `
    <div class="cratio-card__main">
      <p class="cratio-card__tag">${escapeHTML(anchor.tag || anchor.label || "")}</p>
      <h3>${escapeHTML(anchor.label || `${anchor.value}% machine`)}</h3>
      <p>${escapeHTML(anchor.throughput || "")}</p>
    </div>
    <dl class="cratio-metrics">
      <div>
        <dt>Throughput</dt>
        <dd><span style="--w:${values.machine}%"></span>${values.machine}%</dd>
      </div>
      <div>
        <dt>Human craft</dt>
        <dd><span style="--w:${values.human}%"></span>${values.human}%</dd>
      </div>
      <div>
        <dt>Cost pressure</dt>
        <dd><span style="--w:${values.machine}%"></span>${values.machine >= 50 ? "falling" : "rising"}</dd>
      </div>
      <div>
        <dt>Loss risk</dt>
        <dd><span style="--w:${values.loss}%"></span>${values.loss}%</dd>
      </div>
    </dl>
    <div class="cratio-tradeoffs">
      ${renderTradeoff("Craft", anchor.craft)}
      ${renderTradeoff("Cost", anchor.cost)}
      ${renderTradeoff("Loss", anchor.loss)}
    </div>
    <p class="cratio-card__source">${escapeHTML(anchor.sourceNote || "")}</p>
  `;
}

function renderTradeoff(label, text) {
  return `
    <section>
      <h4>${escapeHTML(label)}</h4>
      <p>${escapeHTML(text || "")}</p>
    </section>
  `;
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
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
