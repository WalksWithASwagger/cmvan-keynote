#!/usr/bin/env node
// build-library-index.mjs — walks the four source dirs and emits a single
// searchable index at site/data/library.json. Pages and widgets read this
// JSON; Fuse.js does the actual search client-side. Re-run any time you
// touch the source markdown.

import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { dirname, resolve, relative, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const OUT = resolve(ROOT, "site/data/library.json");

const COLLECTIONS = [
  { id: "script", dir: "script", label: "Script" },
  { id: "source-material", dir: "source-material", label: "Source material" },
  { id: "dress-rehearsal", dir: "dress-rehearsal", label: "Dress rehearsal" },
  { id: "research", dir: "research", label: "Research" },
];

const MAX_BYTES = 200 * 1024; // skip giant files (the book draft) for full body
const SUMMARY_LEN = 220;

const docs = [];
for (const c of COLLECTIONS) {
  for await (const file of walk(resolve(ROOT, c.dir))) {
    if (!file.endsWith(".md")) continue;
    const rel = relative(ROOT, file);
    if (basename(file).startsWith("_")) continue;
    docs.push(await indexFile(file, rel, c));
  }
}

const payload = {
  generated: new Date().toISOString(),
  collections: COLLECTIONS,
  count: docs.length,
  docs: docs.sort((a, b) => a.path.localeCompare(b.path)),
};

await writeFile(OUT, JSON.stringify(payload, null, 2) + "\n");

const totalKB = docs.reduce((n, d) => n + d.bytes, 0) / 1024;
console.log(`indexed ${docs.length} document(s) — ${totalKB.toFixed(0)} KB total`);
console.log(`wrote ${rel(OUT)}`);

// ---------------------------------------------------------------------------

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const full = resolve(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name.startsWith(".") || ent.name === "node_modules" || ent.name === "archive") continue;
      yield* walk(full);
    } else if (ent.isFile()) {
      yield full;
    }
  }
}

async function indexFile(absPath, relPath, collection) {
  const st = await stat(absPath);
  const truncated = st.size > MAX_BYTES;
  const text = await readFile(absPath, "utf8");
  const body = truncated ? text.slice(0, MAX_BYTES) : text;

  const title = extractTitle(body) || basename(absPath, extname(absPath));
  const headings = extractHeadings(body);
  const summary = extractSummary(body);
  const slug = relPath.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  return {
    id: slug,
    path: relPath,
    collection: collection.id,
    collectionLabel: collection.label,
    title,
    summary,
    headings,
    bytes: st.size,
    mtime: st.mtimeMs,
    truncated,
    // a body excerpt is included so client-side search can match anywhere in
    // the document. Capped to keep the manifest under control.
    body: stripMarkdown(body).slice(0, 6000),
    githubRaw: `https://github.com/WalksWithASwagger/cmvan-keynote/blob/main/${relPath}`,
  };
}

function extractTitle(text) {
  const m = text.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : null;
}

function extractHeadings(text) {
  const out = [];
  const re = /^(#{2,4})\s+(.+?)\s*$/gm;
  let m;
  while ((m = re.exec(text))) {
    out.push({
      level: m[1].length,
      text: m[2].trim(),
      offset: m.index,
    });
    if (out.length >= 40) break;
  }
  return out;
}

function extractSummary(text) {
  // first non-empty paragraph that isn't a heading or front-matter
  const lines = text.split(/\r?\n/);
  const buf = [];
  let in_para = false;
  for (const line of lines) {
    if (/^---/.test(line)) continue;
    if (/^#/.test(line)) {
      if (in_para) break;
      continue;
    }
    if (line.trim() === "") {
      if (in_para) break;
      continue;
    }
    in_para = true;
    buf.push(line.trim());
  }
  const para = buf.join(" ").replace(/\s+/g, " ");
  return stripMarkdown(para).slice(0, SUMMARY_LEN);
}

function stripMarkdown(s) {
  return s
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/^>\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function rel(p) {
  return relative(ROOT, p);
}
