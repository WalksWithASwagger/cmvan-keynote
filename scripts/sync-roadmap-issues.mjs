#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { URLSearchParams } from "node:url";
import { ROADMAP_FILE, loadRoadmap, relFromRoot, renderIssueBody, validateRoadmap } from "./lib/roadmap.mjs";

const args = process.argv.slice(2);
const write = args.includes("--write");
const writeBack = args.includes("--write-back");
const itemId = readFlag("--id") ?? process.env.ROADMAP_ID ?? null;

const roadmap = await loadRoadmap();
const errors = await validateRoadmap(roadmap);
if (errors.length) {
  console.error("roadmap validation failed; refusing to sync issues");
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

const items = roadmap.items.filter((item) => !itemId || item.id === itemId);
if (itemId && items.length === 0) {
  console.error(`no roadmap item found for id: ${itemId}`);
  process.exit(1);
}

if (!write) {
  for (const item of items) {
    console.log(`${item.github.issue ? `update #${item.github.issue}` : "create"} :: ${item.id} :: ${item.title}`);
    console.log(renderIssueBody(item, roadmap));
  }
  process.exit(0);
}

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error("GITHUB_TOKEN is required when running with --write");
  process.exit(1);
}

const repository = process.env.GITHUB_REPOSITORY ?? roadmap.project.githubRepository;
const [owner, repo] = repository.split("/");
if (!owner || !repo) {
  console.error(`invalid GitHub repository: ${repository}`);
  process.exit(1);
}

const labelsToSync = new Map();
for (const label of roadmap.labelCatalog) {
  labelsToSync.set(label.name, label);
}

for (const item of items) {
  for (const labelName of item.github.labels) {
    const label = labelsToSync.get(labelName);
    if (label) {
      await ensureLabel({ owner, repo, token, label });
    }
  }
}

let changed = false;
for (const item of items) {
  const payload = {
    title: item.title,
    body: renderIssueBody(item, roadmap),
    labels: item.github.labels
  };

  if (item.github.issue) {
    const issue = await github(`PATCH /repos/${owner}/${repo}/issues/${item.github.issue}`, {
      token,
      body: payload
    });
    console.log(`updated #${issue.number} :: ${item.id}`);
    continue;
  }

  const issue = await github(`POST /repos/${owner}/${repo}/issues`, {
    token,
    body: payload
  });
  console.log(`created #${issue.number} :: ${item.id}`);
  item.github.issue = issue.number;
  changed = true;
}

if (writeBack && changed) {
  await writeFile(ROADMAP_FILE, JSON.stringify(roadmap, null, 2) + "\n");
  console.log(`wrote ${relFromRoot(ROADMAP_FILE)}`);
}

function readFlag(name) {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : null;
}

async function ensureLabel({ owner, repo, token, label }) {
  try {
    await github(`POST /repos/${owner}/${repo}/labels`, {
      token,
      body: label
    });
    console.log(`created label ${label.name}`);
  } catch (error) {
    if (error.status !== 422) throw error;
    const encoded = new URLSearchParams({ name: label.name }).get("name");
    await github(`PATCH /repos/${owner}/${repo}/labels/${encoded}`, {
      token,
      body: {
        new_name: label.name,
        color: label.color,
        description: label.description
      }
    });
    console.log(`updated label ${label.name}`);
  }
}

async function github(route, { token, body } = {}) {
  const [method, path] = route.split(" ", 2);
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "cmvan-keynote-roadmap-sync"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`${method} ${path} failed: ${response.status} ${text}`);
    error.status = response.status;
    throw error;
  }

  return response.status === 204 ? null : response.json();
}
