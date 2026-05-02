#!/usr/bin/env node
// build-audio-cues.mjs — parses dress-rehearsal/elevenlabs-full-script.md
// into per-slide cue points. Emits site/data/audio-cues.json with shape
//
//   { slideId: { startMs, endMs, mp3Url, length, words } }
//
// Section headings in the script don't carry slide numbers, so we map by
// title fuzzy-match against site/data/slides.json (already populated by
// build-quotes.mjs). Word counts approximate audio length at ~165 wpm —
// the read-rate the rehearsal script targets — until real mp3s land. When
// you set R2_PUBLIC_BASE in env, mp3Url fields populate to expected
// per-slide URLs (slides/<slideId>.mp3); the player gracefully degrades
// when those aren't reachable yet.

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const SCRIPT = resolve(ROOT, "dress-rehearsal/elevenlabs-full-script.md");
const SLIDES = resolve(ROOT, "site/data/slides.json");
const OUT = resolve(ROOT, "site/data/audio-cues.json");

const WPM = 165;
const PUBLIC_BASE = process.env.R2_PUBLIC_BASE || null;

if (!existsSync(SCRIPT)) die(`script not found: ${SCRIPT}`);
if (!existsSync(SLIDES)) die("site/data/slides.json missing — run build-quotes first.");

const md = await readFile(SCRIPT, "utf8");
const slidesPayload = JSON.parse(await readFile(SLIDES, "utf8"));
const slides = slidesPayload.slides;

// Pull each ## section heading as a candidate cue.
const sections = parseSections(md);
const cues = {};
let runningMs = 0;
let unmapped = [];

for (const sec of sections) {
  const slide = matchSlide(sec.title, slides);
  if (!slide) {
    unmapped.push(sec.title);
    continue;
  }
  const words = countWords(sec.body);
  const length = Math.max(2000, Math.round((words / WPM) * 60_000));
  const id = slide.id;
  cues[id] = {
    slideId: id,
    slideN: slide.n,
    section: sec.title,
    words,
    length,
    startMs: runningMs,
    endMs: runningMs + length,
    mp3Url: PUBLIC_BASE ? `${PUBLIC_BASE.replace(/\/$/, "")}/audio/${id}.mp3` : null,
  };
  runningMs += length;
}

const payload = {
  source: "dress-rehearsal/elevenlabs-full-script.md",
  generated: new Date().toISOString(),
  wpm: WPM,
  publicBase: PUBLIC_BASE,
  totalEstimatedMs: runningMs,
  totalEstimatedMinutes: Math.round((runningMs / 60_000) * 10) / 10,
  cues,
  unmappedSections: unmapped,
};

await writeFile(OUT, JSON.stringify(payload, null, 2) + "\n");
console.log(`wrote ${Object.keys(cues).length} cues → site/data/audio-cues.json`);
console.log(`estimated runtime: ${payload.totalEstimatedMinutes} min`);
if (unmapped.length) {
  console.log(`unmapped sections (${unmapped.length}):`);
  for (const u of unmapped) console.log(`  · ${u}`);
}

// ---------------------------------------------------------------------------

function parseSections(text) {
  const re = /^##\s+(.+?)\s*$/gm;
  const out = [];
  let m;
  while ((m = re.exec(text))) {
    out.push({ title: m[1].trim(), start: m.index + m[0].length });
  }
  for (let i = 0; i < out.length; i++) {
    out[i].end = i + 1 < out.length ? out[i + 1].start - 4 : text.length;
    out[i].body = text.slice(out[i].start, out[i].end).trim();
  }
  return out;
}

function matchSlide(title, slides) {
  const norm = normalize(title);
  // exact title match (after normalize)
  for (const s of slides) {
    if (normalize(s.title) === norm) return s;
  }
  // contains either way
  for (const s of slides) {
    const sn = normalize(s.title);
    if (sn && norm.includes(sn)) return s;
    if (sn && sn.includes(norm)) return s;
  }
  // first-three-words match (handles "Dr. Joy Buolamwini — Name What You See"
  // vs slide title "Dr. Joy Buolamwini / Name What You See")
  const fp = norm.split(" ").slice(0, 3).join(" ");
  for (const s of slides) {
    const sfp = normalize(s.title).split(" ").slice(0, 3).join(" ");
    if (sfp && sfp === fp) return s;
  }
  // token-overlap fallback (handles "The Selector and Taste" vs "The Selector / Taste":
  // both reduce to {the, selector, taste} after stopword strip — only 'and' differs)
  const STOP = new Set(["the", "a", "an", "and", "of", "in", "on", "for", "to", "with"]);
  const tokens = (s) =>
    new Set(
      normalize(s)
        .split(" ")
        .filter((t) => t.length > 1 && !STOP.has(t))
    );
  const want = tokens(title);
  if (want.size === 0) return null;
  let best = null;
  let bestScore = 0;
  for (const s of slides) {
    const got = tokens(s.title);
    if (got.size === 0) continue;
    const overlap = [...want].filter((t) => got.has(t)).length;
    const score = overlap / Math.max(want.size, got.size);
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return bestScore >= 0.6 ? best : null;
}

function normalize(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(text) {
  const trimmed = (text ?? "").trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function die(msg) {
  console.error(msg);
  process.exit(1);
}
