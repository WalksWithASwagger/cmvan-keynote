// /widgets/both-hands.html — diptych state, render, reorder, PNG export,
// share-via-hash. html-to-image is loaded as a non-module CDN script and
// exposes window.htmlToImage.

import { load, save, debounceSave, remove } from "/js/common/storage.js";

const SIDES = [
  {
    id: "critique",
    placeholders: [
      "Theft without consent.",
      "The junior pipeline collapsing.",
      "Race to the bottom on rates.",
      "Bias laundering as math.",
      "The names disappearing from credit lines.",
    ],
  },
  {
    id: "capability",
    placeholders: [
      "More creative than I&rsquo;ve ever been.",
      "An idea per night, made by morning.",
      "A posse to refuse together.",
      "My voice amplified — not averaged.",
      "Time given back to the work I love.",
    ],
  },
];
const SLOT_COUNT = 5;
const STORAGE_KEY = "bhf:state";

let state = freshState();
let nameField, statusEl, stampEl, signatureEl;

hydrate();
render();
wireActions();
hydrateName();
stampNow();

// ---------------------------------------------------------------------------

function freshState() {
  return {
    critique: Array(SLOT_COUNT).fill(""),
    capability: Array(SLOT_COUNT).fill(""),
    name: "",
  };
}

function hydrate() {
  const fromHash = stateFromHash();
  if (fromHash) {
    state = fromHash;
    persist();
    history.replaceState(null, "", window.location.pathname);
    return;
  }
  const { value } = load(STORAGE_KEY, null);
  if (value && value.critique && value.capability) {
    state = {
      ...freshState(),
      ...value,
      critique: padArray(value.critique, SLOT_COUNT),
      capability: padArray(value.capability, SLOT_COUNT),
    };
  }
}

function persist() {
  save(STORAGE_KEY, state);
}

const debouncedPersist = debounce(persist, 300);

// ---------------------------------------------------------------------------

function render() {
  for (const side of SIDES) {
    const list = document.querySelector(`.bhf-list[data-side="${side.id}"]`);
    if (!list) continue;
    list.innerHTML = "";
    state[side.id].forEach((value, idx) => {
      list.appendChild(renderItem(side, idx, value));
    });
  }
}

function renderItem(side, idx, value) {
  const li = document.createElement("li");
  li.className = "bhf-item";
  li.innerHTML = `
    <span class="bhf-item__num">${idx + 1}</span>
    <input
      type="text"
      class="bhf-item__input"
      data-side="${side.id}"
      data-idx="${idx}"
      placeholder="${side.placeholders[idx]}"
    />
    <span class="bhf-item__moves">
      <button type="button" class="bhf-item__move" data-move="up" data-side="${side.id}" data-idx="${idx}" aria-label="Move up"><span aria-hidden="true">↑</span></button>
      <button type="button" class="bhf-item__move" data-move="down" data-side="${side.id}" data-idx="${idx}" aria-label="Move down"><span aria-hidden="true">↓</span></button>
    </span>
  `;
  const input = li.querySelector("input");
  input.value = value;
  input.addEventListener("input", () => {
    state[side.id][idx] = input.value;
    debouncedPersist();
  });
  li.querySelector('[data-move="up"]').addEventListener("click", () => move(side.id, idx, -1));
  li.querySelector('[data-move="down"]').addEventListener("click", () => move(side.id, idx, 1));
  paintMoveDisabledState(li, side.id, idx);
  return li;
}

function paintMoveDisabledState(li, sideId, idx) {
  li.querySelector('[data-move="up"]').disabled = idx === 0;
  li.querySelector('[data-move="down"]').disabled = idx === SLOT_COUNT - 1;
}

function move(sideId, idx, delta) {
  const next = idx + delta;
  if (next < 0 || next >= SLOT_COUNT) return;
  const arr = state[sideId];
  [arr[idx], arr[next]] = [arr[next], arr[idx]];
  persist();
  render();
  // restore focus to the moved input
  document
    .querySelector(`input[data-side="${sideId}"][data-idx="${next}"]`)
    ?.focus();
}

// ---------------------------------------------------------------------------

function wireActions() {
  statusEl = document.getElementById("bhf-status");
  signatureEl = document.querySelector("[data-name]");
  stampEl = document.querySelector("[data-stamp]");

  nameField = document.getElementById("bhf-name");
  if (nameField) {
    nameField.addEventListener("input", () => {
      state.name = nameField.value;
      paintSignature();
      debouncedPersist();
    });
  }
  document.querySelector('[data-action="png"]')?.addEventListener("click", exportPng);
  document.querySelector('[data-action="share"]')?.addEventListener("click", copyShareLink);
  document.querySelector('[data-action="reset"]')?.addEventListener("click", reset);
}

function hydrateName() {
  if (nameField) nameField.value = state.name || "";
  paintSignature();
}

function paintSignature() {
  if (signatureEl) {
    signatureEl.textContent = (state.name && state.name.trim()) || "Anonymous punk";
  }
}

function stampNow() {
  if (stampEl) {
    const d = new Date();
    stampEl.textContent = d.toISOString().slice(0, 10);
  }
}

// ---------------------------------------------------------------------------

async function exportPng() {
  const canvas = document.getElementById("bhf-canvas");
  if (!canvas) return;
  if (!window.htmlToImage) {
    flash("html-to-image still loading — try again in a sec.");
    return;
  }
  try {
    flash("rendering…");
    const dataUrl = await window.htmlToImage.toPng(canvas, {
      pixelRatio: 2,
      backgroundColor: "#0a0a0a",
      cacheBust: true,
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `both-hands-full-${stamp()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    flash("PNG downloaded");
  } catch (err) {
    console.error(err);
    flash("PNG export failed — see console");
  }
}

async function copyShareLink() {
  const url = buildShareUrl();
  try {
    await navigator.clipboard.writeText(url);
    flash("share link copied to clipboard");
  } catch {
    flash("copy failed — link in console");
    console.log(url);
  }
}

function reset() {
  const ok = window.confirm("Wipe both sides and clear the signature?");
  if (!ok) return;
  state = freshState();
  if (nameField) nameField.value = "";
  remove(STORAGE_KEY);
  paintSignature();
  render();
  flash("canvas cleared");
}

// ---------------------------------------------------------------------------

function buildShareUrl() {
  const compact = {
    c: state.critique,
    p: state.capability,
    n: state.name || undefined,
  };
  const encoded = base64UrlEncode(JSON.stringify(compact));
  return `${window.location.origin}${window.location.pathname}#s=${encoded}`;
}

function stateFromHash() {
  const hash = window.location.hash || "";
  const match = hash.match(/^#s=(.+)$/);
  if (!match) return null;
  try {
    const json = base64UrlDecode(match[1]);
    const data = JSON.parse(json);
    if (!Array.isArray(data?.c) || !Array.isArray(data?.p)) return null;
    return {
      critique: padArray(data.c, SLOT_COUNT),
      capability: padArray(data.p, SLOT_COUNT),
      name: data.n || "",
    };
  } catch {
    return null;
  }
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

function padArray(arr, n) {
  const out = arr.slice(0, n).map((v) => (typeof v === "string" ? v : ""));
  while (out.length < n) out.push("");
  return out;
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function flash(msg) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  clearTimeout(flash._t);
  flash._t = setTimeout(() => {
    if (statusEl) statusEl.textContent = "";
  }, 3000);
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}
