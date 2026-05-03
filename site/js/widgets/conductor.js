// /widgets/conductor — load conductor-instruments.json, render N instruments
// as parallel rows. The user (the conductor) plays/pauses each one. Each
// instrument fills a tempo bar; on completion it reveals its sample output.
// Visual metaphor: parallel parts, one baton, taste stays with you.

const ledeEl = document.getElementById("conductor-lede");
const frameEl = document.getElementById("conductor-frame");
const statusEl = document.getElementById("conductor-status");
const listEl = document.getElementById("instruments");
const closingTitleEl = document.getElementById("closing-title");
const closingBodyEl = document.getElementById("closing-body");
const closingCiteEl = document.getElementById("closing-cite");

const state = new Map();

main();

async function main() {
  try {
    const res = await fetch("/data/conductor-instruments.json");
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const data = await res.json();

    if (ledeEl && data.lede) ledeEl.textContent = data.lede;
    if (frameEl && data.frame) frameEl.textContent = data.frame;
    if (closingTitleEl && data.closing?.title) {
      closingTitleEl.textContent = data.closing.title;
    }
    if (closingBodyEl && data.closing?.body) {
      closingBodyEl.textContent = data.closing.body;
    }
    if (closingCiteEl && data.closing?.cite) {
      closingCiteEl.textContent = "↳ " + data.closing.cite;
    }

    renderInstruments(Array.isArray(data.instruments) ? data.instruments : []);
    wirePodium();
  } catch (err) {
    if (listEl) {
      listEl.innerHTML = `<li class="kicker">orchestra data unavailable.</li>`;
    }
    console.warn("[conductor]", err);
  }
}

function renderInstruments(instruments) {
  if (!listEl) return;
  listEl.innerHTML = instruments.map(renderInstrument).join("");
  for (const inst of instruments) {
    state.set(inst.id, {
      def: inst,
      playing: false,
      progress: 0,
      done: false,
      raf: null,
      lastTs: 0,
    });
  }
  for (const inst of instruments) {
    wireInstrument(inst.id);
  }
}

function renderInstrument(inst) {
  const id = escapeAttr(inst.id);
  return `
    <li class="instrument" data-id="${id}" data-state="idle">
      <header class="instrument__head">
        <div class="instrument__meta">
          <p class="instrument__role">${escapeHTML(inst.role || "")}</p>
          <h3 class="instrument__name">${escapeHTML(inst.name || inst.id)}</h3>
          <p class="instrument__stack">${escapeHTML(inst.stack || "")}</p>
        </div>
        <div class="instrument__controls">
          <button type="button" class="instrument__btn" data-act="play" aria-label="Play ${escapeAttr(inst.name || inst.id)}">
            <span class="instrument__btn-glyph" aria-hidden="true">&#9654;</span>
            <span class="instrument__btn-text">Play</span>
          </button>
          <button type="button" class="instrument__btn" data-act="pause" aria-label="Pause ${escapeAttr(inst.name || inst.id)}" disabled>
            <span class="instrument__btn-glyph" aria-hidden="true">&#9612;&#9612;</span>
            <span class="instrument__btn-text">Pause</span>
          </button>
        </div>
      </header>
      <div class="instrument__task">
        <p class="instrument__task-label">Score</p>
        <p class="instrument__task-text">${escapeHTML(inst.task || "")}</p>
      </div>
      <div class="instrument__bar" aria-hidden="true">
        <div class="instrument__bar-fill" data-fill style="width:0%"></div>
        <div class="instrument__bar-pulse" data-pulse></div>
      </div>
      <div class="instrument__output" data-output hidden>
        <p class="instrument__output-label">Sample output</p>
        <blockquote class="instrument__output-text">${escapeHTML(inst.output || "")}</blockquote>
      </div>
    </li>
  `;
}

function wireInstrument(id) {
  const root = listEl.querySelector(`.instrument[data-id="${cssEscape(id)}"]`);
  if (!root) return;
  root.querySelector('[data-act="play"]').addEventListener("click", () => play(id));
  root.querySelector('[data-act="pause"]').addEventListener("click", () => pause(id));
}

function wirePodium() {
  document.querySelectorAll('[data-action]').forEach((btn) => {
    const action = btn.getAttribute("data-action");
    btn.addEventListener("click", () => {
      if (action === "play-all") playAll();
      else if (action === "pause-all") pauseAll();
      else if (action === "reset") resetAll();
    });
  });
}

function play(id) {
  const s = state.get(id);
  if (!s || s.playing || s.done) return;
  s.playing = true;
  s.lastTs = 0;
  setInstrumentState(id, "playing");
  setStatus(`Cue: ${s.def.name}.`);
  tick(id);
}

function pause(id) {
  const s = state.get(id);
  if (!s || !s.playing) return;
  s.playing = false;
  if (s.raf) cancelAnimationFrame(s.raf);
  s.raf = null;
  setInstrumentState(id, "paused");
  setStatus(`Hold: ${s.def.name}.`);
}

function tick(id) {
  const s = state.get(id);
  if (!s || !s.playing) return;
  s.raf = requestAnimationFrame((ts) => {
    if (!s.lastTs) s.lastTs = ts;
    const dt = ts - s.lastTs;
    s.lastTs = ts;
    const tempo = Math.max(400, Number(s.def.tempo) || 1800);
    s.progress = Math.min(1, s.progress + dt / tempo);
    paintBar(id, s.progress);
    if (s.progress >= 1) {
      s.playing = false;
      s.done = true;
      s.raf = null;
      setInstrumentState(id, "done");
      revealOutput(id);
      setStatus(`${s.def.name} delivered.`);
      return;
    }
    tick(id);
  });
}

function paintBar(id, progress) {
  const root = listEl.querySelector(`.instrument[data-id="${cssEscape(id)}"]`);
  if (!root) return;
  const fill = root.querySelector("[data-fill]");
  if (fill) fill.style.width = `${Math.round(progress * 100)}%`;
}

function revealOutput(id) {
  const root = listEl.querySelector(`.instrument[data-id="${cssEscape(id)}"]`);
  if (!root) return;
  const out = root.querySelector("[data-output]");
  if (out) out.hidden = false;
}

function setInstrumentState(id, value) {
  const root = listEl.querySelector(`.instrument[data-id="${cssEscape(id)}"]`);
  if (!root) return;
  root.setAttribute("data-state", value);
  const playBtn = root.querySelector('[data-act="play"]');
  const pauseBtn = root.querySelector('[data-act="pause"]');
  if (value === "playing") {
    playBtn.disabled = true;
    pauseBtn.disabled = false;
  } else if (value === "paused" || value === "idle") {
    playBtn.disabled = false;
    pauseBtn.disabled = true;
  } else if (value === "done") {
    playBtn.disabled = true;
    pauseBtn.disabled = true;
  }
}

function playAll() {
  let started = 0;
  for (const id of state.keys()) {
    const s = state.get(id);
    if (s.done || s.playing) continue;
    play(id);
    started += 1;
  }
  if (started > 0) setStatus(`Downbeat. ${started} instrument${started === 1 ? "" : "s"} in.`);
}

function pauseAll() {
  let held = 0;
  for (const id of state.keys()) {
    const s = state.get(id);
    if (s.playing) {
      pause(id);
      held += 1;
    }
  }
  if (held > 0) setStatus(`Cut. ${held} held.`);
}

function resetAll() {
  for (const id of state.keys()) {
    const s = state.get(id);
    if (s.raf) cancelAnimationFrame(s.raf);
    s.playing = false;
    s.done = false;
    s.progress = 0;
    s.lastTs = 0;
    s.raf = null;
    paintBar(id, 0);
    setInstrumentState(id, "idle");
    const root = listEl.querySelector(`.instrument[data-id="${cssEscape(id)}"]`);
    const out = root && root.querySelector("[data-output]");
    if (out) out.hidden = true;
  }
  setStatus("Stand by.");
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
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

function cssEscape(s) {
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(s);
  return String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
