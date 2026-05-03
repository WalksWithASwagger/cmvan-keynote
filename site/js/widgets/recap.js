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

// Sticky TOC progress indicator. Watches each <section[id]> via
// IntersectionObserver and toggles `.is-active` on the matching TOC link.
// Activation band sits in the upper third of the viewport so exactly one
// section is "current" at a time.
(function initRecapToc() {
  const toc = document.querySelector("[data-recap-toc]");
  if (!toc || typeof IntersectionObserver === "undefined") return;

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

  const visible = new Map();

  const setActive = (id) => {
    links.forEach((link, key) => {
      link.classList.toggle("is-active", key === id);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          visible.set(entry.target.id, entry.boundingClientRect.top);
        } else {
          visible.delete(entry.target.id);
        }
      });
      if (!visible.size) return;
      // Pick the visible section with the smallest non-negative top — i.e.
      // the one whose top edge is closest to (but not above) the viewport top.
      let activeId = null;
      let bestTop = Infinity;
      visible.forEach((top, id) => {
        if (top >= 0 && top < bestTop) {
          bestTop = top;
          activeId = id;
        }
      });
      if (activeId) setActive(activeId);
    },
    { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
  );

  sections.forEach((section) => observer.observe(section));
})();
