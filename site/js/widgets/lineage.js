// /lineage — load lineage.json, render beats with refrains between, attach
// IntersectionObserver so each panel reveals once. No fancy parallax — the
// reveal + tinted background is enough to make the timeline feel alive.

const beatsEl = document.getElementById("beats");
const trailEl = document.getElementById("trail");
const subThesisEl = document.getElementById("sub-thesis");
const refrainEl = document.getElementById("refrain");

main();

async function main() {
  try {
    const res = await fetch("/data/lineage.json");
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const data = await res.json();
    if (subThesisEl && data.subThesis) {
      subThesisEl.textContent = data.subThesis;
    }
    if (refrainEl && data.refrain) {
      refrainEl.textContent = data.refrain;
    }
    renderTrail(data.beats);
    renderBeats(data);
    observeBeats();
  } catch (err) {
    if (beatsEl) {
      beatsEl.innerHTML = `<p class="kicker">lineage data unavailable.</p>`;
    }
    console.warn("[lineage]", err);
  }
}

function renderTrail(beats) {
  if (!trailEl) return;
  trailEl.innerHTML = beats
    .map(
      (b) =>
        `<a href="#beat-${escapeAttr(b.id)}">${escapeHTML(b.era)}</a>`
    )
    .join("");
}

function renderBeats(data) {
  if (!beatsEl) return;
  const out = [];
  data.beats.forEach((beat, i) => {
    out.push(renderBeat(beat));
    if (i < data.beats.length - 1) {
      out.push(refrainHTML(data.refrain));
    }
  });
  beatsEl.innerHTML = out.join("");
}

function renderBeat(b) {
  return `
    <article class="beat" id="beat-${escapeAttr(b.id)}" data-on="false">
      <div class="wrap">
        <div class="beat__grid">
          <header>
            <p class="beat__year">${escapeHTML(b.year)}</p>
            <span class="beat__era">${escapeHTML(b.era)}</span>
            ${b.place ? `<span class="beat__place">${escapeHTML(b.place)}</span>` : ""}
          </header>
          <div class="beat__body">
            <h2>${escapeHTML(b.title)}</h2>
            <p class="beat__prose">${escapeHTML(b.body)}</p>
            <dl class="beat__split">
              <div>
                <dt>The tool</dt>
                <dd>${escapeHTML(b.tool)}</dd>
              </div>
              <div>
                <dt>The refusal</dt>
                <dd>${escapeHTML(b.refusal)}</dd>
              </div>
            </dl>
            ${
              b.voices && b.voices.length
                ? `<p class="beat__voices"><strong>Voices</strong>${b.voices
                    .map((v) => `<span> · ${escapeHTML(v)}</span>`)
                    .join("")}</p>`
                : ""
            }
            ${
              b.citation
                ? `<p class="beat__citation">↳ ${escapeHTML(b.citation)}</p>`
                : ""
            }
          </div>
        </div>
      </div>
    </article>
  `;
}

function refrainHTML(text) {
  return `
    <aside class="refrain" aria-hidden="true">
      <p class="refrain__text">${escapeHTML(text)}</p>
    </aside>
  `;
}

function observeBeats() {
  const beats = document.querySelectorAll(".beat");
  if (!beats.length) return;
  if (typeof IntersectionObserver === "undefined") {
    beats.forEach((b) => b.setAttribute("data-on", "true"));
    return;
  }
  const obs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.setAttribute("data-on", "true");
        }
      }
    },
    { threshold: 0.18, rootMargin: "0px 0px -10% 0px" }
  );
  beats.forEach((b) => obs.observe(b));
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
