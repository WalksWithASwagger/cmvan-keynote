// /widgets/chainsaws — load chainsaws.json, render the anchor quote and
// six tool cards, attach IntersectionObserver so each card reveals once
// as it enters the viewport. Mirrors the lineage.js pattern: no deps,
// no inline handlers, escape every interpolation.

const heroQuoteText = document.getElementById("anchor-quote-text");
const heroQuoteSpeaker = document.getElementById("anchor-quote-speaker");
const heroQuoteContext = document.getElementById("anchor-quote-context");
const heroQuoteSource = document.getElementById("anchor-quote-source");
const thesisEl = document.getElementById("chainsaws-thesis");
const subEl = document.getElementById("chainsaws-sub");
const trailEl = document.getElementById("chainsaws-trail");
const listEl = document.getElementById("chainsaws-list");
const refrainEl = document.getElementById("chainsaws-refrain");

main();

async function main() {
  try {
    const res = await fetch("/data/chainsaws.json");
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const data = await res.json();
    renderAnchor(data.anchor);
    if (thesisEl && data.thesis) thesisEl.textContent = data.thesis;
    if (subEl && data.subThesis) subEl.textContent = data.subThesis;
    if (refrainEl && data.refrain) refrainEl.textContent = data.refrain;
    renderTrail(data.tools || []);
    renderTools(data);
    observeCards();
  } catch (err) {
    if (listEl) {
      listEl.innerHTML = `<li class="kicker">chainsaws data unavailable.</li>`;
    }
    console.warn("[chainsaws]", err);
  }
}

function renderAnchor(anchor) {
  if (!anchor) return;
  if (heroQuoteText) heroQuoteText.textContent = anchor.quote || "";
  if (heroQuoteSpeaker) heroQuoteSpeaker.textContent = anchor.speaker || "";
  if (heroQuoteContext) {
    heroQuoteContext.textContent = anchor.context
      ? ` — ${anchor.context}`
      : "";
  }
  if (heroQuoteSource) {
    const parts = [];
    if (anchor.source_path) parts.push(anchor.source_path);
    if (anchor.echo) parts.push(anchor.echo);
    heroQuoteSource.textContent = parts.length ? `↳ ${parts.join(" · ")}` : "";
  }
}

function renderTrail(tools) {
  if (!trailEl) return;
  trailEl.innerHTML = tools
    .map(
      (t) =>
        `<a href="#tool-${escapeAttr(t.id)}">${escapeHTML(t.name)}</a>`
    )
    .join("");
}

function renderTools(data) {
  if (!listEl) return;
  const tools = data.tools || [];
  const refrain = data.refrain || "";
  const out = [];
  tools.forEach((tool, i) => {
    out.push(renderTool(tool, i + 1));
    if (i < tools.length - 1 && refrain) {
      out.push(refrainHTML(refrain));
    }
  });
  listEl.innerHTML = out.join("");
}

function renderTool(t, index) {
  return `
    <li class="tool-card" id="tool-${escapeAttr(t.id)}" data-on="false">
      <div class="wrap">
        <article class="tool-card__inner">
          <header class="tool-card__head">
            <span class="tool-card__index">${escapeHTML(String(index).padStart(2, "0"))}</span>
            <div>
              <h2 class="tool-card__name">${escapeHTML(t.name)}</h2>
              <p class="tool-card__era">${escapeHTML(t.era)}</p>
            </div>
          </header>

          <div class="tool-card__split">
            <section class="tool-card__side tool-card__side--neutral">
              <p class="tool-card__label">The &ldquo;neutral&rdquo; framing</p>
              <p class="tool-card__prose">${escapeHTML(t.neutral_framing)}</p>
              ${
                t.neutral_source
                  ? `<p class="tool-card__source">↳ ${escapeHTML(t.neutral_source)}</p>`
                  : ""
              }
            </section>

            <section class="tool-card__side tool-card__side--wrong">
              <p class="tool-card__label tool-card__label--accent">Wrong on purpose</p>
              <p class="tool-card__prose">${escapeHTML(t.wrong_on_purpose)}</p>
              ${
                t.wrong_source
                  ? `<p class="tool-card__source">↳ ${escapeHTML(t.wrong_source)}</p>`
                  : ""
              }
            </section>
          </div>

          ${
            t.echo
              ? `<p class="tool-card__echo">${escapeHTML(t.echo)}</p>`
              : ""
          }
        </article>
      </div>
    </li>
  `;
}

function refrainHTML(text) {
  return `
    <li class="chainsaws-refrain" aria-hidden="true">
      <p class="chainsaws-refrain__text">${escapeHTML(text)}</p>
    </li>
  `;
}

function observeCards() {
  const cards = document.querySelectorAll(".tool-card");
  if (!cards.length) return;
  if (typeof IntersectionObserver === "undefined") {
    cards.forEach((c) => c.setAttribute("data-on", "true"));
    return;
  }
  const obs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.setAttribute("data-on", "true");
          obs.unobserve(e.target);
        }
      }
    },
    { threshold: 0.18, rootMargin: "0px 0px -10% 0px" }
  );
  cards.forEach((c) => obs.observe(c));
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
