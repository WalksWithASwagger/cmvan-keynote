#!/usr/bin/env node
// build-lineage.mjs — validate site/data/lineage.json + pretty-print it.
// The lineage is curated prose, not table-extractable, so we hand-author the
// JSON. This script enforces the schema so a missing field fails loudly
// instead of rendering as a blank panel on /lineage.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const FILE = resolve(ROOT, "site/data/lineage.json");

const REQUIRED_TOP = ["thesis", "refrain", "beats"];
const REQUIRED_BEAT = ["id", "era", "year", "title", "body", "tool", "refusal"];

const raw = await readFile(FILE, "utf8");
const data = JSON.parse(raw);

const errors = [];

for (const k of REQUIRED_TOP) {
  if (!(k in data)) errors.push(`missing top-level key: ${k}`);
}
if (!Array.isArray(data.beats) || data.beats.length === 0) {
  errors.push("beats[] must be a non-empty array");
}

const seen = new Set();
(data.beats || []).forEach((beat, i) => {
  for (const k of REQUIRED_BEAT) {
    if (!beat[k]) errors.push(`beat[${i}] missing ${k}`);
  }
  if (beat.id) {
    if (seen.has(beat.id)) errors.push(`duplicate beat id: ${beat.id}`);
    seen.add(beat.id);
  }
  if (beat.slideRefs && !Array.isArray(beat.slideRefs)) {
    errors.push(`beat[${i}].slideRefs must be an array if present`);
  }
});

if (errors.length) {
  console.error(`lineage.json has ${errors.length} issue(s):`);
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}

await writeFile(FILE, JSON.stringify(data, null, 2) + "\n");
console.log(`ok — ${data.beats.length} beats validated`);
