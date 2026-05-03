// /widgets/mastery-gym.html — daily one-cycle check-in. Streak counter,
// 16-week heatmap, per-cycle "kept / refused" tags, Markdown export of the
// last 30 cycles. Pure client-side, localStorage only, works offline.

import { load, save, debounceSave, remove } from "/js/common/storage.js";

const STORAGE_KEY = "gym:cycles";
const HEATMAP_WEEKS = 16; // ~112 days, today anchors the bottom-right cell
const EXPORT_LIMIT = 30;

// Day-boundary rule: a streak counts consecutive days ending today OR
// yesterday (24-hour grace). Missing two full calendar days breaks it.

const els = {
  form: document.getElementById("gym-form"),
  tried: document.getElementById("gym-tried"),
  feedback: document.getElementById("gym-feedback"),
  iterated: document.getElementById("gym-iterated"),
  kept: document.getElementById("gym-kept"),
  refused: document.getElementById("gym-refused"),
  status: document.getElementById("gym-status"),
  today: document.querySelector("[data-today]"),
  title: document.querySelector("[data-checkin-title]"),
  hint: document.querySelector("[data-checkin-hint]"),
  streak: document.querySelector('[data-stat="streak"]'),
  total: document.querySelector('[data-stat="total"]'),
  last: document.querySelector('[data-stat="last"]'),
  heatmap: document.getElementById("gym-heatmap"),
  preview: document.getElementById("gym-preview"),
  exportBtn: document.querySelector('[data-action="export-md"]'),
  copyBtn: document.querySelector('[data-action="copy-md"]'),
  resetBtn: document.querySelector('[data-action="reset"]'),
  saveBtn: document.querySelector('[data-action="save"]'),
  clearBtn: document.querySelector('[data-action="clear"]'),
};

let cycles = []; // [{ date, tried, feedback, iterated, kept, refused, ts }]
let editingDate = todayISO();

hydrate();
wireForm();
wireActions();
paintToday();
hydrateFormForDate(editingDate);
renderAll();

// ---------------------------------------------------------------------------

function hydrate() {
  const { value } = load(STORAGE_KEY, []);
  if (Array.isArray(value)) {
    cycles = value
      .filter((c) => c && typeof c.date === "string")
      .map(normalizeCycle);
  }
}

function persist() {
  save(STORAGE_KEY, cycles);
}

const debouncedPersist = debounceSave(STORAGE_KEY, 350);

function normalizeCycle(c) {
  return {
    date: c.date,
    tried: typeof c.tried === "string" ? c.tried : "",
    feedback: typeof c.feedback === "string" ? c.feedback : "",
    iterated: typeof c.iterated === "string" ? c.iterated : "",
    kept: typeof c.kept === "string" ? c.kept : "",
    refused: typeof c.refused === "string" ? c.refused : "",
    ts: typeof c.ts === "number" ? c.ts : Date.now(),
  };
}

// ---------------------------------------------------------------------------
// FORM

function wireForm() {
  if (!els.form) return;
  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    saveCycle();
  });
  els.clearBtn?.addEventListener("click", () => {
    setFormValues({ tried: "", feedback: "", iterated: "", kept: "", refused: "" });
    flash("form cleared");
  });

  // Live-save while typing into today's check-in (so a reload mid-thought
  // doesn't lose the draft). Only persist once at least one field has content,
  // so an idle blur doesn't create an empty row.
  for (const id of ["tried", "feedback", "iterated", "kept", "refused"]) {
    els[id]?.addEventListener("input", () => {
      if (editingDate !== todayISO()) return; // don't autosave when reviewing past
      const entry = buildEntry(editingDate);
      if (!hasContent(entry)) {
        // If today's row exists but all fields are now empty, drop it.
        const existed = cycles.some((c) => c.date === editingDate);
        if (existed) {
          cycles = cycles.filter((c) => c.date !== editingDate);
          debouncedPersist(cycles);
          paintStats();
          paintHeatmap();
        }
        return;
      }
      cycles = upsertCycle(entry);
      debouncedPersist(cycles);
      paintStats();
    });
  }
}

function saveCycle() {
  const entry = buildEntry(editingDate);
  if (!hasContent(entry)) {
    flash("nothing to save — write at least one field");
    return;
  }
  cycles = upsertCycle(entry);
  persist();
  paintStats();
  paintHeatmap();
  flash(editingDate === todayISO() ? "today's cycle saved" : `cycle saved for ${editingDate}`);
}

function buildEntry(date) {
  return {
    date,
    tried: (els.tried?.value || "").trim(),
    feedback: (els.feedback?.value || "").trim(),
    iterated: (els.iterated?.value || "").trim(),
    kept: (els.kept?.value || "").trim(),
    refused: (els.refused?.value || "").trim(),
    ts: Date.now(),
  };
}

function hasContent(entry) {
  return Boolean(entry.tried || entry.feedback || entry.iterated || entry.kept || entry.refused);
}

function upsertCycle(entry) {
  const next = cycles.slice();
  const idx = next.findIndex((c) => c.date === entry.date);
  if (idx >= 0) {
    next[idx] = { ...next[idx], ...entry };
  } else {
    next.push(entry);
  }
  next.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return next;
}

function setFormValues(v) {
  if (els.tried) els.tried.value = v.tried || "";
  if (els.feedback) els.feedback.value = v.feedback || "";
  if (els.iterated) els.iterated.value = v.iterated || "";
  if (els.kept) els.kept.value = v.kept || "";
  if (els.refused) els.refused.value = v.refused || "";
}

function hydrateFormForDate(date) {
  editingDate = date;
  const found = cycles.find((c) => c.date === date);
  setFormValues(found || { tried: "", feedback: "", iterated: "", kept: "", refused: "" });
  paintCheckinHeader();
}

function paintCheckinHeader() {
  if (!els.title || !els.hint) return;
  const isToday = editingDate === todayISO();
  if (isToday) {
    els.title.textContent = "Today's cycle";
    els.hint.textContent = "Five quick fields. Save updates today's entry — one cycle per calendar day.";
  } else {
    els.title.textContent = `Editing ${editingDate}`;
    els.hint.textContent = "You're reviewing a past day. Save to update that entry, or click today's cell to come back.";
  }
  if (els.saveBtn) {
    els.saveBtn.textContent = isToday ? "Save today's cycle" : `Save ${editingDate}`;
  }
}

// ---------------------------------------------------------------------------
// RENDER

function renderAll() {
  paintStats();
  paintHeatmap();
}

function paintToday() {
  if (els.today) els.today.textContent = formatHumanDate(new Date());
}

function paintStats() {
  if (els.streak) els.streak.textContent = String(currentStreak(cycles));
  if (els.total) els.total.textContent = String(cycles.length);
  if (els.last) {
    const last = cycles[cycles.length - 1];
    els.last.textContent = last ? last.date : "—";
  }
}

function paintHeatmap() {
  const grid = els.heatmap;
  if (!grid) return;
  grid.innerHTML = "";

  const today = startOfDay(new Date());
  // Layout: 7 rows × HEATMAP_WEEKS cols, today is bottom-right.
  // Bottom-right cell is today; we lay out column-by-column.
  const totalCells = HEATMAP_WEEKS * 7;
  const lastIdx = totalCells - 1; // bottom-right
  const dayMs = 86400000;

  const byDate = new Map(cycles.map((c) => [c.date, c]));
  const todayStr = isoDate(today);

  for (let i = 0; i < totalCells; i++) {
    const offset = lastIdx - i; // days before today
    const cellDate = new Date(today.getTime() - offset * dayMs);
    const dateStr = isoDate(cellDate);
    const cycle = byDate.get(dateStr);
    const intensity = intensityFor(cycle);
    const isToday = dateStr === todayStr;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `gym-cell gym-cell--l${intensity}`;
    if (!cycle) btn.classList.add("gym-cell--empty");
    if (isToday) btn.classList.add("gym-cell--today");
    btn.dataset.date = dateStr;
    const labelStatus = cycle ? "checked in" : "no cycle";
    btn.setAttribute("aria-label", `${dateStr} — ${labelStatus}`);
    btn.title = cycle
      ? `${dateStr} — ${summarize(cycle)}`
      : `${dateStr} — no cycle`;
    btn.addEventListener("click", () => {
      hydrateFormForDate(dateStr);
      els.tried?.focus();
      flash(`loaded ${dateStr}`);
    });
    grid.appendChild(btn);
  }
}

// 0–3 intensity buckets based on how many fields were filled.
function intensityFor(cycle) {
  if (!cycle) return 0;
  const filled = ["tried", "feedback", "iterated", "kept", "refused"].filter(
    (k) => (cycle[k] || "").trim().length > 0
  ).length;
  if (filled === 0) return 0;
  if (filled <= 1) return 1;
  if (filled <= 3) return 2;
  return 3;
}

function summarize(cycle) {
  const t = (cycle.tried || cycle.feedback || cycle.iterated || "").trim();
  if (!t) return "checked in";
  return t.length > 60 ? t.slice(0, 57) + "…" : t;
}

// ---------------------------------------------------------------------------
// STREAK

function currentStreak(list) {
  if (!list.length) return 0;
  const set = new Set(list.map((c) => c.date));
  const today = startOfDay(new Date());
  // Allow a 1-day grace: if today isn't logged but yesterday is, streak still
  // counts (so the counter doesn't blink to zero each morning before check-in).
  let cursor = new Date(today.getTime());
  if (!set.has(isoDate(cursor))) {
    cursor = new Date(cursor.getTime() - 86400000);
    if (!set.has(isoDate(cursor))) return 0;
  }
  let n = 0;
  while (set.has(isoDate(cursor))) {
    n += 1;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return n;
}

// ---------------------------------------------------------------------------
// EXPORT

function wireActions() {
  els.exportBtn?.addEventListener("click", () => {
    const md = buildMarkdown(cycles, EXPORT_LIMIT);
    if (!md) {
      flash("no cycles yet — log one first");
      return;
    }
    downloadMarkdown(md);
  });
  els.copyBtn?.addEventListener("click", async () => {
    const md = buildMarkdown(cycles, EXPORT_LIMIT);
    if (!md) {
      flash("no cycles yet — log one first");
      return;
    }
    if (els.preview) els.preview.textContent = md;
    try {
      await navigator.clipboard.writeText(md);
      flash("markdown copied to clipboard");
    } catch {
      flash("couldn't copy — preview shown below");
    }
  });
  els.resetBtn?.addEventListener("click", () => {
    if (!cycles.length) {
      flash("nothing to wipe");
      return;
    }
    const ok = window.confirm(
      `Wipe all ${cycles.length} cycle${cycles.length === 1 ? "" : "s"}? This can't be undone.`
    );
    if (!ok) return;
    cycles = [];
    remove(STORAGE_KEY);
    setFormValues({ tried: "", feedback: "", iterated: "", kept: "", refused: "" });
    if (els.preview) els.preview.textContent = "";
    renderAll();
    flash("cycles wiped");
  });
}

function buildMarkdown(list, limit) {
  if (!list.length) return "";
  // newest first, capped at `limit`
  const recent = list.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit);
  const today = todayISO();
  const lines = [];
  lines.push(`# Mastery Gym journal`);
  lines.push("");
  lines.push(`_Exported ${today} · ${recent.length} cycle${recent.length === 1 ? "" : "s"} · streak ${currentStreak(list)}_`);
  lines.push("");
  lines.push("> One cycle a day. Try. Feedback. Iterate. Speed isn't the point — judgment is.");
  lines.push("");
  for (const c of recent) {
    lines.push(`## ${c.date}`);
    lines.push("");
    if (c.tried) {
      lines.push(`**Tried.** ${stripMd(c.tried)}`);
      lines.push("");
    }
    if (c.feedback) {
      lines.push(`**Feedback.** ${stripMd(c.feedback)}`);
      lines.push("");
    }
    if (c.iterated) {
      lines.push(`**Iterated.** ${stripMd(c.iterated)}`);
      lines.push("");
    }
    if (c.kept) {
      lines.push(`- Kept: ${stripMd(c.kept)}`);
    }
    if (c.refused) {
      lines.push(`- Refused: ${stripMd(c.refused)}`);
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  return lines.join("\n");
}

function downloadMarkdown(md) {
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mastery-gym-${todayISO()}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  if (els.preview) els.preview.textContent = md;
  flash("markdown downloaded");
}

function stripMd(s) {
  // Keep markdown export clean: collapse whitespace, escape pipes, preserve content.
  return String(s).replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// UTIL

function todayISO() {
  return isoDate(new Date());
}

function isoDate(d) {
  // local-date ISO (YYYY-MM-DD), not UTC — a cycle "today" should match the
  // user's wall clock, not the timezone shift.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatHumanDate(d) {
  try {
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return isoDate(d);
  }
}

function flash(msg) {
  if (!els.status) return;
  els.status.textContent = msg;
  clearTimeout(flash._t);
  flash._t = setTimeout(() => {
    if (els.status) els.status.textContent = "";
  }, 3000);
}

// Defensive helpers — kept for any future innerHTML write that touches stored
// user input. Current renderers use textContent / dataset / setAttribute, so
// nothing user-controlled is interpolated as HTML, but these stay available.
// eslint-disable-next-line no-unused-vars
function escapeHTML(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
// eslint-disable-next-line no-unused-vars
function escapeAttr(s) {
  return escapeHTML(s);
}
