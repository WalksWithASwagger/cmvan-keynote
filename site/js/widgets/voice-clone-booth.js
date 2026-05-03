// /widgets/voice-clone-booth — record yourself reading a sample script with
// MediaRecorder. Playback in-page. Download the blob. No upload, no clone.
// Educational: shows how few seconds of audio a cloning service really needs.

const SCRIPTS_URL = "/data/voice-clone-scripts.json";
const DEFAULT_DURATION = 30;

const scriptsEl = document.getElementById("vcb-scripts");
const blurbEl = document.getElementById("vcb-script-blurb");
const scriptTextEl = document.getElementById("vcb-script-text");
const durationButtons = Array.from(document.querySelectorAll(".vcb__duration"));
const recordBtn = document.getElementById("vcb-record");
const stopBtn = document.getElementById("vcb-stop");
const timerEl = document.getElementById("vcb-timer");
const statusEl = document.getElementById("vcb-status");
const playbackEl = document.getElementById("vcb-playback");
const audioEl = document.getElementById("vcb-audio");
const downloadEl = document.getElementById("vcb-download");
const discardBtn = document.getElementById("vcb-discard");
const playbackMetaEl = document.getElementById("vcb-playback-meta");
const fallbackEl = document.getElementById("vcb-fallback");
const fallbackMsgEl = document.getElementById("vcb-fallback-msg");

const state = {
  scripts: [],
  selectedScriptId: null,
  duration: DEFAULT_DURATION,
  recorder: null,
  stream: null,
  chunks: [],
  startedAt: 0,
  timerHandle: 0,
  hardStopHandle: 0,
  lastBlobUrl: "",
};

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function showFallback(msg) {
  fallbackEl.hidden = false;
  fallbackMsgEl.textContent = msg;
  recordBtn.disabled = true;
  stopBtn.disabled = true;
}

function pickMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const t of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function extensionFor(mime) {
  if (!mime) return "webm";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "m4a";
  return "webm";
}

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function renderScripts() {
  scriptsEl.innerHTML = "";
  state.scripts.forEach((script, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "vcb__script-btn";
    btn.dataset.scriptId = script.id;
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", idx === 0 ? "true" : "false");
    btn.innerHTML = `
      <span class="vcb__script-title">${script.title}</span>
      <span class="vcb__script-len">${script.text.split(/\s+/).length} words</span>
    `;
    btn.addEventListener("click", () => selectScript(script.id));
    scriptsEl.appendChild(btn);
  });
}

function selectScript(id) {
  state.selectedScriptId = id;
  const script = state.scripts.find((s) => s.id === id);
  if (!script) return;
  blurbEl.textContent = script.blurb;
  scriptTextEl.textContent = script.text;
  scriptsEl.querySelectorAll(".vcb__script-btn").forEach((btn) => {
    const active = btn.dataset.scriptId === id;
    btn.setAttribute("aria-checked", active ? "true" : "false");
    btn.classList.toggle("is-active", active);
  });
}

function setDuration(seconds) {
  state.duration = seconds;
  durationButtons.forEach((btn) => {
    const active = Number(btn.dataset.duration) === seconds;
    btn.setAttribute("aria-pressed", active ? "true" : "false");
    btn.classList.toggle("is-active", active);
  });
}

durationButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (state.recorder && state.recorder.state === "recording") return;
    setDuration(Number(btn.dataset.duration));
  });
});

async function startRecording() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showFallback("This browser doesn't expose getUserMedia. Try a recent Chrome, Firefox, Safari, or Edge.");
    return;
  }
  if (typeof MediaRecorder === "undefined") {
    showFallback("This browser doesn't support MediaRecorder. Try a recent Chrome, Firefox, Safari, or Edge.");
    return;
  }

  setStatus("Asking for mic permission. If your browser blocked this site before, check the address bar.");

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    if (err && err.name === "NotAllowedError") {
      setStatus("Mic permission denied. Nothing recorded. You can re-enable it in browser settings and try again.");
    } else if (err && err.name === "NotFoundError") {
      setStatus("No microphone found on this device.");
    } else {
      setStatus(`Couldn't open the mic: ${err && err.message ? err.message : "unknown error"}.`);
    }
    return;
  }

  const mime = pickMimeType();
  state.chunks = [];
  try {
    state.recorder = mime
      ? new MediaRecorder(state.stream, { mimeType: mime })
      : new MediaRecorder(state.stream);
  } catch (err) {
    setStatus(`Couldn't start the recorder: ${err && err.message ? err.message : "unknown error"}.`);
    stopStream();
    return;
  }

  state.recorder.addEventListener("dataavailable", (event) => {
    if (event.data && event.data.size > 0) state.chunks.push(event.data);
  });
  state.recorder.addEventListener("stop", finalizeRecording);

  state.recorder.start();
  state.startedAt = performance.now();
  recordBtn.dataset.state = "recording";
  recordBtn.querySelector("[data-label]").textContent = "Recording...";
  recordBtn.disabled = true;
  stopBtn.disabled = false;
  setStatus(`Recording. Stops automatically at ${state.duration}s, or hit Stop.`);

  tickTimer();
  state.timerHandle = window.setInterval(tickTimer, 200);
  state.hardStopHandle = window.setTimeout(() => {
    if (state.recorder && state.recorder.state === "recording") stopRecording();
  }, state.duration * 1000);
}

function tickTimer() {
  const elapsed = performance.now() - state.startedAt;
  timerEl.textContent = formatTime(elapsed);
  const target = state.duration * 1000;
  if (elapsed >= target) {
    timerEl.textContent = formatTime(target);
  }
}

function stopRecording() {
  if (state.recorder && state.recorder.state !== "inactive") {
    state.recorder.stop();
  }
}

function stopStream() {
  if (state.stream) {
    state.stream.getTracks().forEach((t) => t.stop());
    state.stream = null;
  }
}

function finalizeRecording() {
  window.clearInterval(state.timerHandle);
  window.clearTimeout(state.hardStopHandle);
  state.timerHandle = 0;
  state.hardStopHandle = 0;

  const mime = state.recorder.mimeType || "audio/webm";
  const blob = new Blob(state.chunks, { type: mime });
  state.chunks = [];
  stopStream();

  if (state.lastBlobUrl) URL.revokeObjectURL(state.lastBlobUrl);
  state.lastBlobUrl = URL.createObjectURL(blob);

  audioEl.src = state.lastBlobUrl;
  const ext = extensionFor(mime);
  downloadEl.href = state.lastBlobUrl;
  downloadEl.setAttribute("download", `voice-sample.${ext}`);
  downloadEl.textContent = `Download .${ext}`;

  const sizeKb = (blob.size / 1024).toFixed(1);
  const elapsed = performance.now() - state.startedAt;
  playbackMetaEl.textContent = `${formatTime(elapsed)} captured · ${sizeKb} KB · ${mime}`;
  playbackEl.hidden = false;

  recordBtn.dataset.state = "idle";
  recordBtn.querySelector("[data-label]").textContent = "Re-record";
  recordBtn.disabled = false;
  stopBtn.disabled = true;
  setStatus("Done. Audio is in this tab only. Download to keep it, or discard.");
}

function discardRecording() {
  if (state.lastBlobUrl) {
    URL.revokeObjectURL(state.lastBlobUrl);
    state.lastBlobUrl = "";
  }
  audioEl.removeAttribute("src");
  audioEl.load();
  playbackEl.hidden = true;
  playbackMetaEl.textContent = "";
  timerEl.textContent = "0:00";
  recordBtn.querySelector("[data-label]").textContent = "Start recording";
  setStatus("Cleared. Ready when you are.");
}

recordBtn.addEventListener("click", () => {
  if (state.recorder && state.recorder.state === "recording") return;
  startRecording();
});
stopBtn.addEventListener("click", stopRecording);
discardBtn.addEventListener("click", discardRecording);

window.addEventListener("beforeunload", () => {
  stopStream();
  if (state.lastBlobUrl) URL.revokeObjectURL(state.lastBlobUrl);
});

async function init() {
  // Capability check up front so the UI tells the truth.
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
    showFallback("This browser is missing MediaRecorder or getUserMedia. The booth needs both.");
  }

  setDuration(DEFAULT_DURATION);

  try {
    const res = await fetch(SCRIPTS_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.scripts = Array.isArray(data.scripts) ? data.scripts : [];
  } catch (err) {
    setStatus(`Couldn't load sample scripts: ${err && err.message ? err.message : "unknown error"}.`);
    return;
  }

  if (state.scripts.length === 0) {
    setStatus("No sample scripts available.");
    return;
  }

  renderScripts();
  selectScript(state.scripts[0].id);
}

init();
