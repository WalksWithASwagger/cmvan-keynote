// /talk — slide reel + quote wall.
// Loads /data/slides.json and /data/quotes.json, renders the reel grouped by
// act, and renders the quote wall keyed to anchor IDs from quotes.json.
// Lightbox uses the native <dialog> element. Keyboard nav: ←/→ to step,
// Esc to close. Featured slides (1, 12, 15) span two columns.
// Audio playback layered in via /js/common/audio-player.js — buttons appear
// when an mp3Url is present in /data/audio-cues.json, gracefully disabled
// when audio isn't recorded yet.

import { audioPlayer } from "/js/common/audio-player.js";

const FEATURED = new Set([1, 12, 15]);

const reelEl = document.getElementById("slide-reel");
const quoteWallEl = document.getElementById("quote-wall");
const actRailEl = document.getElementById("act-rail");
const lightbox = document.getElementById("lightbox");
const lightboxStage = lightbox?.querySelector("[data-lb-stage]");
const lightboxTitle = lightbox?.querySelector("[data-lb-title]");
const lightboxNum = lightbox?.querySelector("[data-lb-num]");
const lightboxAct = lightbox?.querySelector("[data-lb-act]");
const lightboxQuotes = lightbox?.querySelector("[data-lb-quotes]");
const lightboxPrev = lightbox?.querySelector("[data-lb-prev]");
const lightboxNext = lightbox?.querySelector("[data-lb-next]");
const lightboxClose = lightbox?.querySelector("[data-lb-close]");

let slides = [];
let quotes = [];
let quotesBySlide = new Map();
let active = 0;

main();

async function main() {
  try {
    const [slidesRes, quotesRes] = await Promise.all([
      fetch("/data/slides.json"),
      fetch("/data/quotes.json"),
    ]);
    if (!slidesRes.ok || !quotesRes.ok) throw new Error("data fetch failed");
    const slidesPayload = await slidesRes.json();
    const quotesPayload = await quotesRes.json();
    slides = slidesPayload.slides || [];
    quotes = quotesPayload.quotes || [];
    quotesBySlide = groupBy(quotes, (q) => q.slide);
    audioPlayer.ensureLoaded(); // fire-and-forget; player handles its own readiness
    audioPlayer.addEventListener("statechange", paintAudioState);
    renderReel();
    renderQuoteWall();
    renderActRail();
    wireLightbox();
    handleHash();
  } catch (err) {
    if (reelEl) {
      reelEl.innerHTML = `<p class="kicker">slide data unavailable — run <code>npm run build:quotes</code> to seed.</p>`;
    }
    console.warn("[slide-reel]", err);
  }
}

// ---------------------------------------------------------------------------

function renderReel() {
  if (!reelEl) return;
  const byAct = groupActs(slides);
  reelEl.innerHTML = "";
  for (const group of byAct) {
    const section = document.createElement("section");
    section.className = "reel__act";
    section.id = actAnchor(group.act);
    section.innerHTML = `
      <div class="reel__act-head">
        <h2 class="reel__act-name">${escapeHTML(group.act ?? "")}</h2>
        <span class="reel__act-meta">${group.slides.length} slide${group.slides.length === 1 ? "" : "s"}</span>
      </div>
      <ul class="reel__grid"></ul>
    `;
    const grid = section.querySelector(".reel__grid");
    for (const slide of group.slides) {
      grid.appendChild(renderTile(slide));
    }
    reelEl.appendChild(section);
  }
}

function renderTile(slide) {
  const li = document.createElement("li");
  const featured = FEATURED.has(slide.n);
  const tile = document.createElement("button");
  tile.type = "button";
  tile.className = "tile" + (featured ? " tile--featured" : "");
  tile.setAttribute("data-slide", String(slide.n));
  tile.setAttribute("aria-label", `Slide ${slide.n}: ${slide.title}`);
  tile.addEventListener("click", () => openLightbox(slide.n));

  const placeholder = slide.loRes
    ? `<img class="tile__img" loading="lazy" src="${escapeAttr(slide.loRes)}" alt="${escapeAttr(slide.alt ?? slide.title)}">`
    : `<span class="tile__placeholder" aria-hidden="true"></span>`;

  const tileQuotes = quotesBySlide.get(slide.n) ?? [];
  const headlineQuote = tileQuotes[0]?.text ?? "";

  tile.innerHTML = `
    ${placeholder}
    <span class="tile__num">SLIDE ${String(slide.n).padStart(2, "0")}</span>
    ${slide.note ? `<span class="tile__frame">${escapeHTML(slide.note)}</span>` : ""}
    <button type="button" class="tile__audio" data-audio="${escapeAttr(slide.id)}" aria-label="Play audio for slide ${slide.n}" hidden>▶</button>
    <div class="tile__body">
      <h3 class="tile__title">${escapeHTML(slide.title)}</h3>
      ${headlineQuote ? `<p class="tile__quote">&ldquo;${escapeHTML(headlineQuote)}&rdquo;</p>` : ""}
    </div>
  `;
  // wire audio button when cue is present (after audio-cues.json loads)
  const audioBtn = tile.querySelector(".tile__audio");
  if (audioBtn) {
    audioBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleAudio(slide.id, audioBtn);
    });
    waitForAudio(slide.id, () => {
      if (audioPlayer.hasAudio(slide.id)) audioBtn.hidden = false;
    });
  }
  li.appendChild(tile);
  return li;
}

function waitForAudio(slideId, fn) {
  audioPlayer.ensureLoaded().then(fn);
}

function toggleAudio(slideId, btn) {
  if (audioPlayer.currentSlideId === slideId && audioPlayer.state === "playing") {
    audioPlayer.pause();
    return;
  }
  audioPlayer.play(slideId);
}

function paintAudioState(e) {
  const { state, slideId } = e.detail || {};
  document.querySelectorAll(".tile__audio").forEach((btn) => {
    const id = btn.getAttribute("data-audio");
    btn.textContent = id === slideId && state === "playing" ? "⏸" : "▶";
    btn.setAttribute("data-state", id === slideId ? state : "idle");
  });
  const lbAudio = document.querySelector("[data-lb-audio]");
  if (lbAudio) {
    const id = lbAudio.getAttribute("data-audio");
    lbAudio.textContent = id === slideId && state === "playing" ? "⏸ Pause" : "▶ Play";
  }
}

function renderActRail() {
  if (!actRailEl) return;
  const byAct = groupActs(slides);
  actRailEl.innerHTML = byAct
    .map(
      (g) =>
        `<a href="#${actAnchor(g.act)}">${escapeHTML(actLabel(g.act))}</a>`
    )
    .join("");
}

function renderQuoteWall() {
  if (!quoteWallEl) return;
  quoteWallEl.innerHTML = "";
  const list = document.createElement("ol");
  list.className = "quote-wall__list";
  for (const q of quotes) {
    list.appendChild(renderQuote(q));
  }
  quoteWallEl.appendChild(list);
}

function renderQuote(q) {
  const slide = slides.find((s) => s.n === q.slide);
  const li = document.createElement("li");
  li.className = "quote";
  li.id = q.id;
  const thumbInner = slide?.loRes
    ? `<img src="${escapeAttr(slide.loRes)}" alt="" loading="lazy">`
    : `<span aria-hidden="true">SLIDE ${String(q.slide ?? "?").padStart(2, "0")}</span>`;
  li.innerHTML = `
    <a class="quote__thumb" href="#${escapeAttr(q.id)}" aria-label="Slide ${q.slide ?? ""}: ${escapeAttr(q.slideTitle ?? "")}">
      ${thumbInner}
      <span class="quote__thumb-num">${String(q.n).padStart(2, "0")}</span>
    </a>
    <div class="quote__body">
      <p class="quote__text">&ldquo;${escapeHTML(q.text)}&rdquo;</p>
      <div class="quote__meta">
        ${q.act ? `<span>${escapeHTML(q.act)}</span>` : ""}
        ${q.slideTitle ? `<span>Slide ${q.slide} · ${escapeHTML(q.slideTitle)}</span>` : ""}
      </div>
      <div class="quote__actions">
        <button type="button" data-copy="${escapeAttr(q.text)}">Copy</button>
        <a href="#${escapeAttr(q.id)}" data-permalink>Permalink</a>
        ${q.slide ? `<button type="button" data-open-slide="${q.slide}">Open slide</button>` : ""}
      </div>
    </div>
  `;
  li.querySelector("[data-copy]")?.addEventListener("click", (e) => copyQuote(e.currentTarget, q.text));
  li.querySelector("[data-open-slide]")?.addEventListener("click", () => openLightbox(q.slide));
  return li;
}

// ---------------------------------------------------------------------------

function openLightbox(n) {
  if (!lightbox || !slides.length) return;
  const idx = slides.findIndex((s) => s.n === n);
  if (idx === -1) return;
  active = idx;
  paintLightbox();
  if (typeof lightbox.showModal === "function" && !lightbox.open) {
    lightbox.showModal();
  }
}

function paintLightbox() {
  const slide = slides[active];
  if (!slide || !lightbox) return;
  lightboxNum.textContent = `SLIDE ${String(slide.n).padStart(2, "0")} / ${slides.length}`;
  lightboxAct.textContent = slide.act ?? "";
  lightboxTitle.textContent = slide.title;

  if (slide.hiRes || slide.loRes) {
    const src = slide.hiRes || slide.loRes;
    lightboxStage.innerHTML = `<img src="${escapeAttr(src)}" alt="${escapeAttr(slide.alt ?? slide.title)}">`;
  } else {
    lightboxStage.innerHTML = `<div class="lightbox__placeholder"><p>${escapeHTML(slide.title)}</p></div>`;
  }

  const tileQuotes = quotesBySlide.get(slide.n) ?? [];
  if (tileQuotes.length) {
    lightboxQuotes.innerHTML = tileQuotes
      .map((q) => `<li>&ldquo;${escapeHTML(q.text)}&rdquo;</li>`)
      .join("");
    lightboxQuotes.hidden = false;
  } else {
    lightboxQuotes.innerHTML = "";
    lightboxQuotes.hidden = true;
  }

  // audio control inside the lightbox
  const lbAudio = lightbox.querySelector("[data-lb-audio]");
  if (lbAudio) {
    audioPlayer.ensureLoaded().then(() => {
      const has = audioPlayer.hasAudio(slide.id);
      lbAudio.hidden = !has;
      lbAudio.setAttribute("data-audio", slide.id);
      lbAudio.textContent = audioPlayer.currentSlideId === slide.id && audioPlayer.state === "playing" ? "⏸ Pause" : "▶ Play";
    });
  }
  // pause any in-flight audio when navigating to a different slide
  if (audioPlayer.currentSlideId && audioPlayer.currentSlideId !== slide.id) {
    audioPlayer.stop();
  }

  lightboxPrev.disabled = active === 0;
  lightboxNext.disabled = active === slides.length - 1;
}

function wireLightbox() {
  if (!lightbox) return;
  lightboxPrev?.addEventListener("click", () => step(-1));
  lightboxNext?.addEventListener("click", () => step(1));
  lightboxClose?.addEventListener("click", () => lightbox.close());
  const lbAudio = lightbox.querySelector("[data-lb-audio]");
  lbAudio?.addEventListener("click", () => {
    const slide = slides[active];
    if (!slide) return;
    toggleAudio(slide.id, lbAudio);
  });
  // close when backdrop clicked
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) lightbox.close();
  });
  // keyboard nav while open
  lightbox.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      step(-1);
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      step(1);
      e.preventDefault();
    }
  });
  // pause audio when the lightbox closes
  lightbox.addEventListener("close", () => audioPlayer.stop());
}

function step(delta) {
  const next = active + delta;
  if (next < 0 || next >= slides.length) return;
  active = next;
  paintLightbox();
}

// ---------------------------------------------------------------------------

async function copyQuote(btn, text) {
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = "Copied";
    btn.dataset.copied = "true";
    setTimeout(() => {
      btn.textContent = "Copy";
      delete btn.dataset.copied;
    }, 1400);
  } catch {
    btn.textContent = "Select & copy";
  }
}

function handleHash() {
  if (!window.location.hash) return;
  const id = window.location.hash.slice(1);
  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// ---------------------------------------------------------------------------

function groupActs(items) {
  const order = [];
  const map = new Map();
  for (const item of items) {
    const key = item.act ?? "—";
    if (!map.has(key)) {
      map.set(key, { act: item.act, slides: [] });
      order.push(key);
    }
    map.get(key).slides.push(item);
  }
  return order.map((k) => map.get(k));
}

function groupBy(items, fn) {
  const out = new Map();
  for (const item of items) {
    const k = fn(item);
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(item);
  }
  return out;
}

function actAnchor(act) {
  if (!act) return "act-unknown";
  return "act-" + act.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function actLabel(act) {
  if (!act) return "";
  // "Act III — THE CONFRONTATION" → "III · THE CONFRONTATION"
  return act.replace(/^Act\s+/i, "").replace(/\s*[—–-]\s*/, " · ");
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
