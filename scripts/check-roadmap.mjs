#!/usr/bin/env node

import { loadRoadmap, roadmapSummary, validateRoadmap } from "./lib/roadmap.mjs";

const roadmap = await loadRoadmap();
const errors = await validateRoadmap(roadmap);

if (errors.length) {
  console.error(`roadmap validation failed with ${errors.length} issue(s):`);
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log(`ok - ${roadmap.items.length} roadmap item(s) validated`);
console.log(roadmapSummary(roadmap));
