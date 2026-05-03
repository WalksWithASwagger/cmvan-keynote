// /widgets/three-documents.html — three textareas, autosave, two export
// formats. No network calls. localStorage is the only sink.

import { load, save, debounceSave, remove } from "/js/common/storage.js";

const DOCS = [
  { id: "policy", title: "Personal AI policy" },
  { id: "style", title: "Style and voice guide" },
  { id: "worldview", title: "Worldview" },
];
const READY_THRESHOLD = 60; // words

const state = Object.fromEntries(DOCS.map((d) => [d.id, ""]));
const debouncedSavers = Object.fromEntries(
  DOCS.map((d) => [d.id, debounceSave(`tdoc:${d.id}`, 350)])
);

const previewEl = document.getElementById("tdoc-preview");
let previewMode = "md";

const SOCIAL_MAX_CHARS = 280;
const socialListEl = document.getElementById("tdoc-social-list");
let socialTemplates = null;

hydrate();
wireInputs();
wireExport();
wireTabs();
wireSocial();
paint();

// ---------------------------------------------------------------------------

function hydrate() {
  for (const doc of DOCS) {
    const { value } = load(`tdoc:${doc.id}`, "");
    state[doc.id] = typeof value === "string" ? value : "";
    const ta = document.querySelector(`[data-doc-input="${doc.id}"]`);
    if (ta) ta.value = state[doc.id];
  }
}

function wireInputs() {
  for (const doc of DOCS) {
    const ta = document.querySelector(`[data-doc-input="${doc.id}"]`);
    if (!ta) continue;
    ta.addEventListener("input", () => {
      state[doc.id] = ta.value;
      debouncedSavers[doc.id](ta.value);
      paint();
    });
  }
}

function wireExport() {
  document.querySelector('[data-export="download"]').addEventListener("click", download);
  document.querySelector('[data-export="copy"]').addEventListener("click", copyAll);
  document.querySelector('[data-export="reset"]').addEventListener("click", resetAll);
}

function wireTabs() {
  document.querySelectorAll("[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      previewMode = btn.dataset.tab;
      document.querySelectorAll("[data-tab]").forEach((b) =>
        b.setAttribute("aria-pressed", String(b === btn))
      );
      paint();
    });
  });
}

// ---------------------------------------------------------------------------

function paint() {
  for (const doc of DOCS) {
    const text = state[doc.id] ?? "";
    const words = countWords(text);
    const chars = text.length;
    const ready = words >= READY_THRESHOLD;

    setText(`[data-doc-words="${doc.id}"]`, formatNumber(words));
    setText(`[data-doc-chars="${doc.id}"]`, formatNumber(chars));
    setText(`[data-doc-state="${doc.id}"]`, ready ? "ready" : words === 0 ? "empty" : "draft");
    document
      .querySelector(`[data-doc-state="${doc.id}"]`)
      ?.setAttribute("data-state", ready ? "ready" : "draft");

    const pill = document.querySelector(`[data-progress="${doc.id}"]`);
    if (pill) {
      pill.querySelector("[data-progress-words]").textContent = words === 0 ? "empty" : `${formatNumber(words)} w`;
      pill.setAttribute("data-state", ready ? "ready" : "draft");
    }
  }

  if (previewEl) {
    previewEl.textContent = anyContent() ? render(previewMode) : "";
  }
}

function anyContent() {
  return DOCS.some((d) => (state[d.id] ?? "").trim().length > 0);
}

function render(mode) {
  if (mode === "prompt") return renderPrompt();
  return renderMarkdown();
}

function renderMarkdown() {
  const stamp = new Date().toISOString().slice(0, 10);
  const sections = DOCS.map((d) => {
    const body = (state[d.id] ?? "").trim();
    if (!body) return null;
    return `## ${d.title}\n\n${body}\n`;
  }).filter(Boolean);
  return [
    `# Three documents`,
    `_drafted ${stamp} via punkrockai.com / three-documents_`,
    ``,
    ...sections,
    `---`,
    `Feed these documents back to whatever AI you use every day. The machine`,
    `stops giving you the average of the internet. It starts amplifying what`,
    `makes you you.`,
    ``,
  ].join("\n");
}

function renderPrompt() {
  const sections = DOCS.map((d) => {
    const body = (state[d.id] ?? "").trim();
    if (!body) return null;
    return `## ${d.title}\n${body}`;
  }).filter(Boolean);
  return [
    `You are an assistant calibrated to my voice and values. I am giving you`,
    `three reference documents. Use them to ground every reply. When my`,
    `request would conflict with my refusals, name the conflict and ask me`,
    `before proceeding. When you write in my voice, match my refusals,`,
    `references, and rhythm. Do not write in your default register.`,
    ``,
    ...sections,
    ``,
    `Acknowledge that you have read all three documents, then wait for my`,
    `next message. Do not summarize them back to me.`,
  ].join("\n");
}

// ---------------------------------------------------------------------------

function download() {
  if (!anyContent()) return flash("nothing to export yet");
  const ext = previewMode === "prompt" ? "txt" : "md";
  const filename = previewMode === "prompt"
    ? `three-documents.bot-prompt.${ext}`
    : `three-documents.${ext}`;
  const blob = new Blob([render(previewMode)], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  flash(`downloaded ${filename}`);
}

async function copyAll() {
  if (!anyContent()) return flash("nothing to copy yet");
  try {
    await navigator.clipboard.writeText(render(previewMode));
    flash(`copied ${previewMode === "prompt" ? "prompt" : "markdown"} to clipboard`);
  } catch {
    flash("copy failed — select preview text manually");
  }
}

function resetAll() {
  const ok = window.confirm(
    "Wipe all three drafts from this browser? This cannot be undone — download a copy first if you want to keep them."
  );
  if (!ok) return;
  for (const doc of DOCS) {
    state[doc.id] = "";
    remove(`tdoc:${doc.id}`);
    const ta = document.querySelector(`[data-doc-input="${doc.id}"]`);
    if (ta) ta.value = "";
  }
  paint();
  flash("drafts cleared");
}

// ---------------------------------------------------------------------------

function wireSocial() {
  const genBtn = document.querySelector('[data-social="generate"]');
  const clearBtn = document.querySelector('[data-social="clear"]');
  if (genBtn) genBtn.addEventListener("click", generateSocial);
  if (clearBtn) clearBtn.addEventListener("click", clearSocial);
}

async function loadSocialTemplates() {
  if (socialTemplates) return socialTemplates;
  const res = await fetch("/data/social-templates.json", { cache: "no-cache" });
  socialTemplates = await res.json();
  return socialTemplates;
}

async function generateSocial() {
  if (!anyContent()) return flash("draft at least one document first");
  let data;
  try {
    data = await loadSocialTemplates();
  } catch {
    return flash("could not load templates");
  }
  const ctx = buildSocialContext();
  const max = data.maxChars ?? SOCIAL_MAX_CHARS;
  const posts = data.templates
    .filter((t) => (t.requires ?? []).every((id) => ctx.has[id]))
    .map((t) => buildPost(t, ctx, max))
    .filter((p) => p && p.text.trim().length > 0);

  renderSocial(posts, max);
  if (posts.length === 0) flash("no posts produced — write more in your docs");
  else flash(`generated ${posts.length} posts`);
}

function buildSocialContext() {
  const has = {};
  const lines = {};
  const refusals = {};
  for (const doc of DOCS) {
    const text = (state[doc.id] ?? "").trim();
    has[doc.id] = text.length > 0;
    lines[doc.id] = splitLines(text);
    refusals[doc.id] = extractRefusals(text);
  }
  return { has, lines, refusals };
}

function splitLines(text) {
  return text
    .split(/\r?\n/)
    .map((s) => s.replace(/^[-*\d.)\s]+/, "").trim())
    .filter((s) => s.length > 0);
}

function extractRefusals(text) {
  // Pull words after "Refuse:" or "Ban:" prefix on a line, comma-separated.
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:refuse|ban|never)\s*[:\-]\s*(.+)$/i);
    if (m) return m[1].trim();
  }
  return "";
}

function buildPost(template, ctx, max) {
  const body = expandTokens(template.body, ctx);
  if (!body) return null;
  const prefix = template.prefix ?? "";
  const suffix = template.suffix ?? "";
  const budget = max - prefix.length - suffix.length;
  const trimmed = budget <= 0 ? "" : truncate(body, budget);
  if (!trimmed) return null;
  const text = `${prefix}${trimmed}${suffix}`;
  return { id: template.id, label: template.label, text };
}

function expandTokens(pattern, ctx) {
  return pattern.replace(/\{([^}]+)\}/g, (_, token) => resolveToken(token, ctx));
}

function resolveToken(token, ctx) {
  if (token === "tldr") return buildTldr(ctx);
  const [docId, op] = token.split(".");
  const lines = ctx.lines[docId] ?? [];
  if (op === "first") return lines[0] ?? "";
  if (op === "last") return lines[lines.length - 1] ?? "";
  if (op === "refusals") return ctx.refusals[docId] ?? "";
  const lineMatch = op && op.match(/^line:(\d+)$/);
  if (lineMatch) {
    const idx = Number(lineMatch[1]) - 1;
    return lines[idx] ?? "";
  }
  return "";
}

function buildTldr(ctx) {
  const parts = [];
  if (ctx.has.policy) parts.push(`policy — ${ctx.lines.policy[0]}`);
  if (ctx.has.style) parts.push(`style — ${ctx.lines.style[0]}`);
  if (ctx.has.worldview) parts.push(`worldview — ${ctx.lines.worldview[0]}`);
  return parts.join(" / ");
}

function truncate(text, max) {
  if (text.length <= max) return text;
  if (max <= 1) return "";
  const slice = text.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
}

function renderSocial(posts, max) {
  if (!socialListEl) return;
  socialListEl.innerHTML = "";
  for (const post of posts) {
    const li = document.createElement("li");
    li.className = "tdoc-social__item";
    li.dataset.postId = post.id;

    const label = document.createElement("p");
    label.className = "tdoc-social__label";
    label.textContent = post.label;

    const body = document.createElement("pre");
    body.className = "tdoc-social__body";
    body.textContent = post.text;

    const meta = document.createElement("p");
    meta.className = "tdoc-social__meta";
    meta.textContent = `${post.text.length} / ${max} chars`;

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "btn";
    copy.textContent = "Copy";
    copy.addEventListener("click", () => copyPost(post.text, copy));

    li.append(label, body, meta, copy);
    socialListEl.appendChild(li);
  }
}

async function copyPost(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const original = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => {
      button.textContent = original;
    }, 1500);
  } catch {
    flash("copy failed — select the post manually");
  }
}

function clearSocial() {
  if (socialListEl) socialListEl.innerHTML = "";
}

// ---------------------------------------------------------------------------

let flashTimer;
function flash(msg) {
  // tiny ephemeral status — reuse the export hint paragraph if present
  let host = document.querySelector(".tdoc-export__hint");
  if (!host) return;
  if (!host.dataset.original) host.dataset.original = host.innerHTML;
  host.textContent = msg;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    host.innerHTML = host.dataset.original;
  }, 2500);
}

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
}

function countWords(text) {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function formatNumber(n) {
  return n.toLocaleString("en-US");
}
