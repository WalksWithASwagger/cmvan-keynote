// /widgets/in-there.html — heuristic "Am I in there?" check.
//
// Privacy: nothing leaves the browser. The URL the user pastes is parsed
// locally with `new URL()`; no fetch is made against it. The verdict is
// purely a date-window + content-type match against a hand-curated list of
// publicly documented training corpora (site/data/training-corpora.json).
//
// We deliberately do NOT emit a numeric score. The verdict is tri-state —
// likely / possibly / unlikely — because the underlying signal (crawl window
// overlap) only supports that level of resolution. Pretending to more
// precision would betray the whole point of the widget.

const DATA_URL = "/data/training-corpora.json";
const CURRENT_YEAR = new Date().getUTCFullYear();

const form = document.getElementById("ait-form");
const urlField = document.querySelector('[data-mode="url"]');
const contentField = document.querySelector('[data-mode="content"]');
const urlInput = document.getElementById("ait-url");
const yearInput = document.getElementById("ait-year");
const statusEl = document.getElementById("ait-status");
const verdictEl = document.getElementById("ait-verdict");
const corporaGrid = document.getElementById("ait-corpora-grid");
const optoutList = document.getElementById("ait-optout-list");

let corpora = [];
let optOutTools = [];

init();

async function init() {
  wireModeToggle();
  wireForm();
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`corpora fetch ${res.status}`);
    const data = await res.json();
    corpora = Array.isArray(data?.corpora) ? data.corpora : [];
    optOutTools = Array.isArray(data?.optOutTools) ? data.optOutTools : [];
    renderCorporaGrid();
    renderOptOutList();
  } catch (err) {
    console.warn("[in-there] failed to load corpora data:", err);
    flash("couldn't load the corpora list — refresh the page");
  }
}

// ---------------------------------------------------------------------------
// Mode toggle: URL vs free-form content

function wireModeToggle() {
  const radios = form.querySelectorAll('input[name="ait-mode"]');
  radios.forEach((r) => r.addEventListener("change", paintMode));
  paintMode();
}

function paintMode() {
  const mode = form.querySelector('input[name="ait-mode"]:checked')?.value;
  urlField.hidden = mode !== "url";
  contentField.hidden = mode !== "content";
}

// ---------------------------------------------------------------------------
// Submit handler

function wireForm() {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    runCheck();
  });
  form.addEventListener("reset", () => {
    setTimeout(() => {
      verdictEl.innerHTML = "";
      flash("");
      paintMode();
    }, 0);
  });
}

function runCheck() {
  const mode = form.querySelector('input[name="ait-mode"]:checked')?.value;
  const yearInputValue = parseInt(yearInput.value, 10);

  let year = Number.isFinite(yearInputValue) ? yearInputValue : null;
  let domain = null;
  let type;

  if (mode === "url") {
    const raw = (urlInput.value || "").trim();
    if (!raw) {
      flash("paste a URL or switch to the content mode");
      return;
    }
    const parsed = parseURL(raw);
    if (!parsed) {
      flash("that doesn't parse as a URL — include the https:// part");
      return;
    }
    domain = parsed.host;
    if (!year) year = parsed.yearGuess;
    type = guessTypeFromDomain(domain);
  } else {
    type = form.querySelector('input[name="ait-type"]:checked')?.value || "text";
  }

  if (!year) {
    flash("give us a rough year — without a date we can't tell which windows overlap");
    return;
  }
  if (year < 1995 || year > CURRENT_YEAR) {
    flash(`year ${year} is out of range (1995–${CURRENT_YEAR})`);
    return;
  }

  const matches = corpora.map((corpus) => evaluate(corpus, { year, type }));
  renderVerdict({ mode, domain, year, type, matches });
  flash("");
}

// ---------------------------------------------------------------------------
// Heuristic: does this corpus plausibly include work of `type` published in `year`?

function evaluate(corpus, { year, type }) {
  const startYear = parseYear(corpus.windowStart);
  const endYear = corpus.windowEnd === "present" ? CURRENT_YEAR : parseYear(corpus.windowEnd);
  const dateOverlap = year >= startYear && year <= endYear;
  const typeMatch = matchesType(corpus.type, type);

  let verdict;
  if (!typeMatch) {
    verdict = "n/a";
  } else if (dateOverlap) {
    verdict = "likely";
  } else if (year < startYear) {
    verdict = "unlikely"; // pre-dates the corpus's earliest crawl
  } else {
    // year > endYear — corpus is frozen and your work came later
    verdict = "unlikely";
  }

  return { corpus, verdict, dateOverlap, typeMatch, startYear, endYear };
}

function matchesType(corpusType, userType) {
  if (corpusType === userType) return true;
  // text corpora include code that lives on the open web (Stack Overflow,
  // blog tutorials) — but the dedicated code corpora are the better signal.
  return false;
}

// ---------------------------------------------------------------------------
// URL parsing

function parseURL(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    try {
      url = new URL("https://" + raw);
    } catch {
      return null;
    }
  }
  const host = url.hostname.replace(/^www\./, "");
  const yearGuess = guessYearFromPath(url.pathname);
  return { host, yearGuess };
}

function guessYearFromPath(pathname) {
  // Common patterns: /2018/03/post-title, /blog/2020-01-15-title, /posts/2014/
  const match = pathname.match(/(?:^|[/_-])(19[9]\d|20[0-3]\d)(?:[/_-]|$)/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  if (!Number.isFinite(year)) return null;
  if (year < 1995 || year > CURRENT_YEAR) return null;
  return year;
}

function guessTypeFromDomain(host) {
  if (/github\.com$|gitlab\.com$|bitbucket\.org$/.test(host)) return "code";
  if (/(flickr|500px|unsplash|deviantart|behance|artstation|pixiv)\./.test(host)) return "image";
  if (/(amazon\.com.*\/dp\/|goodreads\.com|gutenberg\.org)/.test(host)) return "books";
  return "text";
}

function parseYear(yyyymm) {
  const m = String(yyyymm || "").match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : 0;
}

// ---------------------------------------------------------------------------
// Render: verdict

function renderVerdict({ mode, domain, year, type, matches }) {
  const likely = matches.filter((m) => m.verdict === "likely");
  const unlikely = matches.filter((m) => m.verdict === "unlikely");

  const headline = likely.length > 0
    ? `Plausibly inside ${likely.length} of the major ${type} corpora.`
    : `No corpus we list has a crawl window that overlaps ${year} for ${type}.`;

  const subhead = mode === "url"
    ? `Domain: ${escapeHTML(domain || "—")} &middot; Year: ${year} &middot; Type: ${type}`
    : `Year: ${year} &middot; Type: ${type}`;

  const likelyHTML = likely.length
    ? `<h3>Likely included</h3>
       <ul class="ait__verdict__list ait__verdict__list--likely">
         ${likely.map(renderRow).join("")}
       </ul>`
    : "";

  const unlikelyHTML = unlikely.length
    ? `<h3>Unlikely &mdash; date doesn&rsquo;t line up</h3>
       <ul class="ait__verdict__list ait__verdict__list--unlikely">
         ${unlikely.map(renderRow).join("")}
       </ul>`
    : "";

  const reminder = `<p class="ait__verdict__reminder">
    A &ldquo;likely&rdquo; verdict means the corpus&rsquo;s public crawl
    window overlaps the year you gave. It does not prove your work is in any
    specific dataset, and it does not prove any model has memorized it.
    Use the opt-out tools below to steer what gets swept next.
  </p>`;

  verdictEl.innerHTML = `
    <p class="ait__verdict__head">${escapeHTML(headline)}</p>
    <p class="ait__verdict__sub">${subhead}</p>
    ${likelyHTML}
    ${unlikelyHTML}
    ${reminder}
  `;
  verdictEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderRow({ corpus, startYear, endYear }) {
  const window = endYear >= CURRENT_YEAR ? `${startYear}–present` : `${startYear}–${endYear}`;
  return `
    <li class="ait__row">
      <a class="ait__row__name" href="${escapeAttr(corpus.link)}" target="_blank" rel="noopener noreferrer">${escapeHTML(corpus.name)}</a>
      <span class="ait__row__window">${window}</span>
      <span class="ait__row__swept">${escapeHTML(corpus.kind)}</span>
    </li>
  `;
}

// ---------------------------------------------------------------------------
// Render: reference grid + opt-out list

function renderCorporaGrid() {
  if (!corporaGrid) return;
  corporaGrid.innerHTML = corpora.map((c) => {
    const window = c.windowEnd === "present" ? `${parseYear(c.windowStart)}–present` : `${parseYear(c.windowStart)}–${parseYear(c.windowEnd)}`;
    return `
      <article class="ait-corpus" data-type="${escapeAttr(c.type)}">
        <header>
          <h3><a href="${escapeAttr(c.link)}" target="_blank" rel="noopener noreferrer">${escapeHTML(c.name)}</a></h3>
          <p class="ait-corpus__meta">${escapeHTML(c.type)} &middot; ${escapeHTML(c.kind)} &middot; ${window}</p>
        </header>
        <p class="ait-corpus__swept">${escapeHTML(c.swept)}</p>
        <p class="ait-corpus__optout"><strong>Opt-out:</strong> ${escapeHTML(c.optOut)}</p>
      </article>
    `;
  }).join("");
}

function renderOptOutList() {
  if (!optoutList) return;
  optoutList.innerHTML = optOutTools.map((tool) => `
    <li class="ait-optout__item">
      <a href="${escapeAttr(tool.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(tool.name)}</a>
      <span class="ait-optout__by">by ${escapeHTML(tool.by)}</span>
      <p>${escapeHTML(tool.covers)}</p>
    </li>
  `).join("");
}

// ---------------------------------------------------------------------------
// Status flash

let flashTimer;
function flash(msg) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  clearTimeout(flashTimer);
  if (msg) {
    flashTimer = setTimeout(() => {
      statusEl.textContent = "";
    }, 5000);
  }
}

// ---------------------------------------------------------------------------
// Escaping

function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(s) {
  return escapeHTML(s).replaceAll('"', "&quot;");
}
