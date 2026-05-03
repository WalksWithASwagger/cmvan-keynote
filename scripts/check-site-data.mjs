#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const DATA_DIR = resolve(ROOT, "site/data");

const EXPECTED_KEYS = {
  "audio-cues.json": ["cues"],
  "bingo.json": ["cells"],
  "cases.json": ["cases"],
  "chainsaws.json": ["tools"],
  "decisions.json": ["openQuestions", "sessions"],
  "junior-pipeline.json": ["rungs"],
  "library.json": ["docs"],
  "lineage.json": ["beats"],
  "moves.json": ["moves"],
  "posse.json": ["profiles"],
  "punk-stack.json": ["layers"],
  "quotes.json": ["quotes"],
  "recap-media.json": ["slots"],
  "slides.json": ["slides"],
  "submissions.json": ["submissions"],
  "taste-prompts.json": ["framework", "promptsForExport"]
};

const entries = (await readdir(DATA_DIR)).filter((entry) => entry.endsWith(".json")).sort();
const errors = [];

for (const entry of entries) {
  const file = resolve(DATA_DIR, entry);
  let data;
  try {
    data = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    errors.push(`${entry} is not valid JSON: ${error.message}`);
    continue;
  }

  if (!data || Array.isArray(data) || typeof data !== "object") {
    errors.push(`${entry} must parse to an object`);
    continue;
  }

  for (const key of EXPECTED_KEYS[entry] ?? []) {
    if (!(key in data)) {
      errors.push(`${entry} missing top-level key: ${key}`);
      continue;
    }
    const value = data[key];
    if (Array.isArray(value) && value.length === 0 && entry !== "submissions.json") {
      errors.push(`${entry} has an empty array at ${key}`);
    }
    if (!Array.isArray(value) && (value == null || typeof value !== "object")) {
      errors.push(`${entry} has invalid value at ${key}`);
    }
  }
}

if (errors.length) {
  console.error(`site/data validation failed with ${errors.length} issue(s):`);
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log(`ok - ${entries.length} JSON data contract(s) validated in ${basename(DATA_DIR)}`);
