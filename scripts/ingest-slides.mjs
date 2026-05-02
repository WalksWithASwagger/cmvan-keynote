#!/usr/bin/env node
// ingest-slides.mjs — pipeline for slide imagery.
//
// 1. reads images from $SLIDES_SRC (gitignored, lives outside the repo)
// 2. extracts slide number from filename (`01_*.ext`, `slide-12-*.ext`, etc.)
// 3. uses sharp to write a ~800px WebP fallback into
//    site/public/images/slides/  (these are committed)
// 4. uploads the original to a Cloudflare R2 bucket via the S3 SDK
// 5. merges loRes / hiRes / alt / prompt into site/data/slides.json on top of
//    the title/act fields already produced by build-quotes.mjs
//
// Re-running is idempotent: existing fields get overwritten with current
// values; fields ingest doesn't own (title, act, note) are preserved.
//
// Required env (see .env.example):
//   SLIDES_SRC                – absolute path to local slide images
//   R2_ACCOUNT_ID             – Cloudflare account id
//   R2_ACCESS_KEY_ID          – R2 token
//   R2_SECRET_ACCESS_KEY      – R2 token
//   R2_BUCKET                 – e.g. punkrockai-slides
//   R2_PUBLIC_BASE            – public URL prefix (custom domain or pub-*.r2.dev)
//
// Optional env:
//   DRY_RUN=1                 – no R2 upload, no file writes; prints plan only
//   SKIP_UPLOAD=1             – build WebPs + manifest, but don't push to R2
//
// Optional per-slide overrides: $SLIDES_SRC/manifest.json with shape
//   { "01": { "alt": "...", "prompt": "..." }, ... }

import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, basename, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const SLIDES_JSON = resolve(ROOT, "site/data/slides.json");
const FALLBACK_DIR = resolve(ROOT, "site/public/images/slides");

const DRY_RUN = !!process.env.DRY_RUN;
const SKIP_UPLOAD = !!process.env.SKIP_UPLOAD;
const SRC = process.env.SLIDES_SRC;

if (!SRC) die("SLIDES_SRC is required (absolute path to your slide source dir).");
if (!existsSync(SRC)) die(`SLIDES_SRC does not exist: ${SRC}`);

if (!existsSync(SLIDES_JSON)) {
  die("site/data/slides.json not found — run `node scripts/build-quotes.mjs` first.");
}

const sharp = await tryImport("sharp");
if (!sharp) die("missing dep: install with `npm i -D sharp @aws-sdk/client-s3`.");

const r2 = await initR2();
const overrides = await loadManifest(SRC);
const files = await collectImages(SRC);
if (!files.length) die(`no slide images found under ${SRC}`);

const slidesPayload = JSON.parse(await readFile(SLIDES_JSON, "utf8"));
const slidesById = new Map(slidesPayload.slides.map((s) => [s.n, s]));

console.log(`ingesting ${files.length} image(s) from ${SRC}`);
if (DRY_RUN) console.log("DRY_RUN — no writes, no uploads");

let touched = 0;
for (const file of files) {
  const slide = slidesById.get(file.n);
  if (!slide) {
    console.warn(`  ! slide ${file.n} not in slides.json — skipped`);
    continue;
  }
  const baseName = `${slide.id}${file.ext}`;
  const fallbackName = `${slide.id}.webp`;
  const fallbackPath = join(FALLBACK_DIR, fallbackName);
  const remoteKey = `slides/${baseName}`;

  const override = overrides[String(file.n).padStart(2, "0")] || {};
  const alt = override.alt ?? slide.alt ?? slide.title;
  const prompt = override.prompt ?? slide.prompt ?? null;

  if (DRY_RUN) {
    console.log(`  · ${file.n}  ${file.path} → ${rel(fallbackPath)} + R2:${remoteKey}`);
  } else {
    await mkdir(FALLBACK_DIR, { recursive: true });
    await sharp.default(file.path)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(fallbackPath);
    if (r2 && !SKIP_UPLOAD) {
      const buf = await readFile(file.path);
      await r2.put(remoteKey, buf, contentType(file.ext));
    }
  }

  slide.loRes = `/public/images/slides/${fallbackName}`;
  slide.hiRes = r2 && !SKIP_UPLOAD ? `${process.env.R2_PUBLIC_BASE.replace(/\/$/, "")}/${remoteKey}` : null;
  slide.alt = alt;
  slide.prompt = prompt;
  touched++;
}

if (!DRY_RUN) {
  slidesPayload.generated = new Date().toISOString();
  slidesPayload.slides = [...slidesById.values()].sort((a, b) => a.n - b.n);
  await writeFile(SLIDES_JSON, JSON.stringify(slidesPayload, null, 2) + "\n");
}

console.log(`done — ${touched}/${files.length} slide(s) wired`);

// ---------------------------------------------------------------------------

async function collectImages(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    const name = ent.name;
    const ext = extname(name).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"].includes(ext)) continue;
    const m = basename(name, ext).match(/(?:^|[^0-9])(\d{1,2})(?:[^0-9]|$)/);
    if (!m) continue;
    const n = Number(m[1]);
    if (n < 1 || n > 99) continue;
    out.push({ path: join(dir, name), n, ext, name });
  }
  // dedupe: prefer the last-modified file when multiple match a slide number
  const byN = new Map();
  for (const f of out) {
    const stat1 = await stat(f.path);
    const prior = byN.get(f.n);
    if (!prior || prior.mtime < stat1.mtimeMs) {
      byN.set(f.n, { ...f, mtime: stat1.mtimeMs });
    }
  }
  return [...byN.values()].sort((a, b) => a.n - b.n);
}

async function loadManifest(dir) {
  const p = join(dir, "manifest.json");
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(await readFile(p, "utf8"));
  } catch (err) {
    console.warn(`  ! could not parse ${p}: ${err.message}`);
    return {};
  }
}

async function initR2() {
  if (DRY_RUN || SKIP_UPLOAD) return null;
  const need = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE"];
  const missing = need.filter((k) => !process.env[k]);
  if (missing.length) {
    console.warn(`  ! R2 env missing (${missing.join(", ")}) — skipping upload`);
    return null;
  }
  const sdk = await tryImport("@aws-sdk/client-s3");
  if (!sdk) die("missing dep: install @aws-sdk/client-s3.");
  const { S3Client, PutObjectCommand } = sdk;
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: key,
          Body: body,
          ContentType: contentType,
        })
      );
    },
  };
}

function contentType(ext) {
  return (
    {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".tif": "image/tiff",
      ".tiff": "image/tiff",
    }[ext] || "application/octet-stream"
  );
}

async function tryImport(spec) {
  try {
    return await import(spec);
  } catch {
    return null;
  }
}

function rel(p) {
  return p.replace(ROOT + "/", "");
}

function die(msg) {
  console.error(msg);
  process.exit(1);
}
