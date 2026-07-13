import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECKER = path.join(ROOT, "scripts/check-index-hygiene.mjs");
const CANONICAL_ORIGIN = "https://www.punkrockai.com";
const FALLBACK_IMAGE = `${CANONICAL_ORIGIN}/public/slides/neither-are-we.webp`;

test("accepts fallback and existing page-specific images on the canonical site", async () => {
  const result = await runChecker({
    "/": { ogImage: FALLBACK_IMAGE, twitterImage: FALLBACK_IMAGE },
    "/feature": {
      ogImage: "https://punkrockai.com/public/slides/page-specific.webp",
      twitterImage: "https://punkrockai.com/public/slides/page-specific.webp",
    },
  });

  assert.equal(result.code, 0, result.output);
  assert.match(result.output, /social preview image issues: 0/);
});

test("rejects a missing Open Graph image", async () => {
  const result = await runChecker({
    "/": { twitterImage: FALLBACK_IMAGE },
  });

  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /og:image is missing/);
});

test("rejects relative social image URLs", async () => {
  const result = await runChecker({
    "/": {
      ogImage: "/public/slides/neither-are-we.webp",
      twitterImage: "/public/slides/neither-are-we.webp",
    },
  });

  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /must be an absolute URL/);
});

test("rejects social images on a foreign host", async () => {
  const image = "https://images.example.com/social.webp";
  const result = await runChecker({
    "/": { ogImage: image, twitterImage: image },
  });

  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /must use the punkrockai\.com canonical site host \(www optional\)/);
});

test("rejects Twitter images that do not match Open Graph", async () => {
  const result = await runChecker({
    "/": {
      ogImage: FALLBACK_IMAGE,
      twitterImage: `${CANONICAL_ORIGIN}/public/slides/page-specific.webp`,
    },
  });

  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /twitter:image .* should match og:image/);
});

test("keeps the homepage critical rendering path stable", () => {
  const home = readFileSync(path.join(ROOT, "site/index.html"), "utf8");
  const headerPartial = readFileSync(
    path.join(ROOT, "site/partials/header.html"),
    "utf8"
  );
  const refrainCss = readFileSync(
    path.join(ROOT, "site/css/widgets/daily-refrain.css"),
    "utf8"
  );
  const zineCss = readFileSync(path.join(ROOT, "site/css/zine-overhaul.css"), "utf8");

  assert.match(
    home,
    /rel="preload"[\s\S]*href="\/public\/photos\/michelle-diamond\/195\.webp"[\s\S]*fetchpriority="high"/
  );
  assert.match(home, /<header class="site-header">[\s\S]*<nav class="site-nav"/);
  assert.doesNotMatch(home, /<header[^>]+data-include="header"/);
  const inlineHeader = home.match(/<header class="site-header">([\s\S]*?)<\/header>/)?.[1];
  assert.ok(inlineHeader);
  assert.deepEqual(extractHrefs(inlineHeader), extractHrefs(headerPartial));
  assert.match(refrainCss, /--refrain-min-h:\s*7\.75rem/);
  assert.match(zineCss, /\.punk-section,[\s\S]*content-visibility:\s*auto/);
  assert.match(
    zineCss,
    /@media \(max-width: 720px\)[\s\S]*\.hero__photo-layer,[\s\S]*animation:\s*none/
  );
});

function extractHrefs(source) {
  return [...source.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
}

async function runChecker(pages) {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "punk-rock-ai-index-hygiene-"));
  const siteDir = path.join(fixtureRoot, "site");
  await mkdir(siteDir);

  try {
    const sitemapUrls = [];
    for (const [route, metadata] of Object.entries(pages)) {
      const canonical = `${CANONICAL_ORIGIN}${route}`;
      sitemapUrls.push(canonical);
      const file = route === "/" ? path.join(siteDir, "index.html") : path.join(siteDir, `${route.slice(1)}.html`);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, renderHtml(canonical, metadata));
    }

    await writeFile(
      path.join(siteDir, "sitemap.xml"),
      `<urlset>${sitemapUrls.map((url) => `<url><loc>${url}</loc></url>`).join("")}</urlset>`
    );

    try {
      const { stdout, stderr } = await execFileAsync(
        process.execPath,
        [
          CHECKER,
          "--site-dir",
          path.relative(ROOT, siteDir),
          "--canonical-origin",
          CANONICAL_ORIGIN,
        ],
        { cwd: ROOT, encoding: "utf8" }
      );
      return { code: 0, output: `${stdout}${stderr}` };
    } catch (error) {
      return {
        code: typeof error.code === "number" ? error.code : 1,
        output: `${error.stdout || ""}${error.stderr || ""}`,
      };
    }
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
}

function renderHtml(canonical, { ogImage, twitterImage }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <title>Fixture</title>
    <meta name="description" content="Fixture page." />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:url" content="${canonical}" />
    ${ogImage ? `<meta property="og:image" content="${ogImage}" />` : ""}
    ${twitterImage ? `<meta name="twitter:image" content="${twitterImage}" />` : ""}
  </head>
  <body><h1>Fixture</h1></body>
</html>
`;
}
