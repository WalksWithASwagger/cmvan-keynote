// /widgets/action — post-talk decision tree. Five quick questions route to
// ONE assigned action with a deep-link back into the portal. The result
// persists in localStorage so re-entry shows the assignment without forcing
// the user to walk the tree again.

import { load, save, remove } from "/js/common/storage.js";

const STORAGE_KEY = "action:result";

const stageEl = document.getElementById("act-stage");
const statusEl = document.getElementById("act-status");
const introLede = document.getElementById("act-intro-lede");

let tree = null;
let path = []; // sequence of { nodeId, choiceLabel }

main();

async function main() {
  try {
    const res = await fetch("/data/action-tree.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    tree = await res.json();
  } catch (err) {
    stageEl.innerHTML = `<p class="act-empty">tree unavailable: ${escapeHTML(
      err.message || err
    )}</p>`;
    return;
  }

  if (introLede && tree.intro) introLede.textContent = tree.intro;

  const stored = load(STORAGE_KEY, null);
  if (stored.ok && stored.value && stored.value.actionId && tree.actions[stored.value.actionId]) {
    renderResult(stored.value.actionId, stored.value.path || [], { fromStorage: true });
  } else {
    renderQuestion(tree.root);
  }
}

function renderQuestion(nodeId) {
  const node = tree.nodes[nodeId];
  if (!node) {
    stageEl.innerHTML = `<p class="act-empty">missing node: ${escapeHTML(nodeId)}</p>`;
    return;
  }

  const idx = path.length + 1;
  const total = estimateDepth(nodeId) + path.length;

  stageEl.innerHTML = "";
  const card = document.createElement("section");
  card.className = "act-card";
  card.dataset.kind = "question";

  const meta = document.createElement("p");
  meta.className = "act-card__meta";
  meta.textContent = `Question ${idx}${total > idx ? ` of ~${total}` : ""}`;
  card.appendChild(meta);

  const h2 = document.createElement("h2");
  h2.className = "act-card__title";
  h2.textContent = node.question;
  card.appendChild(h2);

  if (node.hint) {
    const hint = document.createElement("p");
    hint.className = "act-card__hint";
    hint.textContent = node.hint;
    card.appendChild(hint);
  }

  const list = document.createElement("ul");
  list.className = "act-card__options";
  node.options.forEach((opt) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "act-option";
    btn.textContent = opt.label;
    btn.addEventListener("click", () => choose(nodeId, opt));
    li.appendChild(btn);
    list.appendChild(li);
  });
  card.appendChild(list);

  if (path.length > 0) {
    const back = document.createElement("button");
    back.type = "button";
    back.className = "act-card__back";
    back.textContent = "← Back one question";
    back.addEventListener("click", goBack);
    card.appendChild(back);
  }

  stageEl.appendChild(card);
}

function choose(nodeId, opt) {
  path.push({ nodeId, label: opt.label, next: opt.next });

  if (tree.actions[opt.next]) {
    renderResult(opt.next, path.slice());
    return;
  }
  renderQuestion(opt.next);
}

function goBack() {
  if (!path.length) return;
  const last = path.pop();
  renderQuestion(last.nodeId);
}

function renderResult(actionId, takenPath, opts = {}) {
  const action = tree.actions[actionId];
  if (!action) {
    stageEl.innerHTML = `<p class="act-empty">missing action: ${escapeHTML(actionId)}</p>`;
    return;
  }

  save(STORAGE_KEY, { actionId, path: takenPath, savedAt: Date.now() });

  stageEl.innerHTML = "";
  const card = document.createElement("section");
  card.className = "act-card";
  card.dataset.kind = "result";

  const meta = document.createElement("p");
  meta.className = "act-card__meta act-card__meta--accent";
  meta.textContent = opts.fromStorage ? "Your saved move" : "Your move";
  card.appendChild(meta);

  const h2 = document.createElement("h2");
  h2.className = "act-card__title act-card__title--big";
  h2.textContent = action.title;
  card.appendChild(h2);

  const rationale = document.createElement("p");
  rationale.className = "act-card__rationale";
  rationale.textContent = action.rationale;
  card.appendChild(rationale);

  const ctaWrap = document.createElement("div");
  ctaWrap.className = "act-card__cta-row";

  const cta = document.createElement("a");
  cta.className = "btn btn--primary";
  cta.href = action.href;
  cta.textContent = `Do it now → ${action.cta}`;
  if (action.kind === "external") {
    cta.target = "_blank";
    cta.rel = "noopener";
  }
  ctaWrap.appendChild(cta);

  const restart = document.createElement("button");
  restart.type = "button";
  restart.className = "btn";
  restart.textContent = "Run again";
  restart.addEventListener("click", reset);
  ctaWrap.appendChild(restart);

  card.appendChild(ctaWrap);

  if (tree.leafBlurb) {
    const blurb = document.createElement("p");
    blurb.className = "act-card__blurb";
    blurb.textContent = tree.leafBlurb;
    card.appendChild(blurb);
  }

  if (takenPath.length) {
    const trail = document.createElement("details");
    trail.className = "act-card__trail";
    const sum = document.createElement("summary");
    sum.textContent = "How you got here";
    trail.appendChild(sum);
    const ol = document.createElement("ol");
    takenPath.forEach((step) => {
      const node = tree.nodes[step.nodeId];
      const li = document.createElement("li");
      li.innerHTML = `<strong>${escapeHTML(node ? node.question : step.nodeId)}</strong> — ${escapeHTML(
        step.label
      )}`;
      ol.appendChild(li);
    });
    trail.appendChild(ol);
    card.appendChild(trail);
  }

  stageEl.appendChild(card);
  flash(opts.fromStorage ? "loaded your last result" : "saved — come back any time");
}

function reset() {
  path = [];
  remove(STORAGE_KEY);
  renderQuestion(tree.root);
  flash("");
}

function estimateDepth(nodeId, seen = new Set()) {
  if (seen.has(nodeId)) return 0;
  seen.add(nodeId);
  const node = tree.nodes[nodeId];
  if (!node) return 0;
  let max = 0;
  for (const opt of node.options) {
    if (tree.actions[opt.next]) continue;
    const d = 1 + estimateDepth(opt.next, new Set(seen));
    if (d > max) max = d;
  }
  return max;
}

function flash(msg) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  clearTimeout(flash._t);
  flash._t = setTimeout(() => {
    if (statusEl) statusEl.textContent = "";
  }, 2400);
}

function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
