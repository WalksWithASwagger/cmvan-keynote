// Signal — surface one slide per day, deterministic by UTC date so every
// visitor sees the same slide on the same calendar day. Cycles through the
// full slide manifest once a year (index = dayOfYear % slides.length).

const root = document.getElementById("signal");
if (root) main();

async function main() {
  try {
    const res = await fetch("/data/slides.json", { credentials: "same-origin" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const slides = Array.isArray(data?.slides) ? data.slides : [];
    if (!slides.length) throw new Error("no slides");
    const pick = pickForToday(slides);
    render(pick, slides.length);
  } catch (err) {
    console.warn("[signal]", err);
    root.dataset.state = "error";
  }
}

// UTC dayOfYear keeps the pick stable across timezones — every visitor on the
// same UTC calendar day sees the same slide.
function dayOfYearUTC(date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((now - start) / 86400000);
}

function pickForToday(slides) {
  const day = dayOfYearUTC(new Date());
  const idx = ((day % slides.length) + slides.length) % slides.length;
  return { slide: slides[idx], idx };
}

function render({ slide, idx }, total) {
  if (!slide) return;
  const dateEl = root.querySelector("[data-signal-date]");
  const titleEl = root.querySelector("[data-signal-title]");
  const actEl = root.querySelector("[data-signal-act]");
  const noteEl = root.querySelector("[data-signal-note]");
  const indexEl = root.querySelector("[data-signal-index]");
  const recapEl = root.querySelector("[data-signal-recap]");
  const talkEl = root.querySelector("[data-signal-talk]");

  if (dateEl) {
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    dateEl.setAttribute("datetime", iso);
    dateEl.textContent = today.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  if (titleEl) titleEl.textContent = slide.title || "Slide of the day";
  if (actEl) actEl.textContent = slide.act || "";
  if (noteEl) {
    if (slide.note) {
      noteEl.textContent = slide.note;
      noteEl.hidden = false;
    } else {
      noteEl.hidden = true;
    }
  }
  if (indexEl) {
    const n = typeof slide.n === "number" ? slide.n : idx + 1;
    indexEl.textContent = `Slide ${n} of ${total}`;
  }
  if (talkEl && slide.id) {
    talkEl.setAttribute("href", `/talk.html#${slide.id}`);
  }
  if (recapEl) {
    recapEl.setAttribute("href", "/recap.html#slides");
  }

  const photoLayer = document.getElementById("signal-photo-layer");
  if (photoLayer && slide.image) {
    photoLayer.style.backgroundImage = `url('${slide.image}')`;
    photoLayer.style.backgroundPosition = "center center";
    photoLayer.style.backgroundSize = "cover";
    photoLayer.style.backgroundRepeat = "no-repeat";
  }

  root.dataset.state = "ready";
}
