// /widgets/detournement.html — image annotator. Drop an image (upload or
// URL paste), then drop zine-style annotations on top: text, redactions,
// halftone fills, accent splashes. Drag to position with pointer events.
// Export the whole canvas as a flattened PNG via window.htmlToImage (loaded
// from the CDN as a non-module script).
//
// Annotations are ephemeral — there is no persistence layer. The only state
// that crosses a reload is the image itself, and that's by design: a
// détournement should be a single sitting.

const TOOLS = ["text", "redaction", "halftone", "splash"];
const TOOL_PLACEHOLDER = {
  text: "Type your rebuttal…",
};

let currentTool = "text";
let activeAnno = null;
let imageLoaded = false;
let imageIsTainted = false; // true when URL paste hits a non-CORS server
let annoIdSeq = 0;

const els = {};

init();

// ---------------------------------------------------------------------------

function init() {
  els.canvas = document.getElementById("det-canvas");
  els.layer = document.getElementById("det-layer");
  els.img = document.getElementById("det-img");
  els.empty = document.getElementById("det-empty");
  els.file = document.getElementById("det-file");
  els.url = document.getElementById("det-url");
  els.status = document.getElementById("det-status");

  if (!els.canvas || !els.layer || !els.img) return;

  wireToolbar();
  wireLoaders();
  wireCanvas();
  wireActions();
  wireKeyboard();
}

// ---------------------------------------------------------------------------
// TOOLBAR
// ---------------------------------------------------------------------------

function wireToolbar() {
  for (const btn of document.querySelectorAll(".det-tool[data-tool]")) {
    btn.addEventListener("click", () => setTool(btn.dataset.tool));
  }
  document
    .querySelector('[data-action="clear-overlays"]')
    ?.addEventListener("click", clearOverlays);
}

function setTool(tool) {
  if (!TOOLS.includes(tool)) return;
  currentTool = tool;
  els.canvas.dataset.tool = tool;
  for (const btn of document.querySelectorAll(".det-tool[data-tool]")) {
    const active = btn.dataset.tool === tool;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  }
}

function clearOverlays() {
  if (!els.layer) return;
  if (els.layer.children.length === 0) return;
  const ok = window.confirm("Remove every annotation? The image stays.");
  if (!ok) return;
  els.layer.replaceChildren();
  activeAnno = null;
  flash("overlays cleared");
}

// ---------------------------------------------------------------------------
// IMAGE LOADERS — upload + URL paste
// ---------------------------------------------------------------------------

function wireLoaders() {
  els.file?.addEventListener("change", onFileChange);
  els.url?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      loadUrl();
    }
  });
  document
    .querySelector('[data-action="load-url"]')
    ?.addEventListener("click", loadUrl);
}

function onFileChange(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    flash("not an image file", true);
    return;
  }
  // Same-origin via blob: URL — html-to-image can read these freely.
  const objectUrl = URL.createObjectURL(file);
  // remove crossorigin so the blob loads cleanly (it's same-origin already)
  els.img.removeAttribute("crossorigin");
  imageIsTainted = false;
  setImageSrc(objectUrl, "image uploaded");
}

function loadUrl() {
  const raw = (els.url?.value || "").trim();
  if (!raw) {
    flash("paste a URL first", true);
    return;
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    flash("that doesn't look like a URL", true);
    return;
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    flash("URL must be http(s)", true);
    return;
  }
  // Anonymous CORS request so html-to-image can read the pixels back. If the
  // server doesn't send Access-Control-Allow-Origin, the browser still loads
  // the image visually but the resulting <canvas> is tainted and toBlob()
  // throws — we surface that on export.
  els.img.setAttribute("crossorigin", "anonymous");
  imageIsTainted = true; // assume tainted until proven otherwise (best-effort)
  setImageSrc(parsed.href, "image loaded — export may fail if server omits CORS");
  // Note: we can't reliably detect taint until we draw the image to a canvas,
  // so we keep the optimistic flag and let exportPng() catch the SecurityError.
}

function setImageSrc(src, statusMsg) {
  els.img.onload = () => {
    imageLoaded = true;
    els.img.hidden = false;
    if (els.empty) els.empty.hidden = true;
    flash(statusMsg);
  };
  els.img.onerror = () => {
    imageLoaded = false;
    els.img.hidden = true;
    if (els.empty) els.empty.hidden = false;
    flash("image failed to load", true);
  };
  // Reset the alt because escapeAttr is unnecessary for empty string but be
  // explicit: the alt stays empty (decorative inside the canvas region).
  els.img.alt = "";
  els.img.src = src;
}

// ---------------------------------------------------------------------------
// CANVAS — click to drop, pointer events to drag
// ---------------------------------------------------------------------------

function wireCanvas() {
  els.canvas.addEventListener("pointerdown", (e) => {
    // Don't intercept clicks that started on an existing annotation or its
    // remove button; those have their own handlers.
    if (e.target.closest(".det-anno") || e.target.closest(".det-anno__remove")) {
      return;
    }
    if (!imageLoaded) {
      flash("load an image first", true);
      return;
    }
    // Pointerdown on empty canvas with a tool selected → drop new annotation
    // at the click point. Use canvas-relative coordinates so the layer's
    // absolute children align.
    const rect = els.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const anno = createAnnotation(currentTool, x, y);
    if (anno) selectAnnotation(anno);
  });
}

function createAnnotation(tool, x, y) {
  if (!TOOLS.includes(tool)) return null;
  const node = document.createElement("div");
  node.className = `det-anno det-anno--${tool}`;
  node.dataset.tool = tool;
  node.dataset.id = `anno-${++annoIdSeq}`;
  node.tabIndex = 0;

  if (tool === "text") {
    // contenteditable inner div so the text is selectable/editable but the
    // outer div remains the drag handle. The placeholder is rendered via
    // CSS (data-placeholder + :empty::before) — escapeAttr the value.
    const inner = document.createElement("div");
    inner.className = "det-anno__text";
    inner.contentEditable = "true";
    inner.setAttribute("spellcheck", "false");
    inner.dataset.placeholder = TOOL_PLACEHOLDER.text;
    // Stop pointerdown inside the editable from triggering the drag — the
    // user is trying to place a caret, not move the box.
    inner.addEventListener("pointerdown", (e) => e.stopPropagation());
    node.appendChild(inner);
    // Auto-focus so the user can just type.
    setTimeout(() => inner.focus(), 0);
  }

  // Position so the click is roughly the top-left, but clamp to canvas.
  const rect = els.canvas.getBoundingClientRect();
  node.style.left = `${clamp(x, 0, rect.width - 16)}px`;
  node.style.top = `${clamp(y, 0, rect.height - 16)}px`;

  // Remove control
  const x_btn = document.createElement("button");
  x_btn.type = "button";
  x_btn.className = "det-anno__remove";
  x_btn.setAttribute("aria-label", "Remove annotation");
  x_btn.textContent = "×";
  x_btn.addEventListener("pointerdown", (e) => e.stopPropagation());
  x_btn.addEventListener("click", (e) => {
    e.stopPropagation();
    removeAnnotation(node);
  });
  node.appendChild(x_btn);

  // Drag handlers
  attachDrag(node);

  // Selection on focus
  node.addEventListener("focus", () => selectAnnotation(node));
  node.addEventListener("pointerdown", () => selectAnnotation(node));

  els.layer.appendChild(node);
  return node;
}

function selectAnnotation(node) {
  if (activeAnno && activeAnno !== node) {
    activeAnno.classList.remove("is-selected");
  }
  activeAnno = node;
  if (node) node.classList.add("is-selected");
}

function removeAnnotation(node) {
  if (!node) return;
  if (activeAnno === node) activeAnno = null;
  node.remove();
}

// ---------------------------------------------------------------------------
// DRAG — pointer events (mouse, touch, pen)
// ---------------------------------------------------------------------------

function attachDrag(node) {
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  let dragging = false;
  let pointerId = null;

  node.addEventListener("pointerdown", (e) => {
    // Ignore right-click / middle-click
    if (e.button !== 0 && e.pointerType === "mouse") return;
    // If the inner editable text or the remove button caught it, bail.
    if (e.target.closest(".det-anno__remove")) return;
    if (e.target.classList?.contains("det-anno__text")) return;
    dragging = true;
    pointerId = e.pointerId;
    node.classList.add("is-dragging");
    node.setPointerCapture?.(pointerId);
    startX = e.clientX;
    startY = e.clientY;
    originLeft = parseFloat(node.style.left) || 0;
    originTop = parseFloat(node.style.top) || 0;
    e.preventDefault();
  });

  node.addEventListener("pointermove", (e) => {
    if (!dragging || e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const rect = els.canvas.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    const maxLeft = rect.width - Math.max(16, nodeRect.width);
    const maxTop = rect.height - Math.max(16, nodeRect.height);
    node.style.left = `${clamp(originLeft + dx, 0, Math.max(0, maxLeft))}px`;
    node.style.top = `${clamp(originTop + dy, 0, Math.max(0, maxTop))}px`;
  });

  const endDrag = (e) => {
    if (!dragging) return;
    if (e.pointerId !== pointerId) return;
    dragging = false;
    node.classList.remove("is-dragging");
    try {
      node.releasePointerCapture?.(pointerId);
    } catch {
      /* ignore */
    }
    pointerId = null;
  };
  node.addEventListener("pointerup", endDrag);
  node.addEventListener("pointercancel", endDrag);
}

// ---------------------------------------------------------------------------
// KEYBOARD — Delete/Backspace removes the focused annotation
// ---------------------------------------------------------------------------

function wireKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Delete" && e.key !== "Backspace") return;
    const target = document.activeElement;
    if (!target) return;
    // Don't hijack delete inside the contenteditable text area or any input.
    if (target.isContentEditable) return;
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    const anno = target.closest?.(".det-anno");
    if (!anno) return;
    e.preventDefault();
    removeAnnotation(anno);
  });
}

// ---------------------------------------------------------------------------
// ACTIONS — export PNG, reset
// ---------------------------------------------------------------------------

function wireActions() {
  document
    .querySelector('[data-action="png"]')
    ?.addEventListener("click", exportPng);
  document
    .querySelector('[data-action="reset"]')
    ?.addEventListener("click", reset);
}

async function exportPng() {
  if (!imageLoaded) {
    flash("load an image first", true);
    return;
  }
  if (!window.htmlToImage) {
    flash("html-to-image still loading — try again in a sec.", true);
    return;
  }
  // Hide the empty placeholder if it slipped through, and clear selection
  // outline so it doesn't bake into the export.
  if (activeAnno) activeAnno.classList.remove("is-selected");
  try {
    flash("rendering…");
    const dataUrl = await window.htmlToImage.toPng(els.canvas, {
      pixelRatio: 2,
      backgroundColor: "#0a0a0a",
      cacheBust: true,
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `detournement-${stamp()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    flash("PNG downloaded");
  } catch (err) {
    console.error(err);
    // Best-effort: SecurityError or "Tainted canvases may not be exported"
    // means the URL paste hit a server without CORS headers. Surface a
    // clear message that points at the workaround (download + upload).
    const msg = String(err?.message || err || "");
    const looksTainted = /tainted|cors|cross.?origin|securityerror/i.test(msg);
    // Browsers throw a SecurityError when a tainted canvas hits toBlob/toDataURL,
    // but the message text isn't always identifiable. If we loaded via URL paste
    // (imageIsTainted set optimistically) and the export blew up, the most
    // likely cause is a missing CORS header, so we lead with that hypothesis.
    if (looksTainted || imageIsTainted) {
      flash(
        "export blocked — remote image has no CORS headers. Download it and upload instead.",
        true,
      );
    } else {
      flash("PNG export failed — see console", true);
    }
  } finally {
    if (activeAnno) activeAnno.classList.add("is-selected");
  }
}

function reset() {
  const ok = window.confirm("Wipe the image and every annotation?");
  if (!ok) return;
  els.layer.replaceChildren();
  activeAnno = null;
  imageLoaded = false;
  imageIsTainted = false;
  els.img.hidden = true;
  els.img.removeAttribute("src");
  els.img.removeAttribute("crossorigin");
  if (els.empty) els.empty.hidden = false;
  if (els.file) els.file.value = "";
  if (els.url) els.url.value = "";
  flash("canvas cleared");
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

function flash(msg, isError = false) {
  if (!els.status) return;
  els.status.textContent = msg || "";
  els.status.classList.toggle("is-error", Boolean(isError && msg));
  clearTimeout(flash._t);
  flash._t = setTimeout(() => {
    if (!els.status) return;
    els.status.textContent = "";
    els.status.classList.remove("is-error");
  }, 5000);
}

// XSS hygiene — exported for parity with the project convention even though
// every user-supplied string in this widget reaches the DOM via textContent
// or contentEditable (never innerHTML). Keep these here so future edits that
// reach for innerHTML have a sanitizer one import-line away.
// eslint-disable-next-line no-unused-vars
function escapeHTML(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// eslint-disable-next-line no-unused-vars
function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;").replace(/&/g, "&amp;");
}
