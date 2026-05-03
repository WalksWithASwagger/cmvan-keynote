// /widgets/manifesto — answer three prompts, render a punk-rock manifesto.
// Pure client-side templating. No LLM call. Templates load from
// /data/manifesto-templates.json. Remix re-rolls a different template against
// the same inputs. Copy + download .md / .txt for take-home use.

import { load, save } from "/js/common/storage.js";

const STORAGE_KEY = "mfst:inputs";
const TEMPLATES_URL = "/data/manifesto-templates.json";

const formEl = document.getElementById("mfst-form");
const craftEl = document.getElementById("mfst-craft");
const servedEl = document.getElementById("mfst-served");
const refusalsEl = document.getElementById("mfst-refusals");
const nameEl = document.getElementById("mfst-name");
const outputEl = document.getElementById("mfst-output");
const statusEl = document.getElementById("mfst-status");

const remixBtn = document.querySelector('[data-action="remix"]');
const copyBtn = document.querySelector('[data-action="copy"]');
const dlMdBtn = document.querySelector('[data-action="download-md"]');
const dlTxtBtn = document.querySelector('[data-action="download-txt"]');

let templates = [];
let lastInputs = null;
let lastTemplateId = null;
let lastParagraphs = [];

hydrate();
bind();
loadTemplates();

function hydrate() {
  const { value } = load(STORAGE_KEY, null);
  if (value && typeof value === "object") {
    if (typeof value.craft === "string") craftEl.value = value.craft;
    if (typeof value.served === "string") servedEl.value = value.served;
    if (typeof value.refusals === "string") refusalsEl.value = value.refusals;
    if (typeof value.name === "string") nameEl.value = value.name;
  }
}

function bind() {
  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    generate({ remix: false });
  });
  remixBtn.addEventListener("click", () => generate({ remix: true }));
  copyBtn.addEventListener("click", copyToClipboard);
  dlMdBtn.addEventListener("click", () => download("md"));
  dlTxtBtn.addEventListener("click", () => download("txt"));
}

async function loadTemplates() {
  try {
    const res = await fetch(TEMPLATES_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    templates = Array.isArray(data?.templates) ? data.templates : [];
    if (!templates.length) flash("no templates loaded — check /data/manifesto-templates.json");
  } catch (err) {
    console.warn("[manifesto] template load failed:", err);
    flash("could not load templates — refresh the page");
  }
}

function readInputs() {
  const craft = craftEl.value.trim();
  const served = servedEl.value.trim();
  const refusalsRaw = refusalsEl.value.trim();
  const name = nameEl.value.trim();

  if (!craft || !served || !refusalsRaw) {
    flash("answer all three prompts");
    return null;
  }

  const refusalList = refusalsRaw
    .split(/\r?\n|,/)
    .map((s) => s.trim().replace(/^[-*•]\s*/, ""))
    .filter(Boolean);

  if (!refusalList.length) {
    flash("list at least one thing you refuse");
    return null;
  }

  return { craft, served, refusalList, name, raw: { craft, served, refusals: refusalsRaw, name } };
}

function generate({ remix }) {
  if (!templates.length) {
    flash("templates still loading — try again in a sec");
    return;
  }

  const inputs = readInputs();
  if (!inputs) return;

  save(STORAGE_KEY, inputs.raw);
  lastInputs = inputs;

  const tpl = pickTemplate(remix ? lastTemplateId : null);
  lastTemplateId = tpl.id;

  const tokens = buildTokens(inputs);
  lastParagraphs = tpl.paragraphs.map((p) => fill(p, tokens));

  render(lastParagraphs, inputs.name);
  enableExports(true);
  flash(remix ? `remixed → "${tpl.title}"` : `generated → "${tpl.title}"`);
}

function pickTemplate(excludeId) {
  if (templates.length === 1) return templates[0];
  const pool = excludeId ? templates.filter((t) => t.id !== excludeId) : templates;
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildTokens({ craft, served, refusalList }) {
  return {
    craft,
    served,
    firstRefusal: refusalList[0],
    refusals: joinList(refusalList),
  };
}

function joinList(items) {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function fill(template, tokens) {
  return String(template).replace(/\{\{(\w+)\}\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : `{{${key}}}`
  );
}

function render(paragraphs, name) {
  outputEl.innerHTML = "";

  const heading = document.createElement("h2");
  heading.textContent = "Manifesto";
  outputEl.appendChild(heading);

  for (const p of paragraphs) {
    const el = document.createElement("p");
    el.textContent = p;
    outputEl.appendChild(el);
  }

  if (name) {
    const sig = document.createElement("p");
    sig.className = "mfst__signoff";
    sig.textContent = `— ${name}`;
    outputEl.appendChild(sig);
  }
}

function enableExports(on) {
  for (const btn of [remixBtn, copyBtn, dlMdBtn, dlTxtBtn]) btn.disabled = !on;
}

async function copyToClipboard() {
  if (!lastParagraphs.length) {
    flash("generate one first");
    return;
  }
  try {
    await navigator.clipboard.writeText(toPlainText());
    flash("copied to clipboard");
  } catch {
    flash("copy failed — select manually");
  }
}

function download(kind) {
  if (!lastParagraphs.length) {
    flash("generate one first");
    return;
  }
  const isMd = kind === "md";
  const body = isMd ? toMarkdown() : toPlainText();
  const mime = isMd ? "text/markdown" : "text/plain";
  const ext = isMd ? "md" : "txt";

  const blob = new Blob([body], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `manifesto.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  flash(`saved manifesto.${ext}`);
}

function toPlainText() {
  const lines = ["Manifesto", "", ...interleave(lastParagraphs)];
  if (lastInputs?.name) lines.push("", `— ${lastInputs.name}`);
  return lines.join("\n");
}

function toMarkdown() {
  const lines = ["# Manifesto", "", ...interleave(lastParagraphs)];
  if (lastInputs?.name) lines.push("", `*— ${lastInputs.name}*`);
  return lines.join("\n");
}

function interleave(paragraphs) {
  const out = [];
  paragraphs.forEach((p, i) => {
    if (i > 0) out.push("");
    out.push(p);
  });
  return out;
}

function flash(msg) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  clearTimeout(flash._t);
  flash._t = setTimeout(() => {
    if (statusEl) statusEl.textContent = "";
  }, 2500);
}
