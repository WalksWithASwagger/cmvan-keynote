// /widgets/posse-builder — D3 force-directed posse graph.
// Self node fixed at centre. Posse orbits. Edges coloured by relationship.
// Add via form, remove via list or node click, drag to reposition. Saves to
// localStorage. PNG export rasterizes the SVG via canvas. Opt-in submission
// is stubbed pending real gallery wiring (issue #29).

import { load, save } from "/js/common/storage.js";

const STATE_KEY = "posse-builder";
const SEEDS_URL = "/data/posse-seeds.json";
const VIEW_W = 800;
const VIEW_H = 560;
const SVG_NS = "http://www.w3.org/2000/svg";
const SVG_EXPORT_STYLE_PROPS = [
  "color",
  "display",
  "fill",
  "fill-opacity",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "letter-spacing",
  "line-height",
  "opacity",
  "paint-order",
  "stroke",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "text-anchor",
  "visibility",
];

const svgEl = document.getElementById("pb-svg");
const legendEl = document.getElementById("pb-legend");
const listEl = document.getElementById("pb-list");
const formEl = document.getElementById("pb-form");
const nameInput = document.getElementById("pb-name");
const kindSelect = document.getElementById("pb-kind");
const exportBtn = document.getElementById("pb-export");
const resetBtn = document.getElementById("pb-reset");
const optinEl = document.getElementById("pb-optin");
const optinNoteEl = document.getElementById("pb-optin-note");

let state = null; // { self, nodes, links, relationships }
let simulation = null;
let linkSel = null;
let nodeSel = null;

main();

async function main() {
  if (!svgEl) return;
  if (typeof window.d3 === "undefined") {
    // d3 is loaded with `defer`; wait for it before booting.
    await waitForD3();
  }
  state = await loadState();
  renderLegend();
  renderList();
  renderGraph();
  bindControls();
}

async function waitForD3() {
  for (let i = 0; i < 50; i++) {
    if (typeof window.d3 !== "undefined") return;
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function loadState() {
  const persisted = load(STATE_KEY);
  if (persisted.ok && persisted.value && persisted.value.nodes) {
    return persisted.value;
  }
  try {
    const res = await fetch(SEEDS_URL, { credentials: "same-origin" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[posse-builder] seed fetch failed:", err);
    return fallbackSeeds();
  }
}

function fallbackSeeds() {
  return {
    self: { id: "self", label: "You", kind: "self" },
    nodes: [],
    links: [],
    relationships: [
      { id: "collaborator", label: "Collaborator", color: "#e11d2e" },
      { id: "mentor", label: "Mentor", color: "#f4c542" },
      { id: "foil", label: "Foil", color: "#7bbf6a" },
      { id: "audience", label: "Audience", color: "#4ea3c4" },
    ],
  };
}

function persist() {
  // Strip the runtime simulation fields (x/y/vx/vy/fx/fy) before persisting
  // so reload starts from a clean force layout. Keep self.fx/fy because those
  // are intentional pin coordinates.
  const clean = {
    self: state.self,
    relationships: state.relationships,
    nodes: state.nodes.map((n) => ({ id: n.id, label: n.label, kind: n.kind })),
    links: state.links.map((l) => ({
      source: typeof l.source === "object" ? l.source.id : l.source,
      target: typeof l.target === "object" ? l.target.id : l.target,
      kind: l.kind,
    })),
  };
  save(STATE_KEY, clean);
}

function colorFor(kind) {
  const r = state.relationships.find((x) => x.id === kind);
  return r ? r.color : "var(--muted)";
}

// ---------------- legend ----------------

function renderLegend() {
  if (!legendEl) return;
  legendEl.innerHTML = "";
  state.relationships.forEach((r) => {
    const item = document.createElement("span");
    item.className = "pb__legend-item";
    const swatch = document.createElement("span");
    swatch.className = "pb__legend-swatch";
    swatch.style.color = r.color;
    item.appendChild(swatch);
    item.appendChild(document.createTextNode(r.label));
    legendEl.appendChild(item);
  });
}

// ---------------- list ----------------

function renderList() {
  if (!listEl) return;
  listEl.innerHTML = "";
  if (state.nodes.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Posse empty. Add someone above.";
    li.style.color = "var(--muted)";
    listEl.appendChild(li);
    return;
  }
  for (const n of state.nodes) {
    const link = state.links.find(
      (l) =>
        (typeof l.source === "object" ? l.source.id : l.source) === "self" &&
        (typeof l.target === "object" ? l.target.id : l.target) === n.id
    );
    const kind = link ? link.kind : "collaborator";
    const li = document.createElement("li");
    const sw = document.createElement("span");
    sw.className = "pb__list-swatch";
    sw.style.background = colorFor(kind);
    const name = document.createElement("span");
    name.className = "pb__list-name";
    name.textContent = n.label;
    const kindEl = document.createElement("span");
    kindEl.className = "pb__list-kind";
    kindEl.textContent = kind;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "pb__list-remove";
    remove.setAttribute("aria-label", `Remove ${n.label}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => removeNode(n.id));
    li.append(sw, name, kindEl, remove);
    listEl.appendChild(li);
  }
}

// ---------------- graph ----------------

function renderGraph() {
  const d3 = window.d3;
  const svg = d3.select(svgEl);
  svg.selectAll("*").remove();

  const linkLayer = svg.append("g").attr("class", "pb-link-layer");
  const nodeLayer = svg.append("g").attr("class", "pb-node-layer");

  // Pin self to centre.
  state.self.fx = VIEW_W / 2;
  state.self.fy = VIEW_H / 2;

  const allNodes = [state.self, ...state.nodes];

  linkSel = linkLayer
    .selectAll("line")
    .data(state.links, (d) =>
      `${typeof d.source === "object" ? d.source.id : d.source}-${typeof d.target === "object" ? d.target.id : d.target}`
    )
    .join("line")
    .attr("class", "pb-link")
    .attr("stroke", (d) => colorFor(d.kind));

  nodeSel = nodeLayer
    .selectAll("g")
    .data(allNodes, (d) => d.id)
    .join("g")
    .attr("class", (d) =>
      d.kind === "self" ? "pb-node pb-node--self" : "pb-node"
    )
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-label", (d) =>
      d.kind === "self" ? "You (centre node)" : `${d.label}. Click to remove.`
    );

  nodeSel
    .append("circle")
    .attr("r", (d) => (d.kind === "self" ? 24 : 18));
  nodeSel
    .append("text")
    .attr("dy", (d) => -((d.kind === "self" ? 24 : 18) + 6))
    .attr("text-anchor", "middle")
    .text((d) => d.label);

  // click to remove (skip self)
  nodeSel.on("click", (event, d) => {
    event.stopPropagation();
    if (d.kind === "self") return;
    removeNode(d.id);
  });

  if (simulation) simulation.stop();
  simulation = d3
    .forceSimulation(allNodes)
    .force(
      "link",
      d3
        .forceLink(state.links)
        .id((d) => d.id)
        .distance(140)
        .strength(0.6)
    )
    .force("charge", d3.forceManyBody().strength(-340))
    .force("center", d3.forceCenter(VIEW_W / 2, VIEW_H / 2))
    .force("collide", d3.forceCollide().radius(28))
    .alphaMin(0.001)
    .alphaDecay(0.04);

  let tickCount = 0;
  simulation.on("tick", () => {
    tickCount++;
    allNodes.forEach((n) => {
      const r = (n.kind === "self" ? 24 : 18) + 4;
      n.x = Math.max(r, Math.min(VIEW_W - r, n.x));
      n.y = Math.max(r, Math.min(VIEW_H - r, n.y));
    });
    linkSel
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);
    nodeSel.attr("transform", (d) => `translate(${d.x},${d.y})`);
    if (tickCount > 800) simulation.stop();
  });

  // drag
  nodeSel.call(
    d3
      .drag()
      .on("start", function (event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d3.select(this).classed("is-dragging", true);
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", function (event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d3.select(this).classed("is-dragging", false);
        // Self stays pinned to centre. Others release.
        if (d.kind !== "self") {
          d.fx = null;
          d.fy = null;
        }
      })
  );
}

// ---------------- mutation ----------------

function addNode(label, kind) {
  const id = `n-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
  state.nodes.push({ id, label, kind: "person" });
  state.links.push({ source: "self", target: id, kind });
  persist();
  renderList();
  renderGraph();
}

function removeNode(id) {
  if (id === "self") return;
  state.nodes = state.nodes.filter((n) => n.id !== id);
  state.links = state.links.filter((l) => {
    const s = typeof l.source === "object" ? l.source.id : l.source;
    const t = typeof l.target === "object" ? l.target.id : l.target;
    return s !== id && t !== id;
  });
  persist();
  renderList();
  renderGraph();
}

// ---------------- export PNG ----------------

function exportPNG() {
  const svg = cloneSvgForExport();

  const xml = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = VIEW_W * scale;
    canvas.height = VIEW_H * scale;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = svg.style.backgroundColor || "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "posse.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    console.warn("[posse-builder] PNG export failed: SVG load error");
  };
  img.src = url;
}

function cloneSvgForExport() {
  const clone = svgEl.cloneNode(true);
  const bg = getComputedStyle(svgEl).backgroundColor || "#0a0a0a";

  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("width", VIEW_W);
  clone.setAttribute("height", VIEW_H);
  clone.style.backgroundColor = bg;

  inlineComputedSvgStyles(svgEl, clone);

  const background = document.createElementNS(SVG_NS, "rect");
  background.setAttribute("width", "100%");
  background.setAttribute("height", "100%");
  background.setAttribute("fill", bg);
  clone.insertBefore(background, clone.firstChild);
  return clone;
}

function inlineComputedSvgStyles(sourceRoot, cloneRoot) {
  const sourceEls = [sourceRoot, ...sourceRoot.querySelectorAll("*")];
  const cloneEls = [cloneRoot, ...cloneRoot.querySelectorAll("*")];

  sourceEls.forEach((sourceEl, index) => {
    const cloneEl = cloneEls[index];
    if (!cloneEl) return;
    const computed = getComputedStyle(sourceEl);
    SVG_EXPORT_STYLE_PROPS.forEach((prop) => {
      cloneEl.style.setProperty(prop, computed.getPropertyValue(prop));
    });
  });
}

// ---------------- opt-in submission stub ----------------

function submitTopologyStub() {
  // Anonymized topology: counts + edge kinds only. No labels, no IDs.
  const topology = {
    nodeCount: state.nodes.length,
    edgesByKind: state.relationships.reduce((acc, r) => {
      acc[r.id] = state.links.filter((l) => l.kind === r.id).length;
      return acc;
    }, {}),
    submittedAt: new Date().toISOString(),
  };
  console.info("[posse-builder] topology (stub, not sent):", topology);
  if (optinNoteEl) {
    optinNoteEl.textContent =
      "Recorded locally. Gallery endpoint not yet wired.";
  }
}

// ---------------- controls ----------------

function bindControls() {
  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const label = nameInput.value.trim();
    if (!label) return;
    addNode(label, kindSelect.value);
    nameInput.value = "";
    nameInput.focus();
  });

  exportBtn.addEventListener("click", exportPNG);

  resetBtn.addEventListener("click", async () => {
    state = await (async () => {
      try {
        const res = await fetch(SEEDS_URL, { credentials: "same-origin" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch {
        return fallbackSeeds();
      }
    })();
    persist();
    renderLegend();
    renderList();
    renderGraph();
  });

  optinEl.addEventListener("change", () => {
    if (optinEl.checked) {
      submitTopologyStub();
    } else if (optinNoteEl) {
      optinNoteEl.textContent = "";
    }
  });
}
