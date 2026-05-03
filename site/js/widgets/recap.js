// /recap — feature-length post.
// Single job: walk every <figure data-media-slot="..."> and either render the
// real media (when recap-media.json has a `src`) or a zine-style placeholder.
// To swap a placeholder for a photo or video, edit
// site/data/recap-media.json — no HTML edits required.

const slots = document.querySelectorAll("[data-media-slot]");
if (slots.length) {
  fetch("/data/recap-media.json")
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((payload) => {
      const map = new Map((payload?.slots ?? []).map((s) => [s.id, s]));
      slots.forEach((figure) => {
        const id = figure.getAttribute("data-media-slot");
        render(figure, map.get(id), id);
      });
    })
    .catch((err) => {
      console.warn("[recap] media manifest unavailable:", err);
      slots.forEach((figure) => render(figure, null, figure.getAttribute("data-media-slot")));
    });
}

function render(figure, slot, fallbackId) {
  const id = (slot && slot.id) || fallbackId || "";
  const caption = slot?.caption || "";
  const credit = slot?.credit || "";
  const alt = slot?.alt || caption || id;

  let media;
  if (slot && slot.src && slot.kind === "video") {
    media = `<div class="recap__media-frame"><video controls preload="metadata"${slot.poster ? ` poster="${escapeAttr(slot.poster)}"` : ""}>
      <source src="${escapeAttr(slot.src)}" />
    </video></div>`;
  } else if (slot && slot.src && slot.kind === "embed") {
    media = `<div class="recap__media-frame"><iframe src="${escapeAttr(slot.src)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" title="${escapeAttr(alt)}" allowfullscreen></iframe></div>`;
  } else if (slot && slot.src) {
    media = `<div class="recap__media-frame"><img src="${escapeAttr(slot.src)}" alt="${escapeAttr(alt)}" loading="lazy" /></div>`;
  } else {
    media = `<div class="recap__media-frame">
      <div class="recap__media-placeholder" role="img" aria-label="Media placeholder for ${escapeAttr(id)}">
        <span class="recap__media-placeholder-tag">media slot</span>
        <span class="recap__media-placeholder-id">${escapeHTML(id)}</span>
      </div>
    </div>`;
  }

  const captionLine = caption
    ? `<figcaption class="recap__media-caption">${escapeHTML(caption)}${credit ? ` <span class="recap__media-credit">— ${escapeHTML(credit)}</span>` : ""}</figcaption>`
    : "";

  figure.innerHTML = media + captionLine;
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

// Sticky TOC progress indicator. Uses scroll position instead of a narrow
// IntersectionObserver band so short sections still become current.
(function initRecapToc() {
  const toc = document.querySelector("[data-recap-toc]");
  if (!toc) return;

  const links = new Map();
  toc.querySelectorAll('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute("href").slice(1);
    if (id) links.set(id, a);
  });
  if (!links.size) return;

  const sections = [];
  links.forEach((_link, id) => {
    const section = document.getElementById(id);
    if (section) sections.push(section);
  });
  if (!sections.length) return;

  let activeId = "";
  let ticking = false;

  const setActive = (id) => {
    activeId = id;
    links.forEach((link, key) => {
      const active = key === id;
      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const getActivationLine = () => {
    const scrollMargin = Number.parseFloat(getComputedStyle(sections[0]).scrollMarginTop) || 0;
    return Math.min(scrollMargin + 1, window.innerHeight * 0.55);
  };

  const updateActive = () => {
    ticking = false;
    const activationLine = getActivationLine();
    let nextId = sections[0].id;

    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= activationLine) {
        nextId = section.id;
      }
    });

    if (nextId !== activeId) setActive(nextId);
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateActive);
  };

  const initialHash = window.location.hash.slice(1);
  setActive(links.has(initialHash) ? initialHash : sections[0].id);
  requestUpdate();

  window.addEventListener("load", requestUpdate);
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  window.addEventListener("hashchange", requestUpdate);
})();
