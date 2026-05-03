// /widgets/both-hands-gallery.html — read-only wall of submitted Both Hands
// canvases. Each entry has a base64url `hash` (same format produced by
// /widgets/both-hands.html). We decode client-side and render mini-diptychs.
// Invalid hashes are skipped silently — never break the page on bad data.

const SLOT_COUNT = 5;
const EDITOR_PATH = "/widgets/both-hands.html";

const gridEl = document.getElementById("bhg-grid");
const statusEl = document.getElementById("bhg-status");

main();

async function main() {
  try {
    const res = await fetch("/data/both-hands-gallery.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const entries = Array.isArray(data?.entries) ? data.entries : [];
    renderEntries(entries);
  } catch (err) {
    console.warn("[both-hands-gallery]", err);
    setStatus("Gallery data unavailable.");
  }
}

function renderEntries(entries) {
  gridEl.innerHTML = "";
  let ok = 0;
  for (const entry of entries) {
    const decoded = decodeEntry(entry.hash);
    if (!decoded) continue;
    gridEl.appendChild(renderCard(entry, decoded));
    ok++;
  }
  if (ok === 0) {
    setStatus("No canvases on the wall yet.");
  } else {
    setStatus(`${ok} canvas${ok === 1 ? "" : "es"} on the wall.`);
  }
}

function renderCard(entry, state) {
  const li = document.createElement("li");
  li.className = "bhg-card";
  li.id = `bhg-${entry.id || ""}`;

  const editorUrl = `${EDITOR_PATH}#s=${entry.hash}`;
  const sigName = (state.name && state.name.trim()) || entry.submittedBy || "Anonymous punk";

  li.innerHTML = `
    <article class="bhg-card__inner">
      <div class="bhf-canvas bhg-canvas">
        <section class="bhf-side bhf-side--critique">
          <p class="bhf-side__eyebrow">In one hand &mdash; the critique</p>
          <h3>What I refuse to let go.</h3>
          <ol class="bhf-list bhg-list">${renderItems(state.critique)}</ol>
        </section>

        <div class="bhf-divider" aria-hidden="true">+</div>

        <section class="bhf-side bhf-side--capability">
          <p class="bhf-side__eyebrow">In the other &mdash; the capability</p>
          <h3>What I&rsquo;m building anyway.</h3>
          <ol class="bhf-list bhg-list">${renderItems(state.capability)}</ol>
        </section>

        <footer class="bhf-canvas__footer">
          <span><strong>Both hands full.</strong> &mdash; ${escapeHTML(sigName)}</span>
          <span class="bhf-canvas__sig">${escapeHTML(entry.submittedAt || "")}</span>
        </footer>
      </div>

      ${entry.note ? `<p class="bhg-card__note">${escapeHTML(entry.note)}</p>` : ""}

      <p class="bhg-card__actions">
        <a class="btn" href="${escapeAttr(editorUrl)}">Open in editor &rarr;</a>
      </p>
    </article>
  `;
  return li;
}

function renderItems(arr) {
  return arr
    .map((value, idx) => {
      const display = value && value.trim() ? escapeHTML(value) : "&mdash;";
      return `
        <li class="bhf-item bhg-item">
          <span class="bhf-item__num">${idx + 1}</span>
          <span class="bhg-item__text">${display}</span>
        </li>`;
    })
    .join("");
}

// ---------------------------------------------------------------------------

function decodeEntry(hash) {
  if (typeof hash !== "string" || !hash) return null;
  try {
    const json = base64UrlDecode(hash);
    const data = JSON.parse(json);
    if (!Array.isArray(data?.c) || !Array.isArray(data?.p)) return null;
    return {
      critique: padArray(data.c, SLOT_COUNT),
      capability: padArray(data.p, SLOT_COUNT),
      name: typeof data.n === "string" ? data.n : "",
    };
  } catch {
    return null;
  }
}

function base64UrlDecode(s) {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return decodeURIComponent(escape(atob(padded)));
}

function padArray(arr, n) {
  const out = arr.slice(0, n).map((v) => (typeof v === "string" ? v : ""));
  while (out.length < n) out.push("");
  return out;
}

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(s) {
  return escapeHTML(s);
}
