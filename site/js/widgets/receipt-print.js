// /widgets/receipt-print.html — Thermal receipt printer for AI output.
//
// Paste any AI output. We word-wrap it to a 32-character column and reveal
// it one line at a time, like paper feeding out of a thermal receipt
// printer. Optional WebAudio "chrr-chrr" stepper sound plays per line.
//
// No model call. No network. Just a tactile re-render of text the user
// already has.

import { load, save } from "/js/common/storage.js";

const STORAGE_KEY = "rcpp:state";
const SAMPLES_URL = "/data/receipt-samples.json";
const COLUMN_WIDTH = 32; // classic 80mm thermal printer column

const SPEED_MS = {
  fast: 35,
  medium: 90,
  slow: 220,
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state = {
  speed: "medium",
  sound: false,
  samples: [],
  printing: false,
  abort: false,
};

const els = {};

bootstrap();

async function bootstrap() {
  cacheEls();
  hydrate();
  wire();
  paintMeta();
  await loadSamples();
}

function cacheEls() {
  els.input = document.getElementById("rcpp-input");
  els.speed = document.getElementById("rcpp-speed");
  els.sound = document.getElementById("rcpp-sound");
  els.status = document.getElementById("rcpp-status");
  els.samples = document.getElementById("rcpp-samples");
  els.lines = document.querySelector("[data-lines]");
  els.foot = document.querySelector("[data-foot]");
  els.stamp = document.querySelector("[data-stamp]");
  els.time = document.querySelector("[data-time]");
}

function hydrate() {
  const { value } = load(STORAGE_KEY, null);
  if (value && typeof value === "object") {
    if (value.speed in SPEED_MS) state.speed = value.speed;
    if (typeof value.sound === "boolean") state.sound = value.sound;
  }
  if (els.speed) els.speed.value = state.speed;
  if (els.sound) els.sound.checked = state.sound;
}

function persist() {
  save(STORAGE_KEY, { speed: state.speed, sound: state.sound });
}

function wire() {
  document
    .querySelector('[data-action="print"]')
    ?.addEventListener("click", onPrint);
  document
    .querySelector('[data-action="stop"]')
    ?.addEventListener("click", onStop);
  document
    .querySelector('[data-action="clear"]')
    ?.addEventListener("click", onClear);

  els.speed?.addEventListener("change", () => {
    state.speed = els.speed.value in SPEED_MS ? els.speed.value : "medium";
    persist();
  });
  els.sound?.addEventListener("change", () => {
    state.sound = !!els.sound.checked;
    persist();
  });
}

// ---------------------------------------------------------------------------
// Samples
// ---------------------------------------------------------------------------

async function loadSamples() {
  if (!els.samples) return;
  try {
    const res = await fetch(SAMPLES_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.samples = Array.isArray(data?.samples) ? data.samples : [];
    renderSamples();
  } catch (err) {
    console.warn("[receipt-print] sample load failed:", err);
    els.samples.innerHTML =
      '<li class="rcpp-sample__error">samples unavailable - paste your own</li>';
  }
}

function renderSamples() {
  if (!els.samples) return;
  els.samples.innerHTML = "";
  for (const s of state.samples) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rcpp-sample";
    btn.innerHTML = `
      <span class="rcpp-sample__label">${escapeHTML(s.label || s.id)}</span>
      <span class="rcpp-sample__prompt">prompt: ${escapeHTML(s.prompt || "(none)")}</span>
    `;
    btn.addEventListener("click", () => {
      if (els.input) els.input.value = s.output || "";
      flash("sample loaded - press print");
      els.input?.focus();
    });
    li.appendChild(btn);
    els.samples.appendChild(li);
  }
}

// ---------------------------------------------------------------------------
// Print
// ---------------------------------------------------------------------------

async function onPrint() {
  if (state.printing) {
    flash("already printing - stop first");
    return;
  }
  const text = (els.input?.value || "").trim();
  if (!text) {
    flash("paste something first");
    return;
  }
  const lines = wrapLines(text, COLUMN_WIDTH);
  if (!lines.length) {
    flash("nothing to print");
    return;
  }
  await printLines(lines);
}

function onStop() {
  if (!state.printing) return;
  state.abort = true;
  flash("stopping...");
}

function onClear() {
  if (state.printing) {
    state.abort = true;
  }
  if (els.input) els.input.value = "";
  resetReceipt();
  flash("cleared");
}

async function printLines(lines) {
  resetReceipt();
  paintMeta();

  state.printing = true;
  state.abort = false;
  flash("printing...");

  const delay = SPEED_MS[state.speed] || SPEED_MS.medium;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const sound = state.sound ? new PrinterSound() : null;

  for (const line of lines) {
    if (state.abort) break;
    appendLine(line);
    if (sound && line.length) sound.tick();
    if (!reduced) {
      // small per-line wait so the reveal is paced like a printer feed
      await wait(delay);
    }
  }

  if (sound) sound.dispose();

  if (els.foot) els.foot.hidden = state.abort;
  state.printing = false;
  flash(state.abort ? "stopped" : "done");
}

function resetReceipt() {
  if (els.lines) els.lines.innerHTML = "";
  if (els.foot) els.foot.hidden = true;
}

function appendLine(text) {
  if (!els.lines) return;
  const p = document.createElement("p");
  if (text === "") {
    p.className = "rcpp-receipt__line rcpp-receipt__line--blank";
    p.innerHTML = "&nbsp;";
  } else {
    p.className = "rcpp-receipt__line";
    p.textContent = text;
  }
  els.lines.appendChild(p);
  // keep newest line in view inside the receipt
  p.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

// ---------------------------------------------------------------------------
// Word wrap to fixed column width. Preserves blank lines, breaks long words.
// ---------------------------------------------------------------------------

function wrapLines(text, width) {
  const out = [];
  const paragraphs = String(text).replace(/\r\n/g, "\n").split("\n");
  for (const para of paragraphs) {
    if (para.trim() === "") {
      out.push("");
      continue;
    }
    const words = para.split(/\s+/).filter(Boolean);
    let current = "";
    for (const word of words) {
      if (word.length > width) {
        if (current) {
          out.push(current);
          current = "";
        }
        for (let i = 0; i < word.length; i += width) {
          const chunk = word.slice(i, i + width);
          if (chunk.length === width) {
            out.push(chunk);
          } else {
            current = chunk;
          }
        }
        continue;
      }
      const tentative = current ? current + " " + word : word;
      if (tentative.length > width) {
        out.push(current);
        current = word;
      } else {
        current = tentative;
      }
    }
    if (current) out.push(current);
  }
  return out;
}

// ---------------------------------------------------------------------------
// WebAudio "chrr-chrr" stepper sound. Built per-print so a stopped print
// can release its AudioContext cleanly.
// ---------------------------------------------------------------------------

class PrinterSound {
  constructor() {
    this.ctx = null;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) this.ctx = new Ctor();
    } catch (err) {
      console.warn("[receipt-print] audio unavailable:", err);
    }
  }
  tick() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dur = 0.045;
    // short noise burst -> stepper-motor "chrr"
    const buf = this.ctx.createBuffer(
      1,
      Math.floor(this.ctx.sampleRate * dur),
      this.ctx.sampleRate,
    );
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.value = 1800;
    filt.Q.value = 6;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt).connect(gain).connect(this.ctx.destination);
    src.start(t);
    src.stop(t + dur);
  }
  dispose() {
    if (!this.ctx) return;
    try {
      this.ctx.close();
    } catch (_err) {
      // ignore
    }
    this.ctx = null;
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function paintMeta() {
  const now = new Date();
  if (els.stamp) els.stamp.textContent = now.toISOString().slice(0, 10);
  if (els.time) els.time.textContent = now.toTimeString().slice(0, 5);
}

function flash(msg) {
  if (!els.status) return;
  els.status.textContent = msg;
  clearTimeout(flash._t);
  flash._t = setTimeout(() => {
    if (els.status) els.status.textContent = "";
  }, 3000);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
