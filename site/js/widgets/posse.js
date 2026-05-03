// /posse — load posse.json, render the eleven hand-curated profiles.

const gridEl = document.getElementById("posse-grid");
const totalEl = document.getElementById("posse-total");
const highlightedEl = document.getElementById("posse-highlighted");
const consentEl = document.getElementById("posse-consent");

main();

async function main() {
  try {
    const res = await fetch("/data/posse.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (totalEl) totalEl.textContent = String(data.totalRsvps ?? "—");
    if (highlightedEl) highlightedEl.textContent = String(data.highlightedCount ?? data.profiles.length);
    if (consentEl) consentEl.textContent = data.consentNote ?? "";
    gridEl.innerHTML = "";
    for (const p of data.profiles) {
      gridEl.appendChild(renderCard(p));
    }
  } catch (err) {
    if (gridEl) {
      gridEl.innerHTML = `<li class="posse-card"><p>Posse data unavailable.</p></li>`;
    }
    console.warn("[posse]", err);
  }
}

function renderCard(p) {
  const li = document.createElement("li");
  li.className = "posse-card";
  li.id = `posse-${p.id}`;
  li.innerHTML = `
    <header class="posse-card__head">
      <h3 class="posse-card__name">${escapeHTML(p.name)}</h3>
      ${p.location ? `<span class="posse-card__loc">${escapeHTML(p.location)}</span>` : ""}
    </header>
    ${p.role ? `<p class="posse-card__role">${escapeHTML(p.role)}</p>` : ""}
    ${p.org ? `<p class="posse-card__org">${escapeHTML(p.org)}</p>` : ""}
    ${p.stance ? `<p class="posse-card__stance">${escapeHTML(p.stance)}</p>` : ""}
    ${p.relevance ? `<p class="posse-card__relevance">${escapeHTML(p.relevance)}</p>` : ""}
    ${p.links && p.links.length
      ? `<nav class="posse-card__links">${p.links
          .map((l) => `<a href="${escapeAttr(l.url)}" target="_blank" rel="noopener">${escapeHTML(l.label)} ↗</a>`)
          .join("")}</nav>`
      : ""}
  `;
  return li;
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
