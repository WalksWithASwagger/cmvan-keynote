#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const OPTIONAL_LOCAL_REFS = new Set([
  "/public/audio/talk.mp3",
]);

const CHECKS = [
  ["JavaScript syntax", checkJavaScriptSyntax],
  ["JSON manifests", checkJsonManifests],
  ["roadmap pipeline", checkRoadmapPipeline],
  ["site references", checkSiteReferences],
  ["header navigation", checkHeaderNavigation],
  ["Vercel static config", checkVercelConfig],
];

for (const [label, check] of CHECKS) {
  const before = failures.length;
  check();
  if (failures.length === before) {
    console.log(`ok - ${label}`);
  }
}

if (failures.length) {
  console.error(`\n${failures.length} eval check${failures.length === 1 ? "" : "s"} failed:`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nAll eval checks passed.");

function checkJavaScriptSyntax() {
  const files = [
    ...walk("api", [".js"]),
    ...walk("scripts", [".js", ".mjs"]),
    ...walk("site/js", [".js", ".mjs"]),
    ...walk("worker", [".js", ".mjs"]),
  ];

  for (const file of files) {
    const result = spawnSync(process.execPath, ["--check", abs(file)], {
      encoding: "utf8",
    });
    if (result.status !== 0) {
      failures.push(`${file}: ${firstLine(result.stderr || result.stdout)}`);
    }
  }
}

function checkJsonManifests() {
  const files = [
    ...walk("site/data", [".json"]),
    ...walk("ops/roadmap", [".json"]),
  ];
  for (const file of files) {
    try {
      JSON.parse(readFileSync(abs(file), "utf8"));
    } catch (error) {
      failures.push(`${file}: invalid JSON: ${error.message}`);
    }
  }
}

function checkRoadmapPipeline() {
  const file = "ops/roadmap/features.json";
  if (!existsSync(abs(file))) return;

  let roadmap;
  try {
    roadmap = JSON.parse(readFileSync(abs(file), "utf8"));
  } catch {
    return;
  }

  if (roadmap.repository?.github !== "WalksWithASwagger/cmvan-keynote") {
    failures.push(`${file}: expected repository.github to be WalksWithASwagger/cmvan-keynote`);
  }
  if (!roadmap.linear?.projectUrl?.startsWith("https://linear.app/")) {
    failures.push(`${file}: missing Linear project URL`);
  }
  if (roadmap.workflow?.localGate !== "npm run eval") {
    failures.push(`${file}: workflow.localGate must stay npm run eval`);
  }

  const issues = Array.isArray(roadmap.issues) ? roadmap.issues : [];
  if (!issues.length) {
    failures.push(`${file}: expected at least one roadmap issue`);
    return;
  }

  const githubNumbers = new Set();
  const linearIds = new Set();

  for (const issue of issues) {
    const label = issue.id || issue.github?.title || "unnamed issue";
    if (!Number.isInteger(issue.github?.number)) {
      failures.push(`${file}: ${label} missing github.number`);
    } else if (githubNumbers.has(issue.github.number)) {
      failures.push(`${file}: duplicate github.number ${issue.github.number}`);
    } else {
      githubNumbers.add(issue.github.number);
    }

    if (!/^BC-\d+$/.test(issue.linear?.identifier || "")) {
      failures.push(`${file}: ${label} missing Linear BC identifier`);
    } else if (linearIds.has(issue.linear.identifier)) {
      failures.push(`${file}: duplicate Linear identifier ${issue.linear.identifier}`);
    } else {
      linearIds.add(issue.linear.identifier);
    }

    if (!Array.isArray(issue.acceptanceChecks) || !issue.acceptanceChecks.length) {
      failures.push(`${file}: ${label} missing acceptanceChecks`);
    }
  }
}

function checkSiteReferences() {
  const files = [
    ...walk("site", [".html"]),
    ...walk("site/css", [".css"]),
  ];

  for (const file of files) {
    const source = stripComments(readFileSync(abs(file), "utf8"));
    const refs = [
      ...extractAttributeRefs(source),
      ...extractCssUrlRefs(source),
    ];

    for (const ref of refs) {
      const target = resolveSiteRef(ref, file);
      if (!target) continue;
      if (!existsSync(abs(target))) {
        failures.push(`${file}: missing local reference ${ref} -> ${target}`);
      }
    }
  }
}

function checkHeaderNavigation() {
  const file = "site/partials/header.html";
  const source = readFileSync(abs(file), "utf8");
  const links = extractAttributeRefs(source).filter((ref) => ref.startsWith("/"));

  for (const link of links) {
    const target = resolveSiteRef(link, file);
    if (!target || existsSync(abs(target))) continue;
    failures.push(`${file}: nav target missing ${link} -> ${target}`);
  }
}

function checkVercelConfig() {
  const file = "vercel.json";
  let config;
  try {
    config = JSON.parse(readFileSync(abs(file), "utf8"));
  } catch (error) {
    failures.push(`${file}: invalid JSON: ${error.message}`);
    return;
  }

  if (config.outputDirectory !== "site") {
    failures.push(`${file}: expected outputDirectory to be "site"`);
  }
  if (config.cleanUrls !== true) {
    failures.push(`${file}: expected cleanUrls to be true`);
  }
  if (config.buildCommand !== null) {
    failures.push(`${file}: expected buildCommand to stay null for static deploys`);
  }
}

function extractAttributeRefs(source) {
  const refs = [];
  const pattern = /\b(?:href|src)=["']([^"']+)["']/g;
  let match;
  while ((match = pattern.exec(source))) refs.push(match[1]);
  return refs;
}

function extractCssUrlRefs(source) {
  const refs = [];
  const pattern = /url\(\s*["']?([^"')]+)["']?\s*\)/g;
  let match;
  while ((match = pattern.exec(source))) refs.push(match[1]);
  return refs;
}

function resolveSiteRef(ref, fromFile) {
  if (shouldIgnoreRef(ref)) return null;

  const cleanRef = ref.split("#")[0].split("?")[0];
  if (!cleanRef) return null;

  if (cleanRef.startsWith("/")) {
    return resolveRootRef(cleanRef);
  }

  if (cleanRef.startsWith(".")) {
    return path.normalize(path.join(path.dirname(fromFile), cleanRef));
  }

  return null;
}

function resolveRootRef(ref) {
  if (ref === "/") return "site/index.html";

  const withoutSlash = ref.replace(/^\/+/, "");
  const direct = path.join("site", withoutSlash);
  if (path.extname(withoutSlash)) return direct;

  const html = `${direct}.html`;
  if (existsSync(abs(html))) return html;

  return direct;
}

function shouldIgnoreRef(ref) {
  return (
    !ref ||
    OPTIONAL_LOCAL_REFS.has(ref) ||
    ref.startsWith("#") ||
    ref.startsWith("http://") ||
    ref.startsWith("https://") ||
    ref.startsWith("mailto:") ||
    ref.startsWith("data:") ||
    ref.startsWith("var(") ||
    ref.startsWith("%23")
  );
}

function stripComments(source) {
  return source
    .replaceAll(/<!--[\s\S]*?-->/g, "")
    .replaceAll(/\/\*[\s\S]*?\*\//g, "");
}

function walk(dir, extensions) {
  const start = abs(dir);
  if (!existsSync(start)) return [];
  const out = [];

  for (const entry of readdirSync(start)) {
    const full = path.join(start, entry);
    const relative = path.relative(ROOT, full);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(relative, extensions));
    } else if (extensions.includes(path.extname(entry))) {
      out.push(relative);
    }
  }

  return out.sort();
}

function abs(file) {
  return path.join(ROOT, file);
}

function firstLine(text) {
  return String(text).trim().split("\n")[0] || "unknown error";
}
