// C5 — Map of the punk stack
// Renders an inline SVG diagram embedded in /recap.html. Hover (or focus, or
// tap) any node to see its real file path + line count from
// /data/punk-stack.json. No build step. No D3. Pure DOM APIs.

const SVG_NS = "http://www.w3.org/2000/svg";
const VIEW_W = 960;
const VIEW_H = 360;
const COL_GAP = 36;
const COLS = 5;
const COL_W = (VIEW_W - COL_GAP * (COLS + 1)) / COLS; // ~165
const NODE_H = 26;
const NODE_GAP = 6;
const HEADER_Y = 28;
const NODES_TOP = 56;
const MAX_NODES_PER_COL = 8;

const root = document.getElementById("punk-stack-map");
if (root) main();

async function main() {
  try {
    const res = await fetch("/data/punk-stack.json");
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const data = await res.json();
    render(root, data);
  } catch (err) {
    console.warn("[punk-stack-map]", err);
    if (root) {
      const note = document.createElement("p");
      note.className = "punk-stack-map__hint";
      note.textContent = "Stack map unavailable.";
      root.appendChild(note);
    }
  }
}

function render(host, data) {
  const layers = (data.layers || []).slice(0, COLS);
  if (!layers.length) return;

  const svgWrap = host.querySelector("[data-stack-svg-wrap]");
  const tooltip = host.querySelector("[data-stack-tooltip]");
  if (!svgWrap || !tooltip) return;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "punk-stack-map__svg");
  svg.setAttribute("viewBox", `0 0 ${VIEW_W} ${VIEW_H}`);
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    "Diagram of the build pipeline: source markdown to build scripts to JSON manifests to page widgets to exports."
  );
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  // arrow-head marker once
  const defs = el("defs");
  const marker = el("marker", {
    id: "punk-stack-arrow",
    viewBox: "0 0 10 10",
    refX: "8",
    refY: "5",
    markerWidth: "7",
    markerHeight: "7",
    orient: "auto-start-reverse",
  });
  const arrowPath = el("path", {
    d: "M0,0 L10,5 L0,10 z",
    class: "punk-stack-map__arrow-head",
  });
  marker.appendChild(arrowPath);
  defs.appendChild(marker);
  svg.appendChild(defs);

  // measure column heights so layer panels and arrows align
  const cols = layers.map((layer, i) => {
    const items = layer.items.slice(0, MAX_NODES_PER_COL);
    const x = COL_GAP + i * (COL_W + COL_GAP);
    const colHeight =
      NODES_TOP + items.length * (NODE_H + NODE_GAP) - NODE_GAP + 14;
    return { layer, items, x, colHeight, index: i };
  });

  // background panels per layer
  cols.forEach((col) => {
    const bg = el("rect", {
      x: col.x - 8,
      y: 12,
      width: COL_W + 16,
      height: col.colHeight,
      rx: 2,
      ry: 2,
      class: "punk-stack-map__layer-bg",
    });
    svg.appendChild(bg);

    const headerText = el("text", {
      x: col.x + COL_W / 2,
      y: HEADER_Y,
      "text-anchor": "middle",
      class: "punk-stack-map__layer-label",
    });
    headerText.textContent = `0${col.index + 1} · ${col.layer.title}`;
    svg.appendChild(headerText);
  });

  // arrows between adjacent columns (drawn before nodes so nodes sit on top)
  for (let i = 0; i < cols.length - 1; i++) {
    const a = cols[i];
    const b = cols[i + 1];
    const midY = Math.max(a.colHeight, b.colHeight) / 2 + 6;
    const x1 = a.x + COL_W + 4;
    const x2 = b.x - 12;
    const arrow = el("line", {
      x1,
      y1: midY,
      x2,
      y2: midY,
      class: "punk-stack-map__arrow",
      "marker-end": "url(#punk-stack-arrow)",
    });
    svg.appendChild(arrow);
  }

  // nodes — boxes per file
  cols.forEach((col) => {
    col.items.forEach((item, j) => {
      const y = NODES_TOP + j * (NODE_H + NODE_GAP);
      const node = el("g", {
        class: "punk-stack-map__node",
        tabindex: "0",
        role: "button",
      });
      const lineLabel =
        item.lines > 0 ? `${item.lines} lines` : "no line count";
      node.setAttribute(
        "aria-label",
        `${col.layer.title}: ${item.path} — ${lineLabel}`
      );

      const rect = el("rect", {
        x: col.x,
        y,
        width: COL_W,
        height: NODE_H,
        rx: 1,
        ry: 1,
        class: "punk-stack-map__node-rect",
      });
      const label = el("text", {
        x: col.x + 8,
        y: y + NODE_H / 2 + 4,
        class: "punk-stack-map__node-text",
      });
      label.textContent = truncate(item.label || item.path, 22);

      node.appendChild(rect);
      node.appendChild(label);

      // dataset for tooltip
      node.dataset.path = item.path || "";
      node.dataset.lines = String(item.lines ?? 0);
      node.dataset.label = item.label || "";
      node.dataset.layer = col.layer.title || "";

      attachHandlers(node, host, tooltip);
      svg.appendChild(node);
    });
  });

  svgWrap.appendChild(svg);

  // dismiss tooltip on outside click (touch)
  document.addEventListener("click", (e) => {
    if (!host.contains(e.target)) hideTooltip(tooltip, host);
  });
}

function attachHandlers(node, host, tooltip) {
  const show = () => {
    showTooltip(tooltip, host, node);
  };
  const hide = () => {
    hideTooltip(tooltip, host, node);
  };
  node.addEventListener("mouseenter", show);
  node.addEventListener("mouseleave", hide);
  node.addEventListener("focus", show);
  node.addEventListener("blur", hide);
  node.addEventListener("click", (e) => {
    e.stopPropagation();
    // toggle on touch
    const wasActive = node.getAttribute("data-active") === "true";
    // clear other active
    host
      .querySelectorAll('.punk-stack-map__node[data-active="true"]')
      .forEach((n) => n.removeAttribute("data-active"));
    if (wasActive) {
      hide();
    } else {
      node.setAttribute("data-active", "true");
      show();
    }
  });
  node.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      show();
    } else if (e.key === "Escape") {
      hide();
    }
  });
}

function showTooltip(tooltip, host, node) {
  const path = node.dataset.path || "";
  const lines = Number(node.dataset.lines || 0);
  const label = node.dataset.label || "";
  const layer = node.dataset.layer || "";
  // populate via textContent — XSS-safe
  tooltip.replaceChildren();

  const pathEl = document.createElement("span");
  pathEl.className = "punk-stack-map__tooltip-path";
  pathEl.textContent = path;
  tooltip.appendChild(pathEl);

  const meta = document.createElement("span");
  meta.className = "punk-stack-map__tooltip-meta";
  meta.textContent =
    lines > 0 ? `${layer} · ${lines} lines` : `${layer} · artifact`;
  tooltip.appendChild(meta);

  if (label && label !== path) {
    const lbl = document.createElement("span");
    lbl.className = "punk-stack-map__tooltip-label";
    lbl.textContent = label;
    tooltip.appendChild(lbl);
  }

  // position: above the node, clamped to host bounds
  const hostRect = host.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  const cx = nodeRect.left + nodeRect.width / 2 - hostRect.left;
  const cy = nodeRect.top - hostRect.top;
  // clamp horizontally so the tooltip doesn't bleed off
  const minX = 12;
  const maxX = hostRect.width - 12;
  const x = Math.max(minX, Math.min(maxX, cx));
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${cy}px`;
  tooltip.setAttribute("data-visible", "true");
}

function hideTooltip(tooltip, host, node) {
  // don't hide while an active (clicked) node still owns it
  if (host && !node) {
    tooltip.removeAttribute("data-visible");
    return;
  }
  if (
    host &&
    host.querySelector('.punk-stack-map__node[data-active="true"]')
  ) {
    return;
  }
  tooltip.removeAttribute("data-visible");
}

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    node.setAttribute(k, String(v));
  }
  return node;
}

function truncate(s, n) {
  const str = String(s ?? "");
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}
