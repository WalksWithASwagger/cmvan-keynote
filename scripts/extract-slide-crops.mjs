#!/usr/bin/env node
// Extract high-value regions from talk slides for site use as zine textures.
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLIDES = path.join(__dirname, '../assets/slides/cmvan-v6-gpt2/latest');
const NEW   = path.join(__dirname, '../assets/slides/cmvan-v6-gpt2/new-slides-20260501/latest');
const OUT   = path.join(__dirname, '../site/public/slides');

// { src, out, region? (null = full), resize? }
const crops = [
  // ── Full slides resized for section backgrounds ──────────────────────────
  { src: `${SLIDES}/01-both-hands-full-title.png`,
    out: 'bhf-title-full.webp',
    resize: { width: 1536 }, quality: 82 },

  { src: `${SLIDES}/07-dada-to-ai-lineage.png`,
    out: 'weirdos-lineage-full.webp',
    resize: { width: 1536 }, quality: 82 },

  { src: `${SLIDES}/08-the-selector.png`,
    out: 'taste-full.webp',
    resize: { width: 1536 }, quality: 82 },

  { src: `${SLIDES}/19-build-a-posse.png`,
    out: 'posse-full.webp',
    resize: { width: 1536 }, quality: 82 },

  { src: `${SLIDES}/21-three-documents.png`,
    out: 'three-docs-full.webp',
    resize: { width: 1536 }, quality: 82 },

  { src: `${SLIDES}/22-the-tool-is-never-neutral.png`,
    out: 'tool-neutral-full.webp',
    resize: { width: 1536 }, quality: 82 },

  { src: `${SLIDES}/24-release-day.png`,
    out: 'release-day-full.webp',
    resize: { width: 1536 }, quality: 82 },

  { src: `${SLIDES}/25-dead-fish-live-fish.png`,
    out: 'dead-fish-full.webp',
    resize: { width: 1536 }, quality: 82 },

  { src: `${SLIDES}/02-cult-baby.png`,
    out: 'cult-baby-full.webp',
    resize: { width: 1536 }, quality: 82 },

  { src: `${SLIDES}/03-my-camera-saved-my-life.png`,
    out: 'camera-life-full.webp',
    resize: { width: 1536 }, quality: 82 },

  { src: `${SLIDES}/15-both-hands-full.png`,
    out: 'bhf-climax-full.webp',
    resize: { width: 1536 }, quality: 82 },

  { src: `${NEW}/01-boosters-vs-doomers-split-composition.png`,
    out: 'booster-doomer-full.webp',
    resize: { width: 1536 }, quality: 82 },

  { src: `${NEW}/03-more-creative-than-ever-text-as-artwork.png`,
    out: 'more-creative-full.webp',
    resize: { width: 1536 }, quality: 82 },

  // ── Specific crops for text/detail use ──────────────────────────────────

  // "BOTH HANDS FULL" pink drip text — top-left region
  { src: `${SLIDES}/01-both-hands-full-title.png`,
    out: 'bhf-drip-text.webp',
    region: { left: 0, top: 0, width: 1000, height: 680 },
    resize: { width: 800 }, quality: 85 },

  // BHF dark collage background texture (avoid main text, use right side)
  { src: `${SLIDES}/01-both-hands-full-title.png`,
    out: 'bhf-bg-texture.webp',
    region: { left: 800, top: 400, width: 736, height: 624 },
    resize: { width: 600 }, quality: 80 },

  // "THE WEIRDOS FIGURE IT OUT" bottom headline strip
  { src: `${SLIDES}/07-dada-to-ai-lineage.png`,
    out: 'weirdos-headline.webp',
    region: { left: 0, top: 750, width: 1536, height: 274 },
    resize: { width: 1200 }, quality: 85 },

  // DADA ★ PUNK ★ ... AI top strip
  { src: `${SLIDES}/07-dada-to-ai-lineage.png`,
    out: 'lineage-top-strip.webp',
    region: { left: 0, top: 0, width: 1536, height: 110 },
    resize: { width: 1200 }, quality: 85 },

  // "TASTE" pink drip text — left panel
  { src: `${SLIDES}/08-the-selector.png`,
    out: 'taste-drip.webp',
    region: { left: 0, top: 0, width: 680, height: 750 },
    resize: { width: 500 }, quality: 85 },

  // "TASTE — NOT WHAT'S AVERAGE" stamp bottom
  { src: `${SLIDES}/08-the-selector.png`,
    out: 'taste-stamp.webp',
    region: { left: 530, top: 680, width: 500, height: 200 },
    resize: { width: 400 }, quality: 85 },

  // "POSSE" pink graffiti + network
  { src: `${SLIDES}/19-build-a-posse.png`,
    out: 'posse-text.webp',
    region: { left: 200, top: 160, width: 1100, height: 560 },
    resize: { width: 900 }, quality: 85 },

  // "FEED THIS TO THE MACHINE" stamp — bottom right
  { src: `${SLIDES}/21-three-documents.png`,
    out: 'feed-machine-stamp.webp',
    region: { left: 860, top: 740, width: 676, height: 284 },
    resize: { width: 500 }, quality: 88 },

  // Three docs layout (left paper columns)
  { src: `${SLIDES}/21-three-documents.png`,
    out: 'three-docs-papers.webp',
    region: { left: 0, top: 80, width: 900, height: 720 },
    resize: { width: 700 }, quality: 85 },

  // "THE TOOL IS NEVER NEUTRAL" pink text + chainsaw
  { src: `${SLIDES}/22-the-tool-is-never-neutral.png`,
    out: 'tool-neutral-text.webp',
    region: { left: 0, top: 0, width: 800, height: 620 },
    resize: { width: 600 }, quality: 85 },

  // "BUT NEITHER ARE WE" red text bottom
  { src: `${SLIDES}/22-the-tool-is-never-neutral.png`,
    out: 'neither-are-we.webp',
    region: { left: 600, top: 680, width: 936, height: 344 },
    resize: { width: 700 }, quality: 85 },

  // "MAY 29" pink + fire (top-left)
  { src: `${SLIDES}/24-release-day.png`,
    out: 'may29-text.webp',
    region: { left: 0, top: 0, width: 680, height: 520 },
    resize: { width: 500 }, quality: 85 },

  // Fire edge strips from release day slide
  { src: `${SLIDES}/24-release-day.png`,
    out: 'fire-edge-left.webp',
    region: { left: 0, top: 300, width: 200, height: 724 },
    resize: { width: 150 }, quality: 80 },

  // "YOU COMING?" pink text bottom
  { src: `${SLIDES}/25-dead-fish-live-fish.png`,
    out: 'you-coming-text.webp',
    region: { left: 0, top: 760, width: 1536, height: 264 },
    resize: { width: 1200 }, quality: 85 },

  // Booster/Doomer vertical red split line detail
  { src: `${NEW}/01-boosters-vs-doomers-split-composition.png`,
    out: 'booster-doomer-split.webp',
    region: { left: 680, top: 0, width: 176, height: 1024 },
    resize: { width: 120 }, quality: 82 },

  // "BOTH FEEL CLEAN. BOTH ARE INCOMPLETE." bottom
  { src: `${NEW}/01-boosters-vs-doomers-split-composition.png`,
    out: 'both-feel-clean.webp',
    region: { left: 0, top: 820, width: 1536, height: 204 },
    resize: { width: 1200 }, quality: 85 },

  // Cult Baby — red "CULT BABY" drip text top-left
  { src: `${SLIDES}/02-cult-baby.png`,
    out: 'cult-baby-text.webp',
    region: { left: 0, top: 0, width: 700, height: 580 },
    resize: { width: 500 }, quality: 85 },
];

let done = 0, failed = 0;
await Promise.all(crops.map(async ({ src, out, region, resize, quality = 82 }) => {
  try {
    let img = sharp(src);
    if (region) img = img.extract(region);
    if (resize) img = img.resize(resize);
    await img.webp({ quality }).toFile(`${OUT}/${out}`);
    console.log(`✓ ${out}`);
    done++;
  } catch (e) {
    console.error(`✗ ${out}: ${e.message}`);
    failed++;
  }
}));

console.log(`\n${done} crops extracted, ${failed} failed → site/public/slides/`);
