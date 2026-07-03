#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = parseArgs(process.argv.slice(2));
const SITE_DIR = args.siteDir || "site";
const CANONICAL_ORIGIN = (args.canonicalOrigin || "https://www.punkrockai.com").replace(/\/+$/, "");
const BASE_URL = args.baseUrl ? args.baseUrl.replace(/\/+$/, "") : null;
const CANONICAL_ROUTE_OVERRIDES = new Map([
  ["site/widgets/posse-graph.html", "/widgets/posse-builder"],
]);
const PROTECTED_MARKDOWN_PATHS = new Set([
  "/README.md",
  "/site/README.md",
  "/public/fonts/README.md",
]);

const failures = [];
const warnings = [];
const summaries = [];

checkPublicMarkdownFiles();
checkPublicMarkdownLinks();
checkHtmlCrawlTargets();
checkSitemapTargets();
checkCanonicalOgDrift();

if (BASE_URL) {
  await checkHttpIndexHygiene(BASE_URL);
} else {
  warnings.push("HTTP probes skipped; pass --base-url <url> to check sitemap redirects and public Markdown responses.");
}

printSummary();

if (failures.length) process.exit(1);

function checkPublicMarkdownFiles() {
  const files = walk(SITE_DIR, [".md"]);
  let unexpected = 0;
  for (const file of files) {
    const publicPath = toPublicPath(file);
    if (PROTECTED_MARKDOWN_PATHS.has(publicPath)) continue;
    unexpected += 1;
    failures.push({
      check: "unexpected public Markdown response",
      file,
      detail: `${publicPath} is deployable from ${SITE_DIR}/`,
    });
  }
  summaries.push(["unexpected public Markdown responses", unexpected]);
}

function checkPublicMarkdownLinks() {
  let count = 0;
  for (const file of publicTextFiles()) {
    const source = readFileSync(abs(file), "utf8");
    for (const ref of extractRefs(source, { includeContentAttributes: false })) {
      if (!isMarkdownUrl(ref)) continue;
      count += 1;
      failures.push({
        check: "public .md link",
        file,
        detail: ref,
      });
    }
  }
  summaries.push(["public .md links", count]);
}

function checkHtmlCrawlTargets() {
  let count = 0;
  for (const file of publicTextFiles()) {
    const source = readFileSync(abs(file), "utf8");
    for (const ref of extractRefs(source)) {
      if (!isPublicHtmlTarget(ref)) continue;
      count += 1;
      failures.push({
        check: ".html public crawl target",
        file,
        detail: ref,
      });
    }
  }
  summaries.push([".html public crawl targets", count]);
}

function checkSitemapTargets() {
  const file = path.join(SITE_DIR, "sitemap.xml");
  if (!existsSync(abs(file))) {
    failures.push({
      check: "sitemap hygiene",
      file,
      detail: "missing sitemap.xml",
    });
    summaries.push(["sitemap URLs", 0]);
    return;
  }

  const urls = extractSitemapUrls(readFileSync(abs(file), "utf8"));
  let suspect = 0;
  for (const url of urls) {
    const parsed = parseUrl(url);
    if (!parsed) {
      suspect += 1;
      failures.push({ check: "sitemap hygiene", file, detail: `invalid URL ${url}` });
      continue;
    }
    if (parsed.origin !== CANONICAL_ORIGIN) {
      suspect += 1;
      failures.push({
        check: "sitemap canonical host drift",
        file,
        detail: `${url} should use ${CANONICAL_ORIGIN}`,
      });
    }
    if (parsed.pathname.endsWith(".html")) {
      suspect += 1;
      failures.push({
        check: "sitemap .html crawl target",
        file,
        detail: url,
      });
    }
  }
  summaries.push(["sitemap URLs", urls.length]);
  summaries.push(["sitemap canonical/.html issues", suspect]);
}

function checkCanonicalOgDrift() {
  let checked = 0;
  let drift = 0;
  let missingOgUrl = 0;
  const files = walk(SITE_DIR, [".html"]).filter(
    (file) => !file.includes("/partials/") && file !== path.join(SITE_DIR, "404.html")
  );
  for (const file of files) {
    checked += 1;
    const source = readFileSync(abs(file), "utf8");
    const expected = expectedCanonicalUrl(file);
    const canonical = extractTagUrl(source, "link", "rel", "canonical", "href");
    const ogUrl = extractTagUrl(source, "meta", "property", "og:url", "content");

    if (!canonical) {
      drift += 1;
      failures.push({
        check: "canonical/OG drift",
        file,
        detail: `missing canonical link; expected ${expected}`,
      });
    } else if (canonical !== expected) {
      drift += 1;
      failures.push({
        check: "canonical/OG drift",
        file,
        detail: `canonical ${canonical} should be ${expected}`,
      });
    }

    if (!ogUrl) {
      missingOgUrl += 1;
    } else if (ogUrl !== (canonical || expected)) {
      drift += 1;
      failures.push({
        check: "canonical/OG drift",
        file,
        detail: `og:url ${ogUrl} does not match ${canonical || expected}`,
      });
    }
  }
  summaries.push(["HTML pages checked for canonical/OG drift", checked]);
  summaries.push(["canonical/OG drift issues", drift]);
  summaries.push(["HTML pages without og:url (informational)", missingOgUrl]);
}

async function checkHttpIndexHygiene(baseUrl) {
  const sitemapFile = path.join(SITE_DIR, "sitemap.xml");
  const sitemapUrls = existsSync(abs(sitemapFile))
    ? extractSitemapUrls(readFileSync(abs(sitemapFile), "utf8"))
    : [];
  let redirectCount = 0;

  for (const url of sitemapUrls) {
    const pathOnly = parseUrl(url)?.pathname || "/";
    const probeUrl = `${baseUrl}${pathOnly}`;
    try {
      const res = await fetch(probeUrl, { redirect: "manual" });
      if (res.status >= 300 && res.status < 400) {
        redirectCount += 1;
        failures.push({
          check: "sitemap URL redirects",
          file: sitemapFile,
          detail: `${probeUrl} -> ${res.headers.get("location") || res.status}`,
        });
      }
    } catch (error) {
      failures.push({
        check: "sitemap URL probe",
        file: sitemapFile,
        detail: `${probeUrl}: ${error.message}`,
      });
    }
  }

  let markdownResponses = 0;
  for (const file of walk(SITE_DIR, [".md"])) {
    const probeUrl = `${baseUrl}${toPublicPath(file)}`;
    try {
      const res = await fetch(probeUrl, { redirect: "manual" });
      const contentType = res.headers.get("content-type") || "";
      if (res.status === 200 && /(?:markdown|text\/plain|octet-stream)/i.test(contentType)) {
        markdownResponses += 1;
        failures.push({
          check: "unexpected public Markdown response",
          file,
          detail: `${probeUrl} returned ${res.status} ${contentType || "unknown content-type"}`,
        });
      }
    } catch (error) {
      failures.push({
        check: "public Markdown probe",
        file,
        detail: `${probeUrl}: ${error.message}`,
      });
    }
  }

  summaries.push(["sitemap URLs that redirect over HTTP", redirectCount]);
  summaries.push(["public Markdown HTTP responses", markdownResponses]);
}

function printSummary() {
  console.log("Index hygiene summary");
  console.log(`site: ${SITE_DIR}`);
  console.log(`canonical origin: ${CANONICAL_ORIGIN}`);
  if (BASE_URL) console.log(`HTTP base URL: ${BASE_URL}`);
  console.log("");

  for (const [label, count] of summaries) {
    console.log(`${count === 0 ? "ok" : "check"} - ${label}: ${count}`);
  }

  for (const warning of warnings) {
    console.log(`skip - ${warning}`);
  }

  if (!failures.length) {
    console.log("\nAll index hygiene checks passed.");
    return;
  }

  console.error(`\n${failures.length} index hygiene issue${failures.length === 1 ? "" : "s"} found:`);
  for (const failure of failures) {
    console.error(`- [${failure.check}] ${failure.file}: ${failure.detail}`);
  }
}

function publicTextFiles() {
  return [
    ...walk(SITE_DIR, [".html", ".xml", ".txt"]),
  ];
}

function extractRefs(source, { includeContentAttributes = true } = {}) {
  const refs = [];
  const attrs = includeContentAttributes ? "href|src|content" : "href|src";
  const attrPattern = new RegExp(`\\b(?:${attrs})=["']([^"']+)["']`, "g");
  const urlPattern = /https?:\/\/[^\s"'<>),]+/g;
  let match;
  while ((match = attrPattern.exec(source))) refs.push(match[1]);
  while ((match = urlPattern.exec(source))) refs.push(match[0]);
  return [...new Set(refs)];
}

function extractSitemapUrls(source) {
  const urls = [];
  const pattern = /<loc>\s*([^<]+?)\s*<\/loc>/g;
  let match;
  while ((match = pattern.exec(source))) urls.push(match[1].trim());
  return urls;
}

function extractTagUrl(source, tag, keyAttr, keyValue, valueAttr) {
  const pattern = new RegExp(`<${tag}\\b[^>]*\\b${keyAttr}=["']${escapeRegExp(keyValue)}["'][^>]*>`, "i");
  const match = source.match(pattern);
  if (!match) return null;
  const valuePattern = new RegExp(`\\b${valueAttr}=["']([^"']+)["']`, "i");
  return match[0].match(valuePattern)?.[1] || null;
}

function expectedCanonicalUrl(file) {
  const override = CANONICAL_ROUTE_OVERRIDES.get(file);
  if (override) return `${CANONICAL_ORIGIN}${override}`;
  if (file === path.join(SITE_DIR, "index.html")) return `${CANONICAL_ORIGIN}/`;
  const route = file
    .slice(SITE_DIR.length + 1, -".html".length)
    .replace(/\/index$/, "");
  return `${CANONICAL_ORIGIN}/${route}`;
}

function isMarkdownUrl(ref) {
  const clean = cleanRef(ref);
  if (!/\.md$/i.test(clean)) return false;
  const parsed = parseUrl(clean);
  if (!parsed) return true;
  return parsed.origin === CANONICAL_ORIGIN || parsed.hostname.endsWith(".punkrockai.com");
}

function isPublicHtmlTarget(ref) {
  const clean = cleanRef(ref);
  if (!/\.html$/i.test(clean)) return false;
  return clean.startsWith("/") || clean.startsWith("http://") || clean.startsWith("https://");
}

function cleanRef(ref) {
  return ref.split("#")[0].split("?")[0].replace(/[.,;:]+$/, "");
}

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function toPublicPath(file) {
  return `/${file.slice(SITE_DIR.length + 1)}`;
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

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--site-dir") {
      parsed.siteDir = requireValue(argv, ++index, arg);
    } else if (arg === "--canonical-origin") {
      parsed.canonicalOrigin = requireValue(argv, ++index, arg);
    } else if (arg === "--base-url") {
      parsed.baseUrl = requireValue(argv, ++index, arg);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function abs(file) {
  return path.join(ROOT, file);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
