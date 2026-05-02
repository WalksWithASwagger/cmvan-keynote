#!/usr/bin/env node
// build-quotes.mjs — parse script/talk-framework-v6.md into:
//   site/data/quotes.json   ← 19 key lines + slide refs
//   site/data/slides.json   ← 22 slide stubs (titles, acts, frame notes)
// scripts/ingest-slides.mjs MERGES image refs into slides.json on top of this.
// Re-running this script is safe: it preserves any existing image fields.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const SOURCE = resolve(ROOT, "script/talk-framework-v6.md");
const OUT_QUOTES = resolve(ROOT, "site/data/quotes.json");
const OUT_SLIDES = resolve(ROOT, "site/data/slides.json");

const md = await readFile(SOURCE, "utf8");

const slides = parseSlides(md);
const acts = parseActs(md);
attachActs(slides, acts);
const quotes = parseKeyLines(md, slides);

const slidesOut = await mergeSlides(slides, OUT_SLIDES);
const quotesOut = {
  source: "script/talk-framework-v6.md",
  generated: new Date().toISOString(),
  count: quotes.length,
  quotes,
};

await mkdir(dirname(OUT_QUOTES), { recursive: true });
await writeFile(OUT_QUOTES, JSON.stringify(quotesOut, null, 2) + "\n");
await writeFile(
  OUT_SLIDES,
  JSON.stringify(
    {
      source: "script/talk-framework-v6.md",
      generated: new Date().toISOString(),
      count: slidesOut.length,
      slides: slidesOut,
    },
    null,
    2
  ) + "\n"
);

console.log(`wrote ${quotes.length} quotes → ${rel(OUT_QUOTES)}`);
console.log(`wrote ${slidesOut.length} slides → ${rel(OUT_SLIDES)}`);

const orphans = quotes.filter((q) => q.slide == null);
if (orphans.length) {
  console.warn(
    `\n${orphans.length} quote(s) could not be mapped to a slide:\n` +
      orphans.map((q) => `  • #${q.n} "${q.text.slice(0, 60)}…"`).join("\n")
  );
}

// ---------------------------------------------------------------------------

function parseSlides(text) {
  // **[SLIDE 12 — BOTH HANDS FULL]** ← THE FRAME
  const re = /\*\*\[SLIDE\s+(\d+)\s*[—–-]\s*([^\]]+)\]\*\*\s*(?:←\s*([^\n]+))?/g;
  const out = [];
  let m;
  while ((m = re.exec(text))) {
    out.push({
      n: Number(m[1]),
      id: `slide-${String(m[1]).padStart(2, "0")}`,
      title: m[2].trim(),
      note: m[3] ? m[3].trim() : null,
      _start: m.index + m[0].length,
    });
  }
  for (let i = 0; i < out.length; i++) {
    out[i]._end = i + 1 < out.length ? out[i + 1].index ?? out[i + 1]._start - 1 : text.length;
  }
  // recompute _end as start of next slide marker
  for (let i = 0; i < out.length; i++) {
    out[i]._end = i + 1 < out.length ? findStart(text, out[i + 1]) : text.length;
  }
  return out;
}

function findStart(text, slide) {
  // back up _start to the start of the **[SLIDE marker
  return text.lastIndexOf("**[SLIDE", slide._start);
}

function parseActs(text) {
  // ## ACT IV — THE WEIGHT (~3 min · Slides 13–14)
  const re = /^##\s+ACT\s+([IVX]+)\s*[—–-]\s*([^(\n]+?)(?:\s*\(([^)]+)\))?\s*$/gm;
  const out = [];
  let m;
  while ((m = re.exec(text))) {
    out.push({
      roman: m[1],
      name: m[2].trim(),
      meta: m[3] ? m[3].trim() : null,
      start: m.index,
    });
  }
  for (let i = 0; i < out.length; i++) {
    out[i].end = i + 1 < out.length ? out[i + 1].start : text.length;
  }
  return out;
}

function attachActs(slides, acts) {
  for (const s of slides) {
    const a = acts.find((a) => s._start >= a.start && s._start < a.end);
    s.act = a ? `Act ${a.roman} — ${a.name}` : null;
  }
}

function parseKeyLines(text, slides) {
  const idx = text.indexOf("## KEY LINES");
  if (idx === -1) throw new Error("missing KEY LINES section");
  const block = text.slice(idx);
  // numbered list of "..." lines, may use curly or straight quotes
  const re = /^\s*\d+\.\s+["“]([^"”]+)["”]\s*$/gm;
  const out = [];
  let m;
  while ((m = re.exec(block))) {
    const raw = m[1].trim();
    const slide = locateSlide(raw, text, slides);
    out.push({
      n: out.length + 1,
      id: `q-${String(out.length + 1).padStart(2, "0")}-${slugify(raw)}`,
      text: raw,
      slide: slide ? slide.n : null,
      slideId: slide ? slide.id : null,
      slideTitle: slide ? slide.title : null,
      act: slide ? slide.act : null,
    });
  }
  return out;
}

function locateSlide(quote, text, slides) {
  const fingerprint = normalize(quote).slice(0, 32);
  if (!fingerprint) return null;
  for (const s of slides) {
    const body = normalize(text.slice(s._start, s._end));
    if (body.includes(fingerprint)) return s;
  }
  return null;
}

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/[‘’“”'"`*_]/g, "")
    .replace(/\s+/g, " ");
}

function slugify(text) {
  return normalize(text)
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join("-");
}

async function mergeSlides(parsed, outPath) {
  const incoming = parsed.map((s) => ({
    id: s.id,
    n: s.n,
    title: s.title,
    note: s.note,
    act: s.act,
    alt: null,
    loRes: null,
    hiRes: null,
    prompt: null,
  }));
  if (!existsSync(outPath)) return incoming;
  try {
    const prev = JSON.parse(await readFile(outPath, "utf8"));
    if (!prev?.slides?.length) return incoming;
    const byId = new Map(prev.slides.map((s) => [s.id, s]));
    return incoming.map((s) => {
      const old = byId.get(s.id);
      if (!old) return s;
      // preserve image fields written by ingest-slides.mjs
      return { ...s, alt: old.alt ?? null, loRes: old.loRes ?? null, hiRes: old.hiRes ?? null, prompt: old.prompt ?? null };
    });
  } catch {
    return incoming;
  }
}

function rel(p) {
  return p.replace(ROOT + "/", "");
}
