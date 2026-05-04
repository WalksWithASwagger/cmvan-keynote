#!/usr/bin/env node
// ingest-photos.mjs — compress photographer album into site/public/photos/<slug>/
//
// Produces:
//   site/public/photos/<slug>/<n>.webp        full-size (longest edge ≤1600px, q82)
//   site/public/photos/<slug>/thumbs/<n>.webp thumbnail  (longest edge ≤480px,  q70)
//   site/data/photos-<slug>.json              manifest with id/src/thumb/alt/caption
//
// Running twice is idempotent — skips existing files unless --force.
//
// CLI:
//   node scripts/ingest-photos.mjs --src <dir> --slug <slug> [--force] [--dry-run]

import { readdir, writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const args = process.argv.slice(2);
function flag(name) { return args.includes(name); }
function opt(name) {
  const i = args.indexOf(name);
  return i !== -1 ? args[i + 1] : null;
}

const SRC  = opt("--src");
const SLUG = opt("--slug");
const FORCE   = flag("--force");
const DRY_RUN = flag("--dry-run");

if (!SRC  || !SLUG) {
  console.error("Usage: node scripts/ingest-photos.mjs --src <dir> --slug <slug> [--force] [--dry-run]");
  process.exit(1);
}
if (!existsSync(SRC)) {
  console.error(`--src does not exist: ${SRC}`);
  process.exit(1);
}

const FULL_DIR  = resolve(ROOT, "site/public/photos", SLUG);
const THUMB_DIR = resolve(ROOT, "site/public/photos", SLUG, "thumbs");
const JSON_PATH = resolve(ROOT, "site/data", `photos-${SLUG}.json`);

const FULL_MAX  = 1600;
const THUMB_MAX = 480;
const FULL_Q    = 82;
const THUMB_Q   = 70;

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".tiff", ".tif"]);

async function ensureDirs() {
  if (!DRY_RUN) {
    await mkdir(FULL_DIR,  { recursive: true });
    await mkdir(THUMB_DIR, { recursive: true });
  }
}

async function listSources() {
  const entries = await readdir(SRC);
  return entries
    .filter(f => IMAGE_EXTS.has(extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
}

async function fileExists(path) {
  try { await stat(path); return true; } catch { return false; }
}

async function processPhoto(srcFile, idx, total) {
  const n     = String(idx + 1).padStart(3, "0");
  const full  = join(FULL_DIR,  `${n}.webp`);
  const thumb = join(THUMB_DIR, `${n}.webp`);

  const skipFull  = !FORCE && await fileExists(full);
  const skipThumb = !FORCE && await fileExists(thumb);

  console.log(`[${idx + 1}/${total}] ${srcFile}  →  ${n}.webp${skipFull ? " (skip)" : ""}`);

  if (!DRY_RUN) {
    const srcPath = join(SRC, srcFile);

    if (!skipFull) {
      await sharp(srcPath)
        .rotate()                         // honour EXIF orientation
        .resize(FULL_MAX, FULL_MAX, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: FULL_Q })
        .toFile(full);
    }

    if (!skipThumb) {
      await sharp(srcPath)
        .rotate()
        .resize(THUMB_MAX, THUMB_MAX, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: THUMB_Q })
        .toFile(thumb);
    }
  }

  return {
    id: n,
    src:   `/photos/${SLUG}/${n}.webp`,
    thumb: `/photos/${SLUG}/thumbs/${n}.webp`,
    alt:   `Creative Mornings Vancouver — Punk Rock AI, May 1 2026. Photo ${n}.`,
    caption: "",
    featured: false,
  };
}

async function run() {
  const sources = await listSources();
  console.log(`Found ${sources.length} images in ${SRC}`);
  console.log(`Output: ${FULL_DIR}`);
  if (DRY_RUN) console.log("(DRY RUN — no files written)");

  await ensureDirs();

  const manifest = [];
  for (let i = 0; i < sources.length; i++) {
    manifest.push(await processPhoto(sources[i], i, sources.length));
  }

  if (!DRY_RUN) {
    await writeFile(JSON_PATH, JSON.stringify(manifest, null, 2) + "\n");
    console.log(`\nWrote ${JSON_PATH} (${manifest.length} entries)`);
  } else {
    console.log(`\nWould write ${JSON_PATH} (${manifest.length} entries)`);
  }

  console.log(`\nDone. Full: ${FULL_DIR}  Thumbs: ${THUMB_DIR}`);
}

run().catch(err => { console.error(err); process.exit(1); });
