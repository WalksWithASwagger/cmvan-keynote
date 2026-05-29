#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const MODE_PATTERNS = {
  "--maintained": [
    /^README\.md$/,
    /^DEPLOYMENT\.md$/,
    /^OPEN-QUESTIONS\.md$/,
    /^SESSION-HANDOFF\.md$/,
    /^docs\/.*\.md$/,
    /^site\/README\.md$/,
    /^scripts\/README\.md$/,
    /^worker\/[^/]+\/(?:README|NOTION-SETUP|SETUP)\.md$/,
    /^companion-site\/README\.md$/,
  ],
  "--all": [/\.md$/],
};

const mode = process.argv[2] || "--maintained";
if (!MODE_PATTERNS[mode]) {
  console.error("Usage: node scripts/check-doc-links.mjs [--maintained|--all]");
  process.exit(2);
}

const markdownFiles = repoMarkdownFiles().filter((file) => {
  return MODE_PATTERNS[mode].some((pattern) => pattern.test(file));
});

const failures = [];
for (const file of markdownFiles) {
  checkFile(file);
}

if (failures.length) {
  console.error(`${failures.length} broken local markdown link${failures.length === 1 ? "" : "s"}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`ok - markdown links (${mode.slice(2)}, ${markdownFiles.length} files)`);

function repoMarkdownFiles() {
  const result = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "*.md"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || "git ls-files failed");
  }
  return result.stdout.trim().split("\n").filter(Boolean);
}

function checkFile(file) {
  const source = readFileSync(path.join(ROOT, file), "utf8");
  const lines = source.split(/\r?\n/);
  const linkPattern = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;

  lines.forEach((line, index) => {
    let match;
    while ((match = linkPattern.exec(line))) {
      const target = match[2].trim();
      if (shouldIgnore(target)) continue;

      const cleanTarget = target.split("#")[0].split("?")[0];
      if (!cleanTarget) continue;

      const resolved = cleanTarget.startsWith("/")
        ? path.join(ROOT, cleanTarget)
        : path.resolve(path.dirname(path.join(ROOT, file)), cleanTarget);

      if (!existsSync(resolved)) {
        failures.push(`${file}:${index + 1} -> ${target}`);
      }
    }
  });
}

function shouldIgnore(target) {
  return /^(?:https?:|mailto:|tel:|#|data:)/i.test(target);
}
