// /widgets/selector — drag-drop set-list of "records" pulled from the
// talk's quote wall, the lineage beats, and the slide titles. Hit play and
// each record gets its own ~6-second moment in the player. State persists
// to localStorage and serializes to the URL hash for sharing.

import { load, save, debounceSave } from "/js/common/storage.js";
import { audioPlayer } from "/js/common/audio-player.js";

const STORAGE_KEY = "selector:queue";
const READ_BASE_MS = 1800;
const READ_PER_CHAR_MS = 35;

const crateEl = document.getElementById("sel-crate");
const queueEl = document.getElementById("sel-queue");
const statusEl = document.getElementById("sel-status");
const playerEl = document.getElementById("sel-player");
const playerTag = document.getElementById("sel-player-tag");
const playerBody = document.getElementById("sel-player-body");
const playerMeta = document.getElementById("sel-player-meta");
const playerBar = document.getElementById("sel-player-bar");

let allRecords = [];
let activeFilter = "all";
let queue = []; // array of record ids
let player = {
  idx: -1,
  timer: null,
  raf: null,
  revealRaf: null,
  started: 0,
  duration: 0,
  remaining: 0,
  paused: false,
  wordSpans: [],
  audioListener: null,
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const debouncedSave = debounceSave(STORAGE_KEY, 250);

main();

async function main() {
  try {
    const [qRes, lRes, sRes] = await Promise.all([
      fetch("/data/quotes.json"),
      fetch("/data/lineage.json"),
      fetch("/data/slides.json"),
    ]);
    const quotes = qRes.ok ? await qRes.json() : { quotes: [] };
    const lineage = lRes.ok ? await lRes.json() : { beats: [] };
    const slides = sRes.ok ? await sRes.json() : { slides: [] };
    allRecords = buildRecords(quotes, lineage, slides);
  } catch (err) {
    crateEl.innerHTML = `<li class="kicker">data unavailable: ${escapeHTML(err.message || err)}</li>`;
    return;
  }

  hydrateQueueFromHash() || hydrateQueueFromStorage();
  renderCrate();
  renderQueue();
  bindFilters();
  bindActions();
  bindShortcuts();
  // fire-and-forget; selector keeps working if cues fail to load
  audioPlayer.ensureLoaded();
}

function buildRecords(quotes, lineage, slides) {
  const out = [];
  (quotes.quotes || []).forEach((q) => {
    out.push({
      id: `quote:${q.id}`,
      kind: "quote",
      tag: `Slide ${q.slide ?? "?"} · ${q.act || ""}`,
      title: q.slideTitle || `Slide ${q.slide}`,
      body: q.text,
      slideId: q.slideId || null,
    });
  });
  (lineage.beats || []).forEach((b) => {
    out.push({
      id: `beat:${b.id}`,
      kind: "beat",
      tag: `${b.year} · ${b.era}`,
      title: b.title,
      body: b.body,
      slideId: null,
    });
  });
  (slides.slides || []).forEach((s) => {
    if (!s.title) return;
    out.push({
      id: `slide:${s.id}`,
      kind: "slide",
      tag: `Slide ${s.n} · ${s.act || ""}`,
      title: s.title,
      body: s.note ? `${s.title} — ${s.note}` : s.title,
      slideId: s.id,
    });
  });
  return out;
}

// ---------------------------------------------------------------------------

function renderCrate() {
  const filtered = allRecords.filter(
    (r) => activeFilter === "all" || r.kind === activeFilter
  );
  crateEl.innerHTML = "";
  if (!filtered.length) {
    crateEl.innerHTML = `<li class="kicker">no records match this filter</li>`;
    return;
  }
  for (const r of filtered) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sel-record";
    btn.draggable = true;
    btn.dataset.id = r.id;
    btn.innerHTML = `
      <span class="sel-record__tag">${escapeHTML(r.tag)}</span>
      <span class="sel-record__title">${escapeHTML(r.title)}</span>
      <span class="sel-record__body">${escapeHTML(r.body)}</span>
    `;
    btn.addEventListener("click", () => addToQueue(r.id));
    btn.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", r.id);
      e.dataTransfer.effectAllowed = "copy";
    });
    li.appendChild(btn);
    crateEl.appendChild(li);
  }
}

function bindFilters() {
  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeFilter = btn.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((b) =>
        b.setAttribute("aria-pressed", String(b === btn))
      );
      renderCrate();
    });
  });
}

// ---------------------------------------------------------------------------

function renderQueue() {
  queueEl.innerHTML = "";
  queueEl.dataset.empty = String(queue.length === 0);
  queue.forEach((id, idx) => {
    const r = allRecords.find((x) => x.id === id);
    if (!r) return;
    const li = document.createElement("li");
    li.className = "sel-q";
    if (player.idx === idx) li.dataset.active = "true";
    li.innerHTML = `
      <span class="sel-q__num">${idx + 1}</span>
      <div class="sel-q__body">
        <strong>${escapeHTML(r.title)}</strong>
        ${escapeHTML(r.body)}
      </div>
      <span class="sel-q__moves">
        <button type="button" class="sel-q__move" data-move="up" aria-label="Move up">↑</button>
        <button type="button" class="sel-q__move" data-move="down" aria-label="Move down">↓</button>
        <button type="button" class="sel-q__remove" aria-label="Remove">✕</button>
      </span>
    `;
    li.querySelector('[data-move="up"]').disabled = idx === 0;
    li.querySelector('[data-move="down"]').disabled = idx === queue.length - 1;
    li.querySelector('[data-move="up"]').addEventListener("click", () => move(idx, -1));
    li.querySelector('[data-move="down"]').addEventListener("click", () => move(idx, 1));
    li.querySelector(".sel-q__remove").addEventListener("click", () => removeAt(idx));
    queueEl.appendChild(li);
  });

  queueEl.addEventListener("dragover", queueDragOver);
  queueEl.addEventListener("dragleave", queueDragLeave);
  queueEl.addEventListener("drop", queueDrop);
}

function queueDragOver(e) {
  e.preventDefault();
  queueEl.dataset.dropTarget = "true";
}
function queueDragLeave() {
  delete queueEl.dataset.dropTarget;
}
function queueDrop(e) {
  e.preventDefault();
  delete queueEl.dataset.dropTarget;
  const id = e.dataTransfer.getData("text/plain");
  if (id) addToQueue(id);
}

function addToQueue(id) {
  if (!allRecords.find((r) => r.id === id)) return;
  queue.push(id);
  persist();
  renderQueue();
  flash(`added ${queue.length} record${queue.length === 1 ? "" : "s"} on the set`);
}

function removeAt(idx) {
  queue.splice(idx, 1);
  if (player.idx >= queue.length) stopPlayback();
  persist();
  renderQueue();
}

function move(idx, delta) {
  const next = idx + delta;
  if (next < 0 || next >= queue.length) return;
  [queue[idx], queue[next]] = [queue[next], queue[idx]];
  persist();
  renderQueue();
}

function persist() {
  debouncedSave(queue);
}

// ---------------------------------------------------------------------------

function bindActions() {
  document.querySelector('[data-action="play"]').addEventListener("click", startPlayback);
  document.querySelector('[data-action="stop"]').addEventListener("click", stopPlayback);
  document.querySelector('[data-action="shuffle"]').addEventListener("click", shuffleQueue);
  document.querySelector('[data-action="share"]').addEventListener("click", copyShareLink);
  document.querySelector('[data-action="export"]').addEventListener("click", exportSet);
  document.querySelector('[data-action="reset"]').addEventListener("click", resetSet);

  playerEl.addEventListener("click", () => {
    if (playerEl.dataset.state === "playing") revealAllWords();
  });
  document.addEventListener("keydown", (e) => {
    if (e.code !== "Space") return;
    if (playerEl.dataset.state !== "playing") return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    e.preventDefault();
    revealAllWords();
  });
}

function bindShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    switch (e.key) {
      case " ":
      case "Spacebar":
        e.preventDefault();
        togglePlayPause();
        break;
      case "ArrowRight":
        if (player.idx < 0) return;
        e.preventDefault();
        nextRecord();
        break;
      case "ArrowLeft":
        if (player.idx <= 0) return;
        e.preventDefault();
        prevRecord();
        break;
      case "Escape":
        if (player.idx < 0) return;
        e.preventDefault();
        stopPlayback();
        break;
    }
  });
}

function startPlayback() {
  if (!queue.length) {
    flash("build a set list first");
    return;
  }
  stopPlayback();
  playRecord(0);
}

function playRecord(idx) {
  if (idx >= queue.length) {
    stopPlayback();
    flash("set complete");
    return;
  }
  player.idx = idx;
  const r = allRecords.find((x) => x.id === queue[idx]);
  if (!r) {
    playRecord(idx + 1);
    return;
  }
  playerEl.dataset.state = "playing";
  delete playerEl.dataset.audio;
  playerTag.textContent = `${idx + 1}/${queue.length} · ${r.tag}`;
  playerMeta.textContent = r.title;

  // re-render queue to highlight active row
  renderQueue();

  tryAudioFor(r, idx);
}

function tryAudioFor(r, idx) {
  // detach any prior advance-listener before stopping the previous track
  detachAudioListener();
  audioPlayer.stop();

  const slideId = r.slideId;
  const hasCue = slideId && audioPlayer.hasAudio(slideId);

  if (!hasCue) {
    startTextTimer(r, idx);
    return;
  }

  audioPlayer.play(slideId).then((ok) => {
    // Only act if we're still on the same record
    if (player.idx !== idx) return;
    if (!ok) {
      startTextTimer(r, idx);
      return;
    }
    playerEl.dataset.audio = "true";
    bindAudioAdvance(idx);
    tickAudioBar();
  });
}

function startTextTimer(r, idx) {
  const duration = Math.min(12000, READ_BASE_MS + READ_PER_CHAR_MS * (r.body || "").length);
  player.started = performance.now();
  player.duration = duration;
  player.remaining = duration;
  player.paused = false;
  renderRevealBody(r.body || "");
  tickBar();
  startReveal(duration);
  player.timer = setTimeout(() => playRecord(idx + 1), duration);
}

function bindAudioAdvance(idx) {
  const onChange = (ev) => {
    if (player.idx !== idx) return;
    const state = ev.detail && ev.detail.state;
    // statechange fires "idle" on ended; "error" on failure — both advance
    if (state === "idle" || state === "error") {
      detachAudioListener();
      playRecord(idx + 1);
    }
  };
  player.audioListener = onChange;
  audioPlayer.addEventListener("statechange", onChange);
  // Fallback: if audio stalls, advance after the cue's known length + buffer.
  const r = allRecords.find((x) => x.id === queue[idx]);
  const cue = r && r.slideId ? audioPlayer.cueFor(r.slideId) : null;
  const cap = cue && cue.length ? Math.min(120000, cue.length + 2000) : 60000;
  player.timer = setTimeout(() => {
    if (player.idx !== idx) return;
    detachAudioListener();
    playRecord(idx + 1);
  }, cap);
}

function detachAudioListener() {
  if (player.audioListener) {
    audioPlayer.removeEventListener("statechange", player.audioListener);
    player.audioListener = null;
  }
}

function tickAudioBar() {
  cancelAnimationFrame(player.raf);
  const r = allRecords.find((x) => x.id === queue[player.idx]);
  const cue = r && r.slideId ? audioPlayer.cueFor(r.slideId) : null;
  const total = cue && cue.length ? cue.length : 0;
  if (!total) return;
  player.started = performance.now();
  const step = () => {
    if (audioPlayer.state !== "playing") return;
    const elapsed = performance.now() - player.started;
    const pct = Math.min(100, (elapsed / total) * 100);
    playerBar.style.width = `${pct}%`;
    if (elapsed < total) {
      player.raf = requestAnimationFrame(step);
    }
  };
  player.raf = requestAnimationFrame(step);
}

function pausePlayback() {
  if (player.idx < 0 || player.paused) return;
  clearTimeout(player.timer);
  cancelAnimationFrame(player.raf);
  cancelAnimationFrame(player.revealRaf);
  player.timer = null;
  player.raf = null;
  player.revealRaf = null;
  const elapsed = performance.now() - player.started;
  player.remaining = Math.max(0, player.duration - elapsed);
  player.paused = true;
  playerEl.dataset.state = "paused";
  flash("paused");
}

function resumePlayback() {
  if (player.idx < 0 || !player.paused) return;
  player.paused = false;
  player.started = performance.now() - (player.duration - player.remaining);
  playerEl.dataset.state = "playing";
  tickBar();
  startReveal(player.remaining);
  const idx = player.idx;
  player.timer = setTimeout(() => playRecord(idx + 1), player.remaining);
  flash("resumed");
}

function togglePlayPause() {
  if (player.idx < 0) {
    startPlayback();
    return;
  }
  if (player.paused) resumePlayback();
  else pausePlayback();
}

function nextRecord() {
  if (player.idx < 0) return;
  clearTimeout(player.timer);
  cancelAnimationFrame(player.raf);
  cancelAnimationFrame(player.revealRaf);
  playRecord(player.idx + 1);
}

function prevRecord() {
  if (player.idx <= 0) return;
  clearTimeout(player.timer);
  cancelAnimationFrame(player.raf);
  cancelAnimationFrame(player.revealRaf);
  playRecord(player.idx - 1);
}

function renderRevealBody(text) {
  playerBody.innerHTML = "";
  player.wordSpans = [];
  // Split on whitespace runs while preserving them, so layout matches final text.
  const tokens = text.match(/\S+|\s+/g) || [];
  for (const tok of tokens) {
    if (/^\s+$/.test(tok)) {
      playerBody.appendChild(document.createTextNode(tok));
      continue;
    }
    const span = document.createElement("span");
    span.className = "sel__player-word";
    span.textContent = tok;
    playerBody.appendChild(span);
    player.wordSpans.push(span);
  }
  if (reduceMotion.matches) {
    revealAllWords();
  }
}

function startReveal(duration) {
  cancelAnimationFrame(player.revealRaf);
  if (reduceMotion.matches || !player.wordSpans.length) {
    revealAllWords();
    return;
  }
  // Reveal words across ~85% of the window so the last word lands before the next record.
  const revealWindow = Math.max(1, duration * 0.85);
  const total = player.wordSpans.length;
  const startedAt = player.started;
  let revealed = 0;
  const step = () => {
    const elapsed = performance.now() - startedAt;
    const target = Math.min(total, Math.ceil((elapsed / revealWindow) * total));
    while (revealed < target) {
      player.wordSpans[revealed].dataset.shown = "true";
      revealed++;
    }
    if (revealed < total) {
      player.revealRaf = requestAnimationFrame(step);
    }
  };
  player.revealRaf = requestAnimationFrame(step);
}

function revealAllWords() {
  cancelAnimationFrame(player.revealRaf);
  player.revealRaf = null;
  for (const span of player.wordSpans) span.dataset.shown = "true";
}

function tickBar() {
  cancelAnimationFrame(player.raf);
  const step = () => {
    if (!player.duration) return;
    const elapsed = performance.now() - player.started;
    const pct = Math.min(100, (elapsed / player.duration) * 100);
    playerBar.style.width = `${pct}%`;
    if (elapsed < player.duration) {
      player.raf = requestAnimationFrame(step);
    }
  };
  player.raf = requestAnimationFrame(step);
}

function stopPlayback() {
  clearTimeout(player.timer);
  cancelAnimationFrame(player.raf);
  cancelAnimationFrame(player.revealRaf);
  detachAudioListener();
  audioPlayer.stop();
  player.idx = -1;
  player.timer = null;
  player.raf = null;
  player.paused = false;
  player.remaining = 0;
  player.duration = 0;
  player.revealRaf = null;
  player.wordSpans = [];
  playerEl.dataset.state = "idle";
  delete playerEl.dataset.audio;
  playerTag.textContent = "";
  playerBody.textContent = "";
  playerMeta.textContent = "";
  playerBar.style.width = "0%";
  renderQueue();
}

function shuffleQueue() {
  if (queue.length < 2) return;
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  persist();
  renderQueue();
  flash("shuffled");
}

async function copyShareLink() {
  if (!queue.length) {
    flash("build a set first");
    return;
  }
  const url = `${window.location.origin}${window.location.pathname}#s=${encode(queue)}`;
  try {
    await navigator.clipboard.writeText(url);
    flash("share link copied");
  } catch {
    flash("copy failed — link in console");
    console.log(url);
  }
}

function exportSet() {
  if (!queue.length) {
    flash("build a set first");
    return;
  }
  const lines = [`# Selector set — ${new Date().toISOString().slice(0, 10)}`, ""];
  queue.forEach((id, i) => {
    const r = allRecords.find((x) => x.id === id);
    if (!r) return;
    lines.push(`${i + 1}. **${r.title}** _(${r.tag})_`);
    lines.push(`   > ${r.body}`);
    lines.push("");
  });
  lines.push("---");
  lines.push("");
  lines.push("Built on punkrockai.com / selector. Generation is free; the order is the work.");
  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `selector-set-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  flash("exported .md");
}

function resetSet() {
  if (!queue.length) return;
  if (!window.confirm("Clear the whole set?")) return;
  stopPlayback();
  queue = [];
  persist();
  renderQueue();
  flash("set cleared");
}

// ---------------------------------------------------------------------------

function hydrateQueueFromStorage() {
  const stored = load(STORAGE_KEY, []);
  if (Array.isArray(stored.value)) queue = stored.value.filter((id) => typeof id === "string");
  return queue.length > 0;
}

function hydrateQueueFromHash() {
  const m = (window.location.hash || "").match(/^#s=(.+)$/);
  if (!m) return false;
  try {
    const decoded = decode(m[1]);
    if (!Array.isArray(decoded)) return false;
    queue = decoded.filter((id) => typeof id === "string");
    persist();
    history.replaceState(null, "", window.location.pathname);
    return true;
  } catch {
    return false;
  }
}

function encode(arr) {
  return base64UrlEncode(JSON.stringify(arr));
}

function decode(str) {
  return JSON.parse(base64UrlDecode(str));
}

function base64UrlEncode(s) {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(s) {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return decodeURIComponent(escape(atob(padded)));
}

function flash(msg) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  clearTimeout(flash._t);
  flash._t = setTimeout(() => {
    if (statusEl) statusEl.textContent = "";
  }, 2200);
}

function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
