// /talk — hero waveform visualizer.
// Owns its own <audio> element pointing at /public/audio/talk.mp3. When the
// user hits play, lazily wires a Web Audio AnalyserNode and animates the
// canvas on requestAnimationFrame. When audio is missing or the user prefers
// reduced motion, renders a deterministic static bar pattern so the UI still
// reads as intentional.
//
// No external libs. Vanilla JS.

const AUDIO_SRC = "/public/audio/talk.mp3";
const BAR_COUNT = 96;
const BAR_GAP = 2;

const root = document.getElementById("talk-waveform");
if (root) init(root);

function init(container) {
  const audio = container.querySelector("audio");
  const canvas = container.querySelector("canvas");
  const status = container.querySelector("[data-waveform-status]");
  if (!audio || !canvas) return;

  const ctx2d = canvas.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const state = {
    audioCtx: null,
    analyser: null,
    source: null,
    rafId: 0,
    staticPeaks: makeStaticPeaks(BAR_COUNT),
    audioOk: true,
  };

  resizeCanvas(canvas);
  drawStatic(ctx2d, canvas, state.staticPeaks);

  window.addEventListener("resize", () => {
    resizeCanvas(canvas);
    if (audio.paused || reducedMotion.matches || !state.audioOk) {
      drawStatic(ctx2d, canvas, state.staticPeaks);
    }
  });

  audio.addEventListener("error", () => {
    state.audioOk = false;
    if (status) status.textContent = "Audio not yet posted — placeholder waveform.";
    drawStatic(ctx2d, canvas, state.staticPeaks);
  });

  audio.addEventListener("play", () => {
    if (!state.audioOk) return;
    ensureAnalyser(audio, state);
    if (reducedMotion.matches) {
      drawStatic(ctx2d, canvas, state.staticPeaks);
      return;
    }
    startAnimating(ctx2d, canvas, state);
  });

  audio.addEventListener("pause", () => {
    stopAnimating(state);
    drawStatic(ctx2d, canvas, state.staticPeaks);
  });

  audio.addEventListener("ended", () => {
    stopAnimating(state);
    drawStatic(ctx2d, canvas, state.staticPeaks);
  });

  reducedMotion.addEventListener?.("change", (e) => {
    if (e.matches) {
      stopAnimating(state);
      drawStatic(ctx2d, canvas, state.staticPeaks);
    } else if (!audio.paused && state.audioOk) {
      startAnimating(ctx2d, canvas, state);
    }
  });

  // Click-to-scrub on the canvas (mirrors the native audio control).
  canvas.addEventListener("click", (e) => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = Math.max(0, Math.min(audio.duration, ratio * audio.duration));
  });
}

function ensureAnalyser(audio, state) {
  if (state.analyser) {
    if (state.audioCtx.state === "suspended") state.audioCtx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    state.audioCtx = new AC();
    state.source = state.audioCtx.createMediaElementSource(audio);
    state.analyser = state.audioCtx.createAnalyser();
    state.analyser.fftSize = 256;
    state.source.connect(state.analyser);
    state.analyser.connect(state.audioCtx.destination);
  } catch (err) {
    state.analyser = null;
    console.warn("[talk-waveform]", err);
  }
}

function startAnimating(ctx2d, canvas, state) {
  if (!state.analyser) return;
  const bins = new Uint8Array(state.analyser.frequencyBinCount);
  const tick = () => {
    state.analyser.getByteFrequencyData(bins);
    drawLive(ctx2d, canvas, bins);
    state.rafId = requestAnimationFrame(tick);
  };
  cancelAnimationFrame(state.rafId);
  state.rafId = requestAnimationFrame(tick);
}

function stopAnimating(state) {
  if (state.rafId) {
    cancelAnimationFrame(state.rafId);
    state.rafId = 0;
  }
}

function resizeCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
}

function drawStatic(ctx2d, canvas, peaks) {
  const { width, height } = canvas;
  ctx2d.clearRect(0, 0, width, height);
  const slot = width / peaks.length;
  const barW = Math.max(1, slot - BAR_GAP);
  const mid = height / 2;
  ctx2d.fillStyle = getAccent();
  for (let i = 0; i < peaks.length; i++) {
    const h = peaks[i] * height * 0.9;
    ctx2d.fillRect(i * slot, mid - h / 2, barW, h);
  }
}

function drawLive(ctx2d, canvas, bins) {
  const { width, height } = canvas;
  ctx2d.clearRect(0, 0, width, height);
  const step = Math.max(1, Math.floor(bins.length / BAR_COUNT));
  const slot = width / BAR_COUNT;
  const barW = Math.max(1, slot - BAR_GAP);
  const mid = height / 2;
  ctx2d.fillStyle = getAccent();
  for (let i = 0; i < BAR_COUNT; i++) {
    const v = bins[i * step] / 255;
    const h = Math.max(2, v * height * 0.95);
    ctx2d.fillRect(i * slot, mid - h / 2, barW, h);
  }
}

function getAccent() {
  const styles = getComputedStyle(document.documentElement);
  return styles.getPropertyValue("--accent").trim() || "#ff2d55";
}

// Deterministic peaks so the static fallback looks intentional, not random.
function makeStaticPeaks(n) {
  const out = new Array(n);
  let seed = 1337;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const envelope = Math.sin(Math.PI * t) * 0.6 + 0.25;
    const jitter = rand() * 0.35;
    out[i] = Math.min(1, Math.max(0.08, envelope + jitter - 0.15));
  }
  return out;
}
