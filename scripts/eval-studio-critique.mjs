#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = path.join(ROOT, "tests/fixtures/studio-critique");
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
export function loadCases() {
  return readJson(path.join(FIXTURES, "cases.json")).cases.map((fixture) => {
    for (const edition of fixture.editions) for (const source of edition.sources) {
      source.quote = source.quote.repeat(source.repeat ?? 1);
      delete source.repeat;
    }
    return fixture;
  });
}
const exactKeys = (value, keys) => value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join(",") === [...keys].sort().join(",");
const text = (value) => typeof value === "string" && value.trim().length > 0 && value.length <= 1200;

export function validateResponse(response, fixture) {
  const errors = [];
  if (!exactKeys(response, ["status", "observation", "experiment", "reason"])) return ["response fields"];
  if (!["feedback", "uncertain", "refused"].includes(response.status)) return ["status"];
  if (response.status !== "feedback") {
    if (response.observation !== null || response.experiment !== null || !text(response.reason)) errors.push("abstention shape");
    return errors;
  }
  if (fixture.disposition === "uncertain") errors.push("fixture requires uncertainty or refusal");
  if (response.reason !== null) errors.push("feedback reason must be null");
  for (const field of ["observation", "experiment"]) {
    const item = response[field];
    if (!exactKeys(item, ["text", "evidence"]) || !text(item.text)
        || !Array.isArray(item.evidence) || !item.evidence.length) {
      errors.push(`${field} shape`);
      continue;
    }
    const seen = new Set();
    for (const reference of item.evidence) {
      if (!exactKeys(reference, ["editionId", "sourceId", "quote"])) {
        errors.push(`${field} reference fields`);
        continue;
      }
      const edition = fixture.editions.find((entry) => entry.id === reference.editionId);
      const source = edition?.sources.find((entry) => entry.id === reference.sourceId);
      if (!source || typeof reference.quote !== "string" || !reference.quote.trim()
          || !source.quote.includes(reference.quote)) errors.push(`${field} unsupported reference`);
      const key = JSON.stringify(reference);
      if (seen.has(key)) errors.push(`${field} duplicate reference`);
      seen.add(key);
    }
  }
  return errors;
}

function runChecks() {
  const cases = loadCases();
  const rubrics = readJson(path.join(ROOT, "site/data/crit-rubrics.json"));
  assert.equal(new Set(cases.map((fixture) => fixture.id)).size, cases.length);
  const snapshot = JSON.stringify(cases);
  for (const fixture of cases) {
    assert.ok(rubrics.angles.some((angle) => angle.id === fixture.angle));
    assert.equal(fixture.baseline.status, fixture.disposition);
    assert.deepEqual(validateResponse(fixture.baseline, fixture), [], fixture.id);
    const ids = fixture.editions.map((edition) => edition.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const edition of fixture.editions) {
      assert.equal(new Set(edition.sources.map((source) => source.id)).size, edition.sources.length);
      if (edition.asset) {
        assert.equal(edition.asset, "edition.svg");
        const svg = readFileSync(path.join(FIXTURES, edition.asset), "utf8");
        for (const source of edition.sources) assert.ok(svg.includes(`id="${source.id}"`));
      }
    }
  }
  const fixture = cases.find((entry) => entry.id === "instruction-in-art");
  let rejected = 0;
  const reject = (response) => {
    assert.ok(validateResponse(response, fixture).length, JSON.stringify(response));
    rejected++;
  };
  for (const response of [null, [], {}, { ...fixture.baseline, status: "saved" },
    { ...fixture.baseline, project: { title: "overwritten" } },
    { ...fixture.baseline, operations: [{ op: "delete" }] },
    { status: "uncertain", observation: null, experiment: null, reason: "" }]) reject(response);
  for (const field of ["observation", "experiment"]) {
    for (const mutation of [
      (item) => { item.text = ""; },
      (item) => { item.apply = true; },
      (item) => { item.evidence = []; },
      (item) => { item.evidence[0].editionId = "unselected"; },
      (item) => { item.evidence[0].sourceId = "invented"; },
      (item) => { item.evidence[0].quote = "not in the work"; },
      (item) => { item.evidence[0].quote = ""; },
      (item) => { item.evidence[0].quote = 12; },
      (item) => { item.evidence.push(item.evidence[0]); },
    ]) {
      const response = structuredClone(fixture.baseline);
      mutation(response[field]);
      reject(response);
    }
  }
  assert.ok(validateResponse(fixture.baseline, cases.find((entry) => entry.id === "unsupported-pattern")).length);
  assert.deepEqual(validateResponse({ status: "refused", observation: null, experiment: null,
    reason: "The requested claim is unsupported by the selected editions." }, fixture), []);
  assert.equal(JSON.stringify(cases), snapshot, "validation must not mutate project fixtures");
  assert.ok(cases.find((entry) => entry.id === "long-text").editions[0].sources[0].quote.length > 10000);
  console.log(`ok - ${cases.length} synthetic manual baselines; ${rejected} invalid responses rejected; no model calls`);
}

function main() {
  const args = process.argv.slice(2);
  if (!args.length) return runChecks();
  if (args.length !== 4 || args[0] !== "--fixture" || args[2] !== "--response") {
    throw new Error("Usage: node scripts/eval-studio-critique.mjs [--fixture ID --response FILE]");
  }
  const fixture = loadCases().find((entry) => entry.id === args[1]);
  if (!fixture) throw new Error("Unknown fixture");
  const errors = validateResponse(readJson(args[3]), fixture);
  if (errors.length) throw new Error(errors.join("; "));
  console.log("ok - response structure and references; artistic quality remains unscored");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
