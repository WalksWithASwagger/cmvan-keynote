// Daily refrain — pick one of the 19 quotes per calendar day, deterministic
// by date. Render into the banner at the top of /. Anchors back to its
// slide on /talk via the existing #q-NN-slug fragment scheme.

const root = document.getElementById("daily-refrain");
if (root) main();

async function main() {
  try {
    const res = await fetch("/data/quotes.json", { credentials: "same-origin" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const quotes = Array.isArray(data?.quotes) ? data.quotes : [];
    if (!quotes.length) throw new Error("no quotes");
    const pick = pickForToday(quotes);
    render(pick);
  } catch (err) {
    console.warn("[daily-refrain]", err);
    root.dataset.state = "error";
  }
}

// daysSinceEpoch in the user's local timezone, modulo quote count.
// Whole-day boundary in their wall clock so a single user sees the same
// refrain all day, then a fresh one tomorrow.
function pickForToday(quotes) {
  const now = new Date();
  const tzMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.floor(tzMidnight.getTime() / 86400000);
  const idx = ((days % quotes.length) + quotes.length) % quotes.length;
  return quotes[idx];
}

function render(quote) {
  const linkEl = root.querySelector("[data-refrain-link]");
  const citeEl = root.querySelector("[data-refrain-cite]");
  if (!linkEl || !quote) return;
  linkEl.textContent = quote.text || "";
  if (quote.id) linkEl.setAttribute("href", `/talk.html#${quote.id}`);
  if (citeEl) {
    const parts = [];
    if (quote.slideTitle) parts.push(quote.slideTitle);
    if (quote.slide) parts.push(`slide ${quote.slide}`);
    citeEl.textContent = parts.length ? `↳ ${parts.join(" · ")}` : "";
  }
  root.dataset.state = "ready";
}
