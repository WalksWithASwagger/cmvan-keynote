// /widgets/pattern-graph — D3 force-directed cluster of the Punk Rock AI
// lineage. Era-nodes from /data/lineage.json. Move-edges from /data/moves.json.
// Hover a node → era citation. Click a move-edge → cross-era manifestations.
// Force settles via alphaMin so the simulation doesn't render-thrash forever.
//
// Tokens-only colours via CSS — JS just reads custom properties off :root so
// any future theme rebrand carries through without touching this file.

const svgEl = document.getElementById("pg-svg");
const legendEl = document.getElementById("pg-legend");
const hintEl = document.getElementById("pg-hint");
const panelEl = document.getElementById("pg-panel");

const VIEW_W = 800;
const VIEW_H = 560;

main();

async function main() {
  if (!svgEl || !panelEl) return;
  try {
    const [lineage, moves] = await Promise.all([
      fetchJSON("/data/lineage.json"),
      fetchJSON("/data/moves.json"),
    ]);
    if (typeof window.d3 === "undefined") {
      throw new Error("d3 not loaded");
    }
    render(lineage, moves);
  } catch (err) {
    console.warn("[pattern-graph]", err);
    panelEl.innerHTML = `<p class="pg__panel-empty">Pattern data unavailable. Reload to retry.</p>`;
    if (hintEl) hintEl.textContent = "data offline";
  }
}

async function fetchJSON(url) {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
  return res.json();
}

function render(lineage, moves) {
  const d3 = window.d3;

  // Build a stable node list from lineage.beats — id is the era slug.
  const beatById = new Map();
  const nodes = lineage.beats.map((b) => {
    const node = {
      id: b.id,
      era: b.era,
      year: b.year,
      place: b.place,
      title: b.title,
      body: b.body,
      tool: b.tool,
      refusal: b.refusal,
      voices: b.voices || [],
      citation: b.citation || "",
    };
    beatById.set(b.id, node);
    return node;
  });

  // Build edges from moves.json — only emit pairs where both endpoints are
  // present in lineage. Six moves × N(N-1)/2 pairs each = a tractable graph.
  // We tag each edge with its move id so legend toggles + click can target it.
  const moveById = new Map();
  const palette = movePalette(d3, moves.moves.length);
  moves.moves.forEach((m, i) => {
    moveById.set(m.id, { ...m, color: palette[i] });
  });

  const links = [];
  for (const move of moves.moves) {
    const eras = (move.manifestations || [])
      .map((x) => x.era)
      .filter((id) => beatById.has(id));
    for (let i = 0; i < eras.length; i++) {
      for (let j = i + 1; j < eras.length; j++) {
        links.push({
          source: eras[i],
          target: eras[j],
          moveId: move.id,
        });
      }
    }
  }

  const svg = d3.select(svgEl);
  svg.selectAll("*").remove();

  // <defs> not strictly needed — we colour links via attr. But group order
  // matters: links under nodes so node hit-targets stay clean.
  const linkLayer = svg.append("g").attr("class", "pg-link-layer");
  const nodeLayer = svg.append("g").attr("class", "pg-node-layer");

  const linkSel = linkLayer
    .selectAll("line")
    .data(links)
    .join("line")
    .attr("class", "pg-link")
    .attr("stroke", (d) => moveById.get(d.moveId).color)
    .attr("data-move", (d) => d.moveId)
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-label", (d) => {
      const m = moveById.get(d.moveId);
      return `Move: ${m.label}. Click to expand cross-era manifestations.`;
    });

  const nodeSel = nodeLayer
    .selectAll("g")
    .data(nodes, (d) => d.id)
    .join("g")
    .attr("class", "pg-node")
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-label", (d) => `Era: ${d.era}. Hover or focus to read citation.`);

  nodeSel.append("circle").attr("r", nodeRadius);
  nodeSel
    .append("text")
    .attr("dy", (d) => -nodeRadius(d) - 6)
    .attr("text-anchor", "middle")
    .text((d) => d.era);

  // Force simulation — capped alphaMin so it settles, plus a tick-bounded
  // hard stop after ~600 ticks as a belt-and-suspenders against thrash on
  // throttled tabs.
  const simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink(links)
        .id((d) => d.id)
        .distance(150)
        .strength(0.4)
    )
    .force("charge", d3.forceManyBody().strength(-360))
    .force("center", d3.forceCenter(VIEW_W / 2, VIEW_H / 2))
    .force("collide", d3.forceCollide().radius((d) => nodeRadius(d) + 18))
    .alphaMin(0.001)
    .alphaDecay(0.04);

  let tickCount = 0;
  simulation.on("tick", () => {
    tickCount++;
    // Constrain to viewBox so nodes don't drift offscreen on long sessions.
    nodes.forEach((n) => {
      const r = nodeRadius(n) + 4;
      n.x = Math.max(r, Math.min(VIEW_W - r, n.x));
      n.y = Math.max(r, Math.min(VIEW_H - r, n.y));
    });
    linkSel
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);
    nodeSel.attr("transform", (d) => `translate(${d.x},${d.y})`);
    if (tickCount > 600) simulation.stop();
  });

  // Drag — D3 v7 idiom.
  nodeSel.call(
    d3
      .drag()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      })
  );

  // ---------------- interactions ----------------

  let activeMove = null;
  let activeNode = null;

  function clearActive() {
    activeMove = null;
    activeNode = null;
    linkSel.classed("is-active", false).classed("is-dim", false);
    nodeSel.classed("is-active", false).classed("is-dim", false);
    legendEl
      ?.querySelectorAll(".pg__legend-item")
      .forEach((b) => b.setAttribute("aria-pressed", "false"));
  }

  function highlightMove(moveId) {
    activeMove = moveId;
    activeNode = null;
    linkSel
      .classed("is-active", (d) => d.moveId === moveId)
      .classed("is-dim", (d) => d.moveId !== moveId);
    const involved = new Set();
    links.forEach((l) => {
      if (l.moveId === moveId) {
        involved.add(typeof l.source === "object" ? l.source.id : l.source);
        involved.add(typeof l.target === "object" ? l.target.id : l.target);
      }
    });
    nodeSel.classed("is-dim", (d) => !involved.has(d.id));
    legendEl
      ?.querySelectorAll(".pg__legend-item")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          b.getAttribute("data-move") === moveId ? "true" : "false"
        )
      );
    renderMovePanel(moveById.get(moveId), beatById);
  }

  function showNode(node) {
    activeNode = node.id;
    nodeSel.classed("is-active", (d) => d.id === node.id);
    renderEraPanel(node);
  }

  // node hover + focus → era citation
  nodeSel
    .on("mouseenter", (_event, d) => showNode(d))
    .on("focus", (_event, d) => showNode(d))
    .on("mouseleave", () => {
      if (activeMove) {
        renderMovePanel(moveById.get(activeMove), beatById);
      } else if (!activeNode) {
        resetPanel();
      }
    })
    .on("blur", () => {
      // keep last-shown panel; don't blow it away on tab-out
    })
    .on("click", (event, d) => {
      event.stopPropagation();
      showNode(d);
    });

  // edge click → manifestations
  linkSel
    .on("click", (event, d) => {
      event.stopPropagation();
      if (activeMove === d.moveId) {
        clearActive();
        resetPanel();
      } else {
        highlightMove(d.moveId);
      }
    })
    .on("keydown", (event, d) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (activeMove === d.moveId) {
          clearActive();
          resetPanel();
        } else {
          highlightMove(d.moveId);
        }
      }
    });

  // svg blank-click clears
  svg.on("click", () => {
    clearActive();
    resetPanel();
  });

  // ---------------- legend ----------------

  if (legendEl) {
    legendEl.innerHTML = "";
    moves.moves.forEach((m) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pg__legend-item";
      btn.setAttribute("data-move", m.id);
      btn.setAttribute("aria-pressed", "false");
      const swatch = document.createElement("span");
      swatch.className = "pg__legend-swatch";
      swatch.style.color = moveById.get(m.id).color;
      btn.appendChild(swatch);
      btn.appendChild(document.createTextNode(m.label));
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (activeMove === m.id) {
          clearActive();
          resetPanel();
        } else {
          highlightMove(m.id);
        }
      });
      legendEl.appendChild(btn);
    });
  }
}

// ---------------- panel renderers (XSS-safe via escapeHTML) ----------------

function resetPanel() {
  if (!panelEl) return;
  panelEl.innerHTML = `<p class="pg__panel-empty">Hover an era&mdash;node to read its citation. Click a move&mdash;edge to see how the same gesture manifests across eras.</p>`;
}

function renderEraPanel(node) {
  if (!panelEl) return;
  const voices = node.voices && node.voices.length
    ? `<p class="pg__panel-cite"><strong>Voices</strong> &middot; ${node.voices
        .map((v) => escapeHTML(v))
        .join(" &middot; ")}</p>`
    : "";
  panelEl.innerHTML = `
    <p class="pg__panel-kicker">Era citation</p>
    <h2>${escapeHTML(node.era)}</h2>
    <p class="pg__panel-meta">
      <span>${escapeHTML(node.year || "")}</span>
      ${node.place ? `<span>${escapeHTML(node.place)}</span>` : ""}
    </p>
    <p><strong>${escapeHTML(node.title)}</strong></p>
    <p>${escapeHTML(node.body)}</p>
    <p class="pg__panel-cite">Tool &middot; ${escapeHTML(node.tool || "")}</p>
    <p class="pg__panel-cite">Refusal &middot; ${escapeHTML(node.refusal || "")}</p>
    ${voices}
    ${node.citation ? `<p class="pg__panel-cite">↳ ${escapeHTML(node.citation)}</p>` : ""}
  `;
}

function renderMovePanel(move, beatById) {
  if (!panelEl || !move) return;
  const items = (move.manifestations || [])
    .filter((m) => beatById.has(m.era))
    .map((m) => {
      const beat = beatById.get(m.era);
      return `
        <li>
          <span class="pg__manifest-era">${escapeHTML(beat.era)} &middot; ${escapeHTML(beat.year || "")}</span>
          <p>${escapeHTML(m.note)}</p>
        </li>
      `;
    })
    .join("");
  panelEl.innerHTML = `
    <p class="pg__panel-kicker">Move &middot; ${escapeHTML(move.label)}</p>
    <h2>${escapeHTML(move.label)}</h2>
    <p>${escapeHTML(move.description)}</p>
    <ul class="pg__manifest">${items}</ul>
  `;
}

// ---------------- helpers ----------------

function nodeRadius(d) {
  // AI is the present-tense node; nudge it larger so the eye lands there.
  return d.id === "ai" ? 22 : 18;
}

function movePalette(d3, n) {
  // Six-step ramp anchored on the brand accent. We don't read the CSS var
  // here because d3 needs concrete colour strings for stroke attr; the
  // accent is the same #e11d2e from theme.css. If the brand hue ever moves,
  // update both this anchor and --accent.
  const anchor = "#e11d2e";
  const colors = [
    anchor,
    "#f06f3a", // warm orange
    "#f4c542", // amber
    "#7bbf6a", // moss
    "#4ea3c4", // dusty teal
    "#b388dd", // muted violet
  ];
  if (n <= colors.length) return colors.slice(0, n);
  // Fallback ramp if we ever add more moves.
  return d3
    .quantize((t) => d3.interpolateRainbow(t * 0.85 + 0.05), n)
    .map((c) => c);
}

function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
