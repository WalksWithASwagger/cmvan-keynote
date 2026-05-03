#!/usr/bin/env node
// generate-cues.mjs — per-slide ElevenLabs TTS for the dress-rehearsal script.
//
// Splits dress-rehearsal/elevenlabs-full-script.md on `## ` section headings,
// matches each section to a slide via site/data/audio-cues.json (built by
// scripts/build-audio-cues.mjs), then calls ElevenLabs once per slide. Writes
// site/public/audio/cues/<slide-id>.mp3 and rewrites audio-cues.json with
// { mp3Url, durationMs, generatedAt } populated.
//
// Usage:
//   node scripts/generate-cues.mjs --dry-run     # plan only, no API calls
//   ELEVENLABS_API_KEY=... ELEVENLABS_VOICE_ID=... node scripts/generate-cues.mjs
//   node scripts/generate-cues.mjs --only slide-05,slide-13   # subset
//   node scripts/generate-cues.mjs --force       # regenerate even if mp3 exists

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const SCRIPT_MD = resolve(ROOT, "dress-rehearsal/elevenlabs-full-script.md");
const CUES_JSON = resolve(ROOT, "site/data/audio-cues.json");
const OUT_DIR = resolve(ROOT, "site/public/audio/cues");

const args = parseArgs(process.argv.slice(2));
const DRY_RUN = args.has("dry-run");
const FORCE = args.has("force");
const ONLY = args.value("only")?.split(",").map((s) => s.trim()).filter(Boolean) ?? null;

const PUBLIC_BASE = process.env.AUDIO_PUBLIC_BASE || "/audio/cues";
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
const OUTPUT_FORMAT = process.env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128";

if (!existsSync(SCRIPT_MD)) die(`script not found: ${SCRIPT_MD}`);
if (!existsSync(CUES_JSON)) die(`cues file missing: ${CUES_JSON} — run build-audio-cues.mjs first`);

const cuesPayload = JSON.parse(await readFile(CUES_JSON, "utf8"));
const md = await readFile(SCRIPT_MD, "utf8");
const sections = parseSections(md);

// Build a (slide title) -> body map by re-running the same matching logic the
// build script uses. We rely on the section payload that build-audio-cues
// already wrote: cue.section is the exact `## ` heading text.
const bySection = new Map();
for (const sec of sections) bySection.set(sec.title, sec.body);

const targets = [];
for (const [slideId, cue] of Object.entries(cuesPayload.cues)) {
  if (ONLY && !ONLY.includes(slideId)) continue;
  const body = bySection.get(cue.section);
  if (!body) {
    console.warn(`[skip] ${slideId}: no script body for section "${cue.section}"`);
    continue;
  }
  const text = cleanForTTS(body);
  const outPath = resolve(OUT_DIR, `${slideId}.mp3`);
  const exists = existsSync(outPath);
  targets.push({ slideId, cue, text, outPath, exists });
}

if (targets.length === 0) die("no targets to generate (filtered out everything)");

console.log(`Plan: ${targets.length} clip(s) → ${OUT_DIR}`);
console.log(`Voice: ${process.env.ELEVENLABS_VOICE_ID ?? "(unset)"}  Model: ${MODEL}  Format: ${OUTPUT_FORMAT}`);
console.log(`Public base: ${PUBLIC_BASE}`);
console.log("");
for (const t of targets) {
  const status = t.exists && !FORCE ? "skip" : "gen ";
  console.log(`  [${status}] ${t.slideId}  ${t.cue.section}  (${t.text.length} chars, ~${t.cue.words}w)`);
}
console.log("");

if (DRY_RUN) {
  console.log("--dry-run: no API calls made.");
  process.exit(0);
}

const API_KEY = required("ELEVENLABS_API_KEY");
const VOICE_ID = required("ELEVENLABS_VOICE_ID");

await mkdir(OUT_DIR, { recursive: true });

const updated = { ...cuesPayload, cues: { ...cuesPayload.cues } };
const generatedAt = new Date().toISOString();

for (const t of targets) {
  const wantsGen = FORCE || !t.exists;
  if (wantsGen) {
    console.log(`> ${t.slideId} (${t.text.length} chars)`);
    const buf = await ttsToMp3({ apiKey: API_KEY, voiceId: VOICE_ID, text: t.text });
    await writeFile(t.outPath, buf);
  }
  const sizeBytes = (await stat(t.outPath)).size;
  const durationMs = estimateDurationMs(sizeBytes, OUTPUT_FORMAT) ?? t.cue.length;
  updated.cues[t.slideId] = {
    ...t.cue,
    mp3Url: `${PUBLIC_BASE.replace(/\/$/, "")}/${t.slideId}.mp3`,
    durationMs,
    generatedAt: wantsGen ? generatedAt : (t.cue.generatedAt ?? null),
    bytes: sizeBytes,
  };
}

updated.publicBase = PUBLIC_BASE;
updated.lastGeneratedAt = generatedAt;

await writeFile(CUES_JSON, JSON.stringify(updated, null, 2) + "\n");
console.log(`\nwrote ${CUES_JSON}`);

// ---------------------------------------------------------------------------

async function ttsToMp3({ apiKey, voiceId, text }) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(OUTPUT_FORMAT)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "content-type": "application/json",
      "accept": "audio/mpeg",
    },
    body: JSON.stringify({ text, model_id: MODEL }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    die(`ElevenLabs ${res.status} ${res.statusText}: ${detail.slice(0, 400)}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

// Estimate duration from mp3 byte size and the known constant bitrate that the
// ElevenLabs output_format encodes. Returns null if format is variable/unknown.
function estimateDurationMs(bytes, format) {
  const m = /^mp3_\d+_(\d+)$/.exec(format);
  if (!m) return null;
  const kbps = Number(m[1]);
  if (!kbps) return null;
  return Math.round((bytes * 8) / kbps);
}

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

// Strip markdown emphasis, horizontal rules, italic notes, and stray header
// lines so ElevenLabs reads natural prose. Keep paragraph breaks for pacing.
function cleanForTTS(raw) {
  let text = raw;
  text = text.replace(/^#{1,6}\s.*$/gm, "");
  text = text.replace(/^---+$/gm, "");
  text = text.replace(/^\*[^*\n][^\n]*\*$/gm, "");
  text = text.replace(/\*\*(.*?)\*\*/g, "$1");
  text = text.replace(/\*(.*?)\*/g, "$1");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

function parseArgs(argv) {
  const flags = new Set();
  const values = new Map();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const eq = a.indexOf("=");
    if (eq > 0) {
      values.set(a.slice(2, eq), a.slice(eq + 1));
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
      values.set(a.slice(2), argv[i + 1]);
      i++;
    } else {
      flags.add(a.slice(2));
    }
  }
  return {
    has: (k) => flags.has(k) || values.has(k),
    value: (k) => values.get(k),
  };
}

function required(name) {
  const v = process.env[name];
  if (!v) die(`missing env var: ${name}\n  See .env.example for setup. Use --dry-run to plan without credentials.`);
  return v;
}

function die(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}
