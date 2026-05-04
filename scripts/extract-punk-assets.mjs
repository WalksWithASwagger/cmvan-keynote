#!/usr/bin/env node
// scripts/extract-punk-assets.mjs
//
// Crops decorative elements out of the punk-v2-nano slide deck and emits
// webp tiles to site/public/punk/. The site's punk-graphics.css references
// these by slug.
//
// Usage:
//   node scripts/extract-punk-assets.mjs --dry-run    # plan only, no writes
//   node scripts/extract-punk-assets.mjs              # crop all
//   node scripts/extract-punk-assets.mjs --only halftone-face-01,red-slash
//   node scripts/extract-punk-assets.mjs --force      # overwrite existing
//
// Reuses sharp (already installed in package.json for ingest-slides.mjs).
// Manifest at assets/punk-asset-crops.json.

import { readFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function parseArgs(argv) {
  const args = { dryRun: false, force: false, only: null };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--force") args.force = true;
    else if (a.startsWith("--only=")) args.only = a.slice(7).split(",");
    else if (a === "--only") {
      const next = argv[argv.indexOf(a) + 1];
      if (next) args.only = next.split(",");
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const manifestPath = path.join(REPO_ROOT, "assets/punk-asset-crops.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const sourceDir = path.join(REPO_ROOT, manifest._meta.source_dir);
  const outDir = path.join(REPO_ROOT, manifest._meta.output_dir);
  const defaultFormat = manifest._meta.default_format ?? "webp";
  const defaultQuality = manifest._meta.default_quality ?? 82;

  if (!args.dryRun) await mkdir(outDir, { recursive: true });

  let plan = manifest.crops;
  if (args.only) {
    plan = plan.filter((c) => args.only.includes(c.slug));
  }

  console.log(
    `[extract-punk-assets] ${args.dryRun ? "DRY RUN" : "running"} — ${plan.length} crop${plan.length === 1 ? "" : "s"} planned`
  );
  console.log(`  source: ${sourceDir}`);
  console.log(`  output: ${outDir}\n`);

  let ok = 0;
  let skip = 0;
  let fail = 0;
  let totalBytes = 0;

  for (const c of plan) {
    const fmt = c.format ?? defaultFormat;
    const quality = c.quality ?? defaultQuality;
    const outPath = path.join(outDir, `${c.slug}.${fmt}`);
    const srcPath = path.join(sourceDir, c.source);

    if (!existsSync(srcPath)) {
      console.log(`  [miss] ${c.slug.padEnd(28)}  source not found: ${c.source}`);
      fail++;
      continue;
    }

    if (existsSync(outPath) && !args.force && !args.dryRun) {
      const s = await stat(outPath);
      console.log(`  [skip] ${c.slug.padEnd(28)}  exists (${formatBytes(s.size)})`);
      totalBytes += s.size;
      skip++;
      continue;
    }

    if (args.dryRun) {
      console.log(
        `  [plan] ${c.slug.padEnd(28)}  ${c.source} → ${path.relative(REPO_ROOT, outPath)} (${c.crop.width}×${c.crop.height} @ ${c.crop.left},${c.crop.top})`
      );
      ok++;
      continue;
    }

    try {
      let pipeline = sharp(srcPath).extract({
        left: c.crop.left,
        top: c.crop.top,
        width: c.crop.width,
        height: c.crop.height,
      });

      if (c.max_width && c.crop.width > c.max_width) {
        pipeline = pipeline.resize({ width: c.max_width });
      }

      if (fmt === "webp") {
        pipeline = pipeline.webp({ quality });
      } else if (fmt === "png") {
        pipeline = pipeline.png({ compressionLevel: 9 });
      } else if (fmt === "jpeg" || fmt === "jpg") {
        pipeline = pipeline.jpeg({ quality });
      }

      const buf = await pipeline.toBuffer();
      const { writeFile } = await import("node:fs/promises");
      await writeFile(outPath, buf);
      totalBytes += buf.length;
      console.log(
        `  [ok]   ${c.slug.padEnd(28)}  ${formatBytes(buf.length).padStart(8)}  ${path.relative(REPO_ROOT, outPath)}`
      );
      ok++;
    } catch (err) {
      console.log(`  [fail] ${c.slug.padEnd(28)}  ${err.message}`);
      fail++;
    }
  }

  console.log(
    `\n[extract-punk-assets] done. ok=${ok} skip=${skip} fail=${fail}  total=${formatBytes(totalBytes)}`
  );
  if (fail > 0) process.exit(1);
}

function formatBytes(n) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(2)}MB`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
