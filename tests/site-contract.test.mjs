import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const SITE = resolve(ROOT, "site");

test("static site routes resolve to committed files", async (t) => {
  const routes = await collectRoutes();
  for (const route of routes) {
    await t.test(route, async () => {
      const filePath = routeToFile(route);
      const fileStat = await stat(filePath);
      assert.ok(fileStat.isFile());
    });
  }
});

test("html references resolve to committed local assets", async (t) => {
  const htmlFiles = await collectHtmlFiles();

  for (const htmlFile of htmlFiles) {
    await t.test(htmlFile, async () => {
      const content = await readFile(resolve(SITE, htmlFile), "utf8");

      for (const ref of extractLocalRefs(content)) {
        const filePath = routeToFile(ref);
        if (!filePath) continue;
        const response = await readFile(filePath, "utf8").catch(() => null);
        assert.ok(response !== null, `${ref} referenced by ${htmlFile} is missing`);
      }

      for (const partial of extractPartials(content)) {
        const partialPath = resolve(SITE, "partials", `${partial}.html`);
        const response = await readFile(partialPath, "utf8").catch(() => null);
        assert.ok(response !== null, `partial ${partial}.html referenced by ${htmlFile} is missing`);
      }
    });
  }
});

async function collectRoutes() {
  const rootHtml = await readdir(SITE);
  const widgetHtml = await readdir(resolve(SITE, "widgets"));
  const dataFiles = await readdir(resolve(SITE, "data"));
  const partialFiles = await readdir(resolve(SITE, "partials"));

  return [
    "/",
    ...rootHtml.filter((name) => name.endsWith(".html") && name !== "index.html").map((name) => `/${name}`),
    ...widgetHtml.filter((name) => name.endsWith(".html")).map((name) => `/widgets/${name}`),
    ...dataFiles.filter((name) => name.endsWith(".json")).map((name) => `/data/${name}`),
    ...partialFiles.filter((name) => name.endsWith(".html")).map((name) => `/partials/${name}`)
  ].sort();
}

async function collectHtmlFiles() {
  const rootHtml = (await readdir(SITE)).filter((name) => name.endsWith(".html")).map((name) => name);
  const widgetHtml = (await readdir(resolve(SITE, "widgets")))
    .filter((name) => name.endsWith(".html"))
    .map((name) => `widgets/${name}`);
  return [...rootHtml, ...widgetHtml].sort();
}

function extractLocalRefs(content) {
  const refs = new Set();
  const regex = /\b(?:src|href)=["'](\/[^"'?#]+)["']/g;
  for (const match of content.matchAll(regex)) {
    refs.add(match[1]);
  }
  return [...refs];
}

function extractPartials(content) {
  const partials = new Set();
  const regex = /data-include=["']([^"']+)["']/g;
  for (const match of content.matchAll(regex)) {
    partials.add(match[1]);
  }
  return [...partials];
}

function routeToFile(route) {
  if (route === "/") return resolve(SITE, "index.html");
  return resolve(SITE, `.${route}`);
}
