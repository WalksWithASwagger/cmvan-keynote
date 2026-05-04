// photos.js — photo gallery with lazy-loading grid + native <dialog> lightbox.
// Reads data-slug from <ol id="pg-grid"> and fetches /data/photos-<slug>.json.
// Lightbox: click thumb → full-size, ←/→ to step, Esc to close, download btn.

function escapeHTML(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const grid      = document.getElementById("pg-grid");
const lightbox  = document.getElementById("pg-lightbox");
const lbImg     = lightbox?.querySelector("[data-lb-img]");
const lbCaption = lightbox?.querySelector("[data-lb-caption]");
const lbNum     = lightbox?.querySelector("[data-lb-num]");
const lbDl      = lightbox?.querySelector("[data-lb-dl]");
const lbPrev    = lightbox?.querySelector("[data-lb-prev]");
const lbNext    = lightbox?.querySelector("[data-lb-next]");
const lbClose   = lightbox?.querySelector("[data-lb-close]");
const totalEl   = document.getElementById("pg-total");
const featuredEl = document.getElementById("pg-featured");

const SLUG = grid?.dataset?.slug ?? "";

let photos = [];
let current = 0;

main();

async function main() {
  if (!grid || !SLUG) return;
  try {
    const res = await fetch(`/data/photos-${SLUG}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    photos = await res.json();
  } catch (err) {
    grid.innerHTML = `<li class="pg-error">Photo data unavailable.</li>`;
    console.warn("[photos]", err);
    return;
  }

  if (totalEl) totalEl.textContent = photos.length;
  if (featuredEl) featuredEl.textContent = photos.filter(p => p.featured).length;

  renderGrid();
  wireLightbox();
}

function renderGrid() {
  grid.innerHTML = "";
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    const li = document.createElement("li");
    li.className = "pg-card" + (p.featured ? " pg-card--featured" : "");
    li.innerHTML = `
      <button class="pg-thumb" type="button" data-idx="${i}" aria-label="Open photo ${p.id}">
        <img
          src="${escapeHTML(p.thumb)}"
          alt="${escapeHTML(p.alt)}"
          loading="lazy"
          decoding="async"
          width="240"
          height="160"
        />
        ${p.caption ? `<span class="pg-thumb__caption">${escapeHTML(p.caption)}</span>` : ""}
      </button>
    `;
    grid.appendChild(li);
  }
  grid.addEventListener("click", e => {
    const btn = e.target.closest("[data-idx]");
    if (!btn) return;
    openLightbox(Number(btn.dataset.idx));
  });
}

function openLightbox(idx) {
  if (!lightbox) return;
  current = idx;
  paintLightbox();
  lightbox.showModal();
}

function paintLightbox() {
  const p = photos[current];
  if (!p) return;
  if (lbImg) {
    lbImg.src = p.src;
    lbImg.alt = p.alt;
  }
  if (lbCaption) {
    lbCaption.textContent = p.caption || p.alt;
    lbCaption.hidden = false;
  }
  if (lbNum) lbNum.textContent = `${current + 1} / ${photos.length}`;
  if (lbDl) {
    lbDl.href = p.src;
    lbDl.download = `photo-${p.id}.webp`;
  }
  if (lbPrev) lbPrev.disabled = current === 0;
  if (lbNext) lbNext.disabled = current === photos.length - 1;
}

function wireLightbox() {
  if (!lightbox) return;

  lbClose?.addEventListener("click", () => lightbox.close());
  lbPrev?.addEventListener("click", () => { if (current > 0) { current--; paintLightbox(); } });
  lbNext?.addEventListener("click", () => { if (current < photos.length - 1) { current++; paintLightbox(); } });

  lightbox.addEventListener("click", e => {
    if (e.target === lightbox) lightbox.close();
  });

  document.addEventListener("keydown", e => {
    if (!lightbox.open) return;
    if (e.key === "ArrowLeft"  && current > 0)                { current--; paintLightbox(); }
    if (e.key === "ArrowRight" && current < photos.length - 1) { current++; paintLightbox(); }
    if (e.key === "Escape") lightbox.close();
  });
}
