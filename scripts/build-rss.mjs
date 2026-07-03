#!/usr/bin/env node
// build-rss.mjs — emits site/feed.xml as a static RSS 2.0 feed.
//
// Inputs:
//   - site/recap.html — top-level article + each <section class="recap__section" id="…">
//     becomes a feed item. The article's <time datetime> drives pubDate.
//   - site/notes/*.html — future field notes. Each note must declare
//     <meta name="pubDate" content="YYYY-MM-DD"> and <title>; first <p> in
//     <main> becomes the description.
//
// Items are sorted by pubDate descending. Absolute URLs use SITE_URL.
// Re-run after editing recap or adding notes:  node scripts/build-rss.mjs

import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const SITE = resolve(ROOT, "site");
const RECAP = resolve(SITE, "recap.html");
const NOTES_DIR = resolve(SITE, "notes");
const OUT = resolve(SITE, "feed.xml");

const SITE_URL = "https://www.punkrockai.com";
const FEED_TITLE = "Punk Rock AI — field notes";
const FEED_DESC =
  "Field notes from Kris Krüg's Punk Rock AI / Both Hands Full keynote: the talk, the portal, the receipts.";
const FEED_LANG = "en-us";

if (!existsSync(RECAP)) die(`missing: ${RECAP}`);

const items = [];

const recapHtml = await readFile(RECAP, "utf8");
const recapDate = extractRecapDate(recapHtml) ?? new Date().toISOString().slice(0, 10);

items.push({
  title: "How we built Punk Rock AI",
  link: `${SITE_URL}/recap`,
  guid: `${SITE_URL}/recap`,
  description:
    "A feature-length recap of the Punk Rock AI / Both Hands Full keynote — the talk, the building, the room, what came next. The whole arc, with receipts.",
  pubDate: recapDate,
});

for (const section of parseRecapSections(recapHtml)) {
  items.push({
    title: `Recap · ${section.title}`,
    link: `${SITE_URL}/recap#${section.id}`,
    guid: `${SITE_URL}/recap#${section.id}`,
    description: section.description,
    pubDate: recapDate,
  });
}

if (existsSync(NOTES_DIR)) {
  const entries = await readdir(NOTES_DIR);
  for (const name of entries) {
    if (!name.endsWith(".html")) continue;
    const noteHtml = await readFile(resolve(NOTES_DIR, name), "utf8");
    const note = parseNote(noteHtml, name);
    if (note) items.push(note);
  }
}

items.sort((a, b) => b.pubDate.localeCompare(a.pubDate));

const buildDate = new Date().toUTCString();
const xml = renderRss({
  title: FEED_TITLE,
  link: SITE_URL + "/",
  feedLink: `${SITE_URL}/feed.xml`,
  description: FEED_DESC,
  language: FEED_LANG,
  buildDate,
  items: items.map((it) => ({
    ...it,
    pubDate: toRfc822(it.pubDate),
  })),
});

await writeFile(OUT, xml + "\n");
console.log(`wrote ${items.length} items → site/feed.xml`);

// ---------------------------------------------------------------------------

function extractRecapDate(html) {
  const m = html.match(/<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"/);
  return m ? m[1] : null;
}

function parseRecapSections(html) {
  const re = /<section\s+class="recap__section"\s+id="([^"]+)">([\s\S]*?)<\/section>/g;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    const id = m[1];
    const body = m[2];
    const titleMatch = body.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
    const proseMatch = body.match(/<div\s+class="recap__prose">([\s\S]*?)<\/div>/);
    const firstP = proseMatch ? proseMatch[1].match(/<p[^>]*>([\s\S]*?)<\/p>/) : null;
    if (!titleMatch) continue;
    const title = decodeEntities(stripTags(titleMatch[1])).replace(/\.\s*$/, "").trim();
    const description = firstP
      ? truncate(decodeEntities(stripTags(firstP[1])).replace(/\s+/g, " ").trim(), 400)
      : "";
    out.push({ id, title, description });
  }
  return out;
}

function parseNote(html, filename) {
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
  const dateMatch = html.match(/<meta\s+name="pubDate"\s+content="(\d{4}-\d{2}-\d{2})"/);
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/);
  const fallbackP = html.match(/<main[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/);
  if (!titleMatch || !dateMatch) {
    console.warn(`skipped notes/${filename}: missing <title> or <meta name="pubDate">`);
    return null;
  }
  const slug = filename.replace(/\.html$/, "");
  const title = decodeEntities(stripTags(titleMatch[1])).trim();
  const description = decodeEntities(
    stripTags(descMatch ? descMatch[1] : fallbackP ? fallbackP[1] : "")
  )
    .replace(/\s+/g, " ")
    .trim();
  const link = `${SITE_URL}/notes/${slug}`;
  return {
    title,
    link,
    guid: link,
    description: truncate(description, 400),
    pubDate: dateMatch[1],
  };
}

function renderRss({ title, link, feedLink, description, language, buildDate, items }) {
  const itemsXml = items
    .map(
      (it) => `    <item>
      <title>${esc(it.title)}</title>
      <link>${esc(it.link)}</link>
      <guid isPermaLink="true">${esc(it.guid)}</guid>
      <description>${esc(it.description)}</description>
      <pubDate>${esc(it.pubDate)}</pubDate>
    </item>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(title)}</title>
    <link>${esc(link)}</link>
    <atom:link href="${esc(feedLink)}" rel="self" type="application/rss+xml" />
    <description>${esc(description)}</description>
    <language>${esc(language)}</language>
    <lastBuildDate>${esc(buildDate)}</lastBuildDate>
${itemsXml}
  </channel>
</rss>`;
}

function toRfc822(dateStr) {
  // dateStr is YYYY-MM-DD; anchor at 12:00 UTC so timezone-agnostic.
  const d = new Date(`${dateStr}T12:00:00Z`);
  return d.toUTCString();
}

function stripTags(s) {
  return String(s).replace(/<[^>]*>/g, "");
}

function decodeEntities(s) {
  return String(s)
    .replaceAll("&mdash;", "—")
    .replaceAll("&ndash;", "–")
    .replaceAll("&middot;", "·")
    .replaceAll("&hellip;", "…")
    .replaceAll("&ldquo;", "“")
    .replaceAll("&rdquo;", "”")
    .replaceAll("&lsquo;", "‘")
    .replaceAll("&rsquo;", "’")
    .replaceAll("&rarr;", "→")
    .replaceAll("&uuml;", "ü")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function truncate(s, n) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
}

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function die(msg) {
  console.error(msg);
  process.exit(1);
}
