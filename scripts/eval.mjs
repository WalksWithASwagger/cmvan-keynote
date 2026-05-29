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
  ["clean URL aliases", checkCleanUrlAliases],
  ["widget contracts", checkWidgetContracts],
  ["data references", checkJavaScriptDataReferences],
  ["Vercel static config", checkVercelConfig],
  ["deployment placeholders", checkDeploymentPlaceholders],
  ["cache policy", checkCachePolicy],
  ["Release Day submissions smoke", checkReleaseDaySubmissions],
  ["newsletter subscribe smoke", checkNewsletterSubscribe],
  ["maintained doc links", checkMaintainedDocLinks],
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

  const routePattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*data-route=["']([^"']+)["'][^>]*>/g;
  let match;
  while ((match = routePattern.exec(source))) {
    if (match[1] !== match[2]) {
      failures.push(`${file}: data-route ${match[2]} does not match href ${match[1]}`);
    }
  }

  for (const link of links) {
    const target = resolveSiteRef(link, file);
    if (!target || existsSync(abs(target))) continue;
    failures.push(`${file}: nav target missing ${link} -> ${target}`);
  }
}

function checkWidgetContracts() {
  const redirectRules = parseRedirectRules();
  const widgetFiles = walk("site/widgets", [".html"]);

  for (const file of widgetFiles) {
    const source = readFileSync(abs(file), "utf8");
    const slug = path.basename(file, ".html");
    const cleanRoute = `/widgets/${slug}`;

    if (!redirectRules.has(cleanRoute)) {
      failures.push(`site/_redirects: missing widget clean URL alias ${cleanRoute}`);
    }
    if (isRedirectOnlyWidget(source)) continue;

    const expectedCss = `/css/widgets/${slug}.css`;
    const expectedJs = `/js/widgets/${slug}.js`;
    if (!source.includes(`href="${expectedCss}"`) && !source.includes(`href='${expectedCss}'`)) {
      failures.push(`${file}: missing widget stylesheet ${expectedCss}`);
    }
    if (!source.includes(`src="${expectedJs}"`) && !source.includes(`src='${expectedJs}'`)) {
      failures.push(`${file}: missing widget script ${expectedJs}`);
    }

  }
}

function checkCleanUrlAliases() {
  const redirectRules = parseRedirectRules();
  const pageFiles = walk("site", [".html"]).filter((file) => {
    return (
      file !== "site/index.html" &&
      file !== "site/404.html" &&
      !file.startsWith("site/partials/") &&
      !file.startsWith("site/widgets/")
    );
  });

  for (const file of pageFiles) {
    const route = `/${file.slice("site/".length, -".html".length)}`;
    if (!redirectRules.has(route)) {
      failures.push(`site/_redirects: missing clean URL alias ${route}`);
    }
  }
}

function checkJavaScriptDataReferences() {
  const files = walk("site/js", [".js", ".mjs"]);
  for (const file of files) {
    const source = stripComments(readFileSync(abs(file), "utf8"));
    const pattern = /["'`](\/data\/[^"'`]*?\.json)["'`]/g;
    let match;
    while ((match = pattern.exec(source))) {
      const ref = match[1];
      if (ref.includes("${")) continue;
      const target = resolveSiteRef(ref, file);
      if (target && !existsSync(abs(target))) {
        failures.push(`${file}: missing data reference ${ref} -> ${target}`);
      }
    }

    if (source.includes("/data/photos-${SLUG}.json")) {
      checkPhotoGalleryDataRefs(file);
    }
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

function checkDeploymentPlaceholders() {
  const files = [
    "vercel.json",
    "wrangler.toml",
    "site/_headers",
    "site/_redirects",
  ];
  const placeholders = [
    "YOUR-WORKERS",
    "YOUR_",
    "example.com",
  ];

  for (const file of files) {
    if (!existsSync(abs(file))) continue;
    const source = readFileSync(abs(file), "utf8");
    for (const placeholder of placeholders) {
      if (source.includes(placeholder)) {
        failures.push(`${file}: deployment config contains placeholder ${placeholder}`);
      }
    }
  }
}

function checkCachePolicy() {
  const vercelFile = "vercel.json";
  let config;
  try {
    config = JSON.parse(readFileSync(abs(vercelFile), "utf8"));
  } catch {
    return;
  }

  for (const source of ["/css/(.*)", "/js/(.*)"]) {
    const block = config.headers?.find((item) => item.source === source);
    const cache = block?.headers?.find((header) => header.key.toLowerCase() === "cache-control")?.value || "";
    if (/immutable/i.test(cache)) {
      failures.push(`${vercelFile}: ${source} must not use immutable caching without content-hashed filenames`);
    }
  }

  const headersFile = "site/_headers";
  if (!existsSync(abs(headersFile))) return;
  const headers = readFileSync(abs(headersFile), "utf8");
  for (const route of ["/css/*", "/js/*"]) {
    const pattern = new RegExp(`${escapeRegExp(route)}\\s+Cache-Control:\\s+([^\\n]+)`, "m");
    const match = headers.match(pattern);
    if (match && /immutable/i.test(match[1])) {
      failures.push(`${headersFile}: ${route} must not use immutable caching without content-hashed filenames`);
    }
  }
}

function checkReleaseDaySubmissions() {
  const result = spawnSync(process.execPath, ["scripts/smoke-release-day.mjs"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    failures.push(`scripts/smoke-release-day.mjs: ${firstLine(result.stderr || result.stdout)}`);
  }
}

function checkNewsletterSubscribe() {
  const result = spawnSync(process.execPath, ["scripts/smoke-subscribe.mjs"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    failures.push(`scripts/smoke-subscribe.mjs: ${firstLine(result.stderr || result.stdout)}`);
  }
}

function checkMaintainedDocLinks() {
  const result = spawnSync(process.execPath, ["scripts/check-doc-links.mjs", "--maintained"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    failures.push(`scripts/check-doc-links.mjs --maintained: ${firstLine(result.stderr || result.stdout)}`);
  }
}

function parseRedirectRules() {
  const file = "site/_redirects";
  if (!existsSync(abs(file))) return new Map();
  const rules = new Map();
  const lines = readFileSync(abs(file), "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [from, to] = trimmed.split(/\s+/);
    if (from && to) rules.set(from, to);
  }
  return rules;
}

function isRedirectOnlyWidget(source) {
  return /http-equiv=["']refresh["']/i.test(source);
}

function checkPhotoGalleryDataRefs(controllerFile) {
  const files = walk("site/photos", [".html"]);
  for (const file of files) {
    const source = readFileSync(abs(file), "utf8");
    const match = source.match(/\bdata-slug=["']([^"']+)["']/);
    if (!match) {
      failures.push(`${file}: missing photo gallery data-slug for ${controllerFile}`);
      continue;
    }
    const ref = `/data/photos-${match[1]}.json`;
    const target = resolveSiteRef(ref, file);
    if (target && !existsSync(abs(target))) {
      failures.push(`${file}: missing photo gallery data ${ref} -> ${target}`);
    }
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
