// /widgets/sig.html — Email signature generator.
// User types name/role/handle, picks a tagline from the talk, gets back
// an inline-styled HTML signature that pastes cleanly into Gmail / Apple
// Mail / Outlook. Plain-text fallback is rendered alongside.

import { load, save, remove } from "/js/common/storage.js";

const STORAGE_KEY = "sig:state";
const PORTAL_URL = "https://punkrockai.com";
const UTM_SUFFIX = "?ref=email-sig";
const BADGE_URL =
  "https://punkrockai.com/public/images/badge-attended.png";

const DEFAULTS = {
  name: "",
  role: "",
  handle: "",
  email: "",
  taglineId: "",
  badge: false,
};

let state = { ...DEFAULTS };
let taglines = [];

bootstrap();

async function bootstrap() {
  hydrate();
  await loadTaglines();
  ensureTaglineId();
  renderForm();
  wireForm();
  render();
}

function hydrate() {
  const { value } = load(STORAGE_KEY, null);
  if (value && typeof value === "object") {
    state = { ...DEFAULTS, ...sanitize(value) };
  }
}

function sanitize(value) {
  return {
    name: stringOf(value.name),
    role: stringOf(value.role),
    handle: stringOf(value.handle),
    email: stringOf(value.email),
    taglineId: stringOf(value.taglineId),
    badge: value.badge === true,
  };
}

function stringOf(v) {
  return typeof v === "string" ? v : "";
}

function persist() {
  save(STORAGE_KEY, state);
}

async function loadTaglines() {
  try {
    const res = await fetch("/data/sig-taglines.json", { cache: "no-cache" });
    const data = await res.json();
    taglines = Array.isArray(data.taglines) ? data.taglines : [];
  } catch (err) {
    console.warn("[sig] tagline load failed:", err);
    taglines = [
      {
        id: "tag-fallback",
        text: "The tool is never neutral. But neither are we.",
        act: "Act VI",
      },
    ];
  }
}

function ensureTaglineId() {
  const exists = taglines.some((t) => t.id === state.taglineId);
  if (!exists) {
    state.taglineId = pickByDate(taglines).id;
  }
}

// Deterministic-by-date pick so a returning visitor gets a stable rotating
// quote per day, while still feeling fresh across the week.
function pickByDate(list) {
  if (!list.length) return { id: "", text: "", act: "" };
  const d = new Date();
  const seed = d.getUTCFullYear() * 1000 + dayOfYear(d);
  return list[seed % list.length];
}

function dayOfYear(d) {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const now = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((now - start) / 86400000);
}

// ---------------------------------------------------------------------------
// Form
// ---------------------------------------------------------------------------

function renderForm() {
  const select = document.getElementById("sig-tagline");
  if (select) {
    select.innerHTML = taglines
      .map(
        (t) =>
          `<option value="${escapeAttr(t.id)}">${escapeHTML(t.text)}</option>`,
      )
      .join("");
    select.value = state.taglineId;
  }
  paintInputs();
}

function paintInputs() {
  setInput("sig-name", state.name);
  setInput("sig-role", state.role);
  setInput("sig-handle", state.handle);
  setInput("sig-email", state.email);
  const badge = document.getElementById("sig-badge");
  if (badge) badge.checked = state.badge;
  const select = document.getElementById("sig-tagline");
  if (select) select.value = state.taglineId;
}

function setInput(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function wireForm() {
  document.querySelectorAll("[data-field]").forEach((el) => {
    const field = el.dataset.field;
    const evt = el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, () => {
      if (el.type === "checkbox") {
        state[field] = el.checked;
      } else {
        state[field] = el.value;
      }
      persist();
      render();
    });
  });

  document
    .querySelector('[data-action="rotate-tagline"]')
    ?.addEventListener("click", rotateTagline);
  document
    .querySelector('[data-action="random-tagline"]')
    ?.addEventListener("click", randomTagline);
  document
    .querySelector('[data-action="reset"]')
    ?.addEventListener("click", reset);
  document
    .querySelector('[data-action="copy-rich"]')
    ?.addEventListener("click", copyRich);
  document
    .querySelector('[data-action="copy-html"]')
    ?.addEventListener("click", copyHtml);
  document
    .querySelector('[data-action="copy-text"]')
    ?.addEventListener("click", copyText);
}

function rotateTagline() {
  if (!taglines.length) return;
  const idx = taglines.findIndex((t) => t.id === state.taglineId);
  const next = taglines[(idx + 1) % taglines.length];
  state.taglineId = next.id;
  persist();
  paintInputs();
  render();
}

function randomTagline() {
  if (!taglines.length) return;
  let next = state.taglineId;
  if (taglines.length > 1) {
    while (next === state.taglineId) {
      next = taglines[Math.floor(Math.random() * taglines.length)].id;
    }
  }
  state.taglineId = next;
  persist();
  paintInputs();
  render();
}

function reset() {
  const ok = window.confirm("Clear all fields and reset the tagline?");
  if (!ok) return;
  state = { ...DEFAULTS };
  remove(STORAGE_KEY);
  ensureTaglineId();
  paintInputs();
  render();
  flash("reset");
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function render() {
  const sig = buildSignature();
  const preview = document.getElementById("sig-preview");
  if (preview) preview.innerHTML = sig.html;
  setText("sig-html", sig.html);
  setText("sig-text", sig.text);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function currentTagline() {
  return (
    taglines.find((t) => t.id === state.taglineId) ||
    pickByDate(taglines)
  );
}

// Build both the HTML and plain-text variants. The HTML uses inline styles
// only and a table-based layout — that's the lowest common denominator that
// survives Gmail, Apple Mail, and Outlook (web + desktop) without restyling.
function buildSignature() {
  const tagline = currentTagline();
  const name = state.name.trim() || "Your name";
  const role = state.role.trim();
  const handle = state.handle.trim();
  const email = state.email.trim();
  const handleLink = resolveHandleLink(handle);
  const portal = `${PORTAL_URL}/${UTM_SUFFIX}`;

  const html = renderHTML({
    name,
    role,
    email,
    handle,
    handleLink,
    tagline: tagline.text,
    badge: state.badge,
    portal,
  });
  const text = renderText({
    name,
    role,
    email,
    handle,
    tagline: tagline.text,
    badge: state.badge,
    portal,
  });
  return { html, text };
}

function resolveHandleLink(handle) {
  if (!handle) return "";
  if (handle.startsWith("http://") || handle.startsWith("https://")) {
    return handle;
  }
  if (handle.startsWith("@")) {
    return `https://www.google.com/search?q=${encodeURIComponent(handle)}`;
  }
  if (handle.includes(".")) {
    return `https://${handle}`;
  }
  return "";
}

function renderHTML(p) {
  const ink = "#0a0a0a";
  const soft = "#444";
  const accent = "#d6202b";
  const muted = "#777";
  const fontStack =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

  const nameLine = `<strong style="color:${ink};font-weight:700;">${escapeHTML(p.name)}</strong>`;
  const roleLine = p.role
    ? `<span style="color:${soft};">&nbsp;&middot;&nbsp;${escapeHTML(p.role)}</span>`
    : "";

  const contactBits = [];
  if (p.email) {
    contactBits.push(
      `<a href="mailto:${escapeAttr(p.email)}" style="color:${soft};text-decoration:none;">${escapeHTML(p.email)}</a>`,
    );
  }
  if (p.handle) {
    if (p.handleLink && isHttpUrl(p.handleLink)) {
      contactBits.push(
        `<a href="${escapeAttr(p.handleLink)}" style="color:${soft};text-decoration:none;">${escapeHTML(p.handle)}</a>`,
      );
    } else {
      contactBits.push(
        `<span style="color:${soft};">${escapeHTML(p.handle)}</span>`,
      );
    }
  }
  const contactLine = contactBits.length
    ? `<div style="margin-top:2px;font-family:${fontStack};font-size:13px;line-height:1.5;color:${soft};">${contactBits.join(' &nbsp;|&nbsp; ')}</div>`
    : "";

  const badgeBlock = p.badge
    ? `<tr><td style="padding-top:8px;"><a href="${escapeAttr(p.portal)}" style="text-decoration:none;"><img src="${escapeAttr(BADGE_URL)}" alt="I attended Punk Rock AI" width="120" height="40" style="display:block;border:0;outline:0;text-decoration:none;" /></a></td></tr>`
    : "";

  const portalLink = `<a href="${escapeAttr(p.portal)}" style="color:${accent};text-decoration:none;font-weight:600;">punkrockai.com</a>`;

  // The signature is wrapped in a single table — Outlook desktop does not
  // honour margin on top-level divs, but it does honour table cell padding.
  return [
    `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;font-family:${fontStack};font-size:14px;line-height:1.5;color:${ink};">`,
    `<tr><td style="padding:0;">`,
    `<div style="font-family:${fontStack};font-size:14px;line-height:1.5;color:${ink};">`,
    `${nameLine}${roleLine}`,
    `</div>`,
    contactLine,
    `<div style="margin-top:8px;padding-left:10px;border-left:3px solid ${accent};font-family:${fontStack};font-style:italic;font-size:13px;line-height:1.45;color:${ink};max-width:42em;">`,
    `&ldquo;${escapeHTML(p.tagline)}&rdquo;`,
    `</div>`,
    `<div style="margin-top:8px;font-family:${fontStack};font-size:12px;line-height:1.5;color:${muted};">`,
    `from <em style="color:${muted};">Punk Rock AI</em> &middot; ${portalLink}`,
    `</div>`,
    `</td></tr>`,
    badgeBlock,
    `</table>`,
  ].join("");
}

function renderText(p) {
  const lines = [];
  lines.push(p.role ? `${p.name} | ${p.role}` : p.name);
  const contact = [];
  if (p.email) contact.push(p.email);
  if (p.handle) contact.push(p.handle);
  if (contact.length) lines.push(contact.join(" | "));
  lines.push("");
  lines.push(`"${p.tagline}"`);
  lines.push("");
  lines.push(`from Punk Rock AI -- ${p.portal}`);
  if (p.badge) lines.push("[I attended Punk Rock AI]");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

async function copyRich() {
  const sig = buildSignature();
  // Rich copy uses the Clipboard API's text/html mime type so paste targets
  // that accept rich content (Gmail compose, Apple Mail) get the styled
  // signature, while plain-text targets get the fallback.
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({
        "text/html": new Blob([sig.html], { type: "text/html" }),
        "text/plain": new Blob([sig.text], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      flash("rich signature copied");
      return;
    }
  } catch (err) {
    console.warn("[sig] rich copy failed, falling back:", err);
  }
  // Fallback: select the rendered preview and execCommand('copy'). This
  // preserves formatting in browsers that lack ClipboardItem.
  selectPreviewAndCopy();
}

function selectPreviewAndCopy() {
  const node = document.getElementById("sig-preview");
  if (!node) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  try {
    document.execCommand("copy");
    flash("rich signature copied");
  } catch (err) {
    flash("copy failed - try Copy raw HTML");
  }
  sel.removeAllRanges();
}

async function copyHtml() {
  const sig = buildSignature();
  await writeText(sig.html, "raw HTML copied");
}

async function copyText() {
  const sig = buildSignature();
  await writeText(sig.text, "plain text copied");
}

async function writeText(value, ok) {
  try {
    await navigator.clipboard.writeText(value);
    flash(ok);
  } catch (err) {
    console.warn("[sig] writeText failed:", err);
    flash("copy failed - select and copy from the box below");
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function flash(msg) {
  const el = document.getElementById("sig-status");
  if (!el) return;
  el.textContent = msg;
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.textContent = "";
  }, 2500);
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(str) {
  return escapeHTML(str);
}

// Protocol whitelist for user-supplied URLs. Defense-in-depth: keeps
// javascript:/data:/vbscript: out of href= even if upstream resolution
// changes. URL parsing (not prefix match) handles whitespace/case tricks
// like " javascript:..." or "JaVaScRiPt:".
function isHttpUrl(str) {
  try {
    const u = new URL(String(str));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
