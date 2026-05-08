// /release-day — countdown to 2026-05-29 23:59 PT, ship rubric, submission
// portal w/ localStorage fallback, gallery feed.

import { load, save, remove } from "/js/common/storage.js";

const RELEASE_DAY = new Date("2026-05-29T23:59:00-07:00");
const PORTAL_ENDPOINT = "/api/submissions";
const STATIC_GALLERY_ENDPOINT = "/data/submissions.json";
const PENDING_KEY = "rd:pending";
const DRAFT_KEY = "rd:draft";

const cdEl = document.getElementById("rd-countdown");
const passedEl = document.getElementById("rd-passed");
const formEl = document.getElementById("rd-form");
const statusEl = document.getElementById("rd-status");
const clearBtn = document.getElementById("rd-clear");
const pendingEl = document.getElementById("rd-pending");
const pendingJsonEl = document.getElementById("rd-pending-json");
const galleryEl = document.getElementById("rd-gallery");
const galleryEmptyEl = document.getElementById("rd-gallery-empty");

startCountdown();
hydrateDraft();
wireForm();
loadGallery();
paintPending();

// ---------------------------------------------------------------------------

function startCountdown() {
  if (!cdEl) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  paintCountdown();
  if (reduced) return; // single paint is enough — still updates on reload
  setInterval(paintCountdown, 1000);
}

function paintCountdown() {
  const now = Date.now();
  let delta = RELEASE_DAY.getTime() - now;
  if (delta <= 0) {
    cdEl.setAttribute("data-state", "passed");
    setNum("days", "0");
    setNum("hours", "0");
    setNum("minutes", "0");
    setNum("seconds", "0");
    if (passedEl) passedEl.hidden = false;
    return;
  }
  const days = Math.floor(delta / 86400000);
  delta -= days * 86400000;
  const hours = Math.floor(delta / 3600000);
  delta -= hours * 3600000;
  const minutes = Math.floor(delta / 60000);
  delta -= minutes * 60000;
  const seconds = Math.floor(delta / 1000);
  setNum("days", String(days));
  setNum("hours", pad(hours));
  setNum("minutes", pad(minutes));
  setNum("seconds", pad(seconds));
}

function setNum(name, val) {
  const el = cdEl.querySelector(`[data-rd="${name}"]`);
  if (el) el.textContent = val;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

// ---------------------------------------------------------------------------

function hydrateDraft() {
  if (!formEl) return;
  const { value } = load(DRAFT_KEY, null);
  if (!value) return;
  for (const [k, v] of Object.entries(value)) {
    const el = formEl.elements.namedItem(k);
    if (el) el.value = v;
  }
}

function captureDraft() {
  const draft = Object.fromEntries(new FormData(formEl).entries());
  save(DRAFT_KEY, draft);
  return draft;
}

function wireForm() {
  if (!formEl) return;
  formEl.addEventListener("input", () => save(DRAFT_KEY, Object.fromEntries(new FormData(formEl).entries())));
  formEl.addEventListener("submit", onSubmit);
  clearBtn?.addEventListener("click", () => {
    formEl.reset();
    remove(DRAFT_KEY);
    flash("draft cleared");
  });
}

async function onSubmit(e) {
  e.preventDefault();
  if (!formEl.reportValidity()) return;
  const submission = captureDraft();
  flash("sending…");
  try {
    const res = await fetch(PORTAL_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(submission),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status === "queued-no-backend") {
      queueLocally(submission);
      flash("portal not connected yet — saved locally");
      return;
    }
    formEl.reset();
    remove(DRAFT_KEY);
    flash(`submitted — id ${data.id ?? "—"}`);
  } catch (err) {
    queueLocally(submission);
    flash("portal not connected yet — saved locally");
  }
}

function queueLocally(submission) {
  const { value } = load(PENDING_KEY, []);
  const list = Array.isArray(value) ? value : [];
  list.push({ ...submission, queuedAt: new Date().toISOString() });
  save(PENDING_KEY, list);
  paintPending();
}

function paintPending() {
  const { value } = load(PENDING_KEY, []);
  const list = Array.isArray(value) ? value : [];
  if (!list.length) {
    if (pendingEl) pendingEl.hidden = true;
    return;
  }
  if (pendingEl) pendingEl.hidden = false;
  if (pendingJsonEl) pendingJsonEl.textContent = JSON.stringify(list, null, 2);
}

// ---------------------------------------------------------------------------

async function loadGallery() {
  if (!galleryEl) return;
  try {
    const data = await loadGalleryData();
    const list = data.submissions ?? [];
    if (!list.length) {
      galleryEl.hidden = true;
      return;
    }
    if (galleryEmptyEl) galleryEmptyEl.hidden = true;
    galleryEl.hidden = false;
    galleryEl.innerHTML = list.map(renderGalleryCard).join("");
  } catch (err) {
    console.warn("[release-day] gallery", err);
  }
}

async function loadGalleryData() {
  const live = await fetchJson(PORTAL_ENDPOINT);
  if (live?.submissions?.length) return live;
  const fallback = await fetchJson(STATIC_GALLERY_ENDPOINT);
  return fallback ?? { submissions: [] };
}

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[release-day] ${url}`, err);
    return null;
  }
}

function renderGalleryCard(s) {
  return `
    <li>
      <a class="card" href="${escapeAttr(s.url)}" target="_blank" rel="noopener">
        <span class="card__num">${escapeHTML(s.what ?? "")}</span>
        <h3 class="card__title">${escapeHTML(s.name ?? "Anonymous")}</h3>
        <p class="card__body">${escapeHTML(s.why ?? "")}</p>
        <span class="card__cta">Open →</span>
      </a>
    </li>
  `;
}

// ---------------------------------------------------------------------------

let flashTimer;
function flash(msg) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    statusEl.textContent = "";
  }, 4000);
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
