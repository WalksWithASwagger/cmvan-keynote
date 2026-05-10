// Signal — surface one slide or quote per day, deterministic by UTC date so
// every visitor sees the same signal on the same calendar day.

const root = document.getElementById("signal");
if (root) main();

const DAY_MS = 86400000;
let pool = [];
let lastTodayISO = utcDateISO(new Date());

async function main() {
  try {
    const [slidesRes, quotesRes] = await Promise.all([
      fetch("/data/slides.json", { credentials: "same-origin" }),
      fetch("/data/quotes.json", { credentials: "same-origin" }),
    ]);
    if (!slidesRes.ok || !quotesRes.ok) throw new Error("data fetch failed");
    const [slidesData, quotesData] = await Promise.all([slidesRes.json(), quotesRes.json()]);
    const slides = Array.isArray(slidesData?.slides) ? slidesData.slides : [];
    const quotes = Array.isArray(quotesData?.quotes) ? quotesData.quotes : [];
    if (!slides.length) throw new Error("no slides");
    pool = buildPool(slides, quotes);
    renderForCurrentURL();
    watchUTCDate();
    window.addEventListener("popstate", renderForCurrentURL);
  } catch (err) {
    console.warn("[signal]", err);
    root.dataset.state = "error";
  }
}

function buildPool(slides, quotes) {
  const items = [];
  const max = Math.max(slides.length, quotes.length);
  for (let i = 0; i < max; i += 1) {
    if (slides[i]) items.push({ kind: "slide", item: slides[i] });
    if (quotes[i]) items.push({ kind: "quote", item: quotes[i] });
  }
  return items;
}

function renderForCurrentURL() {
  const dateISO = selectedDateISO();
  const pick = pickForDate(dateISO);
  render(pick, dateISO);
}

function selectedDateISO() {
  const params = new URLSearchParams(window.location.search);
  const fromURL = params.get("d");
  return isISODate(fromURL) ? fromURL : utcDateISO(new Date());
}

function pickForDate(dateISO) {
  const days = daysSinceEpochUTC(dateISO);
  const idx = ((days % pool.length) + pool.length) % pool.length;
  return { ...pool[idx], idx };
}

function watchUTCDate() {
  window.setInterval(() => {
    const todayISO = utcDateISO(new Date());
    if (todayISO === lastTodayISO) return;
    lastTodayISO = todayISO;
    if (!new URLSearchParams(window.location.search).has("d")) renderForCurrentURL();
  }, 60000);
}

function render({ kind, item, idx }, dateISO) {
  if (!item) return;
  const dateEl = root.querySelector("[data-signal-date]");
  const titleEl = root.querySelector("[data-signal-title]");
  const actEl = root.querySelector("[data-signal-act]");
  const noteEl = root.querySelector("[data-signal-note]");
  const indexEl = root.querySelector("[data-signal-index]");
  const recapEl = root.querySelector("[data-signal-recap]");
  const talkEl = root.querySelector("[data-signal-talk]");
  const prevEl = root.querySelector("[data-signal-prev]");
  const nextEl = root.querySelector("[data-signal-next]");
  const todayEl = root.querySelector("[data-signal-today]");

  if (dateEl) {
    dateEl.setAttribute("datetime", dateISO);
    dateEl.textContent = formatUTCDate(dateISO);
  }

  if (kind === "quote") {
    if (titleEl) titleEl.textContent = item.text || "Quote of the day";
    if (actEl) actEl.textContent = item.act || "";
    setNote(noteEl, item.slideTitle ? `Quote from slide ${item.slide}: ${item.slideTitle}` : "");
    if (indexEl) indexEl.textContent = `Quote ${item.n ?? idx + 1} of ${pool.length} signals`;
    if (talkEl && item.id) talkEl.setAttribute("href", `/talk.html#${item.id}`);
  } else {
    if (titleEl) titleEl.textContent = item.title || "Slide of the day";
    if (actEl) actEl.textContent = item.act || "";
    setNote(noteEl, item.note || "");
    if (indexEl) {
      const n = typeof item.n === "number" ? item.n : idx + 1;
      indexEl.textContent = `Slide ${n} of ${pool.length} signals`;
    }
    if (talkEl && item.id) talkEl.setAttribute("href", `/talk.html#${item.id}`);
  }

  if (prevEl) prevEl.setAttribute("href", signalHref(addUTCDays(dateISO, -1)));
  if (nextEl) nextEl.setAttribute("href", signalHref(addUTCDays(dateISO, 1)));
  if (todayEl) {
    todayEl.setAttribute("href", "/signal");
    if (dateISO === utcDateISO(new Date())) {
      todayEl.setAttribute("aria-current", "date");
    } else {
      todayEl.removeAttribute("aria-current");
    }
  }
  if (recapEl) recapEl.setAttribute("href", "/recap.html#slides");

  const photoLayer = document.getElementById("signal-photo-layer");
  if (photoLayer) {
    const image = imageFor(item);
    photoLayer.style.backgroundImage = image ? `url('${image}')` : "";
    if (image) {
      photoLayer.style.backgroundPosition = "center center";
      photoLayer.style.backgroundSize = "cover";
      photoLayer.style.backgroundRepeat = "no-repeat";
    }
  }

  root.dataset.state = "ready";
}

function setNote(noteEl, text) {
  if (!noteEl) return;
  if (text) {
    noteEl.textContent = text;
    noteEl.hidden = false;
  } else {
    noteEl.hidden = true;
  }
}

function imageFor(item) {
  return item.hiRes || item.loRes || item.image || "";
}

function isISODate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && utcDateISO(date) === value;
}

function utcDateISO(date) {
  return date.toISOString().slice(0, 10);
}

function daysSinceEpochUTC(dateISO) {
  return Math.floor(Date.parse(`${dateISO}T00:00:00Z`) / DAY_MS);
}

function addUTCDays(dateISO, days) {
  return new Date(Date.parse(`${dateISO}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function formatUTCDate(dateISO) {
  return new Date(`${dateISO}T00:00:00Z`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function signalHref(dateISO) {
  return dateISO === utcDateISO(new Date()) ? "/signal" : `/signal?d=${dateISO}`;
}
