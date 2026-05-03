// /widgets/junior-pipeline — load junior-pipeline.json, render two parallel
// ladders (old + new). Each rung holds a real example that surfaces on
// hover/tap. The bottom three rungs of the new ladder are visibly "eaten" —
// AI mark + cracked rung. IntersectionObserver staggers the reveal so the
// gap registers physically as you scroll.

const subThesisEl = document.getElementById("sub-thesis");
const warningEl = document.getElementById("warning");
const oldRungsEl = document.getElementById("rungs-old");
const newRungsEl = document.getElementById("rungs-new");
const closingTitleEl = document.getElementById("closing-title");
const closingBodyEl = document.getElementById("closing-body");

main();

async function main() {
  try {
    const res = await fetch("/data/junior-pipeline.json");
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const data = await res.json();

    if (subThesisEl && data.subThesis) {
      subThesisEl.textContent = data.subThesis;
    }
    if (warningEl && data.warning) {
      warningEl.textContent = data.warning;
    }
    if (closingTitleEl && data.closing && data.closing.title) {
      closingTitleEl.textContent = data.closing.title;
    }
    if (closingBodyEl && data.closing && data.closing.body) {
      closingBodyEl.textContent = data.closing.body;
    }

    renderLadder(oldRungsEl, data.rungs, "old");
    renderLadder(newRungsEl, data.rungs, "new");
    wireExpansion();
    observeRungs();
  } catch (err) {
    if (oldRungsEl) {
      oldRungsEl.innerHTML = `<li class="kicker">pipeline data unavailable.</li>`;
    }
    console.warn("[junior-pipeline]", err);
  }
}

function renderLadder(host, rungs, side) {
  if (!host || !Array.isArray(rungs)) return;
  // The old ladder reads bottom-to-top (you climb up). To make the visual
  // alignment between old/new identical we render top-to-bottom in DOM order
  // (master at the top, shoot-for-free at the bottom) by reversing — that
  // way the "eaten" rungs sit at the bottom of the new ladder, where the
  // ground used to be.
  const ordered = [...rungs].sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
  host.innerHTML = ordered
    .map((rung) => renderRung(rung, side))
    .join("");
}

function renderRung(rung, side) {
  const variant = rung[side] || {};
  const eaten = side === "new" && variant.eaten === true;
  const id = `rung-${escapeAttr(side)}-${escapeAttr(rung.id)}`;
  const order = rung.order ?? "";
  const labelText = rung.label || rung.id || "";
  const summary = variant.summary || "";
  const example = variant.example || "";
  const source = variant.source || "";

  const stateClass = [
    "rung",
    `rung--${escapeAttr(side)}`,
    eaten ? "rung--eaten" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <li class="${stateClass}" data-on="false" data-eaten="${eaten ? "true" : "false"}">
      <button
        type="button"
        class="rung__btn"
        id="${id}"
        aria-expanded="false"
        aria-controls="${id}-detail"
      >
        <span class="rung__order">${escapeHTML(String(order).padStart(2, "0"))}</span>
        <span class="rung__label">${escapeHTML(labelText)}</span>
        ${
          eaten
            ? `<span class="rung__mark" aria-label="Eaten by AI">EATEN BY AI</span>`
            : `<span class="rung__mark rung__mark--ok" aria-hidden="true">${escapeHTML(side === "new" ? "stands" : "rung")}</span>`
        }
        <span class="rung__bar" aria-hidden="true"></span>
      </button>
      <div
        class="rung__detail"
        id="${id}-detail"
        role="region"
        aria-labelledby="${id}"
        hidden
      >
        <p class="rung__summary">${escapeHTML(summary)}</p>
        ${
          example
            ? `<blockquote class="rung__example">${escapeHTML(example)}</blockquote>`
            : ""
        }
        ${
          source
            ? `<p class="rung__source">&#x21B3; <code>${escapeHTML(source)}</code></p>`
            : ""
        }
      </div>
    </li>
  `;
}

function wireExpansion() {
  const buttons = document.querySelectorAll(".rung__btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => toggleRung(btn));
    btn.addEventListener("mouseenter", () => openRung(btn));
    btn.addEventListener("focus", () => openRung(btn));
    // We deliberately don't auto-close on mouseleave — keeping it open
    // makes tap parity easier and lets readers compare across columns.
  });
  // Close all when ESC is pressed inside a rung.
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape") return;
    document.querySelectorAll(".rung__btn[aria-expanded='true']").forEach((b) => {
      closeRung(b);
    });
  });
}

function toggleRung(btn) {
  const expanded = btn.getAttribute("aria-expanded") === "true";
  if (expanded) closeRung(btn);
  else openRung(btn);
}

function openRung(btn) {
  if (btn.getAttribute("aria-expanded") === "true") return;
  btn.setAttribute("aria-expanded", "true");
  const detail = document.getElementById(btn.getAttribute("aria-controls"));
  if (detail) detail.hidden = false;
}

function closeRung(btn) {
  btn.setAttribute("aria-expanded", "false");
  const detail = document.getElementById(btn.getAttribute("aria-controls"));
  if (detail) detail.hidden = true;
}

function observeRungs() {
  const rungs = document.querySelectorAll(".rung");
  if (!rungs.length) return;
  if (typeof IntersectionObserver === "undefined") {
    rungs.forEach((r) => r.setAttribute("data-on", "true"));
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
    { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
  );
  rungs.forEach((r) => obs.observe(r));
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
