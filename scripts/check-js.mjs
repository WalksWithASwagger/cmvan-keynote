#!/usr/bin/env node

import { readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const JS_EXTENSIONS = new Set([".js", ".mjs"]);
const SKIP_DIRS = new Set([".git", "node_modules", "assets/generated"]);

const files = [];
await walk(ROOT);

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: ROOT,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
}

console.log(`ok - node --check passed for ${files.length} JavaScript file(s)`);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    const rel = full.slice(ROOT.length + 1);
    if (entry.isDirectory()) {
      if (shouldSkipDir(rel, entry.name)) continue;
      await walk(full);
      continue;
    }

    if (!entry.isFile()) continue;
    const ext = entry.name.includes(".") ? `.${entry.name.split(".").pop()}` : "";
    if (JS_EXTENSIONS.has(ext)) {
      files.push(full);
    }
  }
}

function shouldSkipDir(rel, name) {
  if (name.startsWith(".")) return true;
  if (SKIP_DIRS.has(name)) return true;
  return [...SKIP_DIRS].some((prefix) => rel.startsWith(prefix));
}
