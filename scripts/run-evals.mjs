#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const STEPS = [
  {
    label: "roadmap contract",
    args: [resolve(ROOT, "scripts/check-roadmap.mjs")]
  },
  {
    label: "site data contract",
    args: [resolve(ROOT, "scripts/check-site-data.mjs")]
  },
  {
    label: "javascript syntax",
    args: [resolve(ROOT, "scripts/check-js.mjs")]
  },
  {
    label: "node test suite",
    args: [
      "--test",
      resolve(ROOT, "tests/site-contract.test.mjs"),
      resolve(ROOT, "tests/roadmap-contract.test.mjs")
    ]
  }
];

for (const step of STEPS) {
  console.log(`\n==> ${step.label}`);
  const result = spawnSync(process.execPath, step.args, {
    cwd: ROOT,
    stdio: "inherit"
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`\nok - ${STEPS.length} eval step(s) passed`);
