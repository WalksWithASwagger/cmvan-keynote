import { readFile, stat } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, "../..");
export const ROADMAP_FILE = resolve(ROOT, "ops/roadmap/features.json");

const ALLOWED_TYPES = new Set(["feature", "ops"]);
const ALLOWED_STATUS = new Set(["planned", "in_progress", "blocked", "done"]);
const ALLOWED_PRIORITY = new Set(["p1", "p2", "p3"]);

export async function loadRoadmap() {
  const raw = await readFile(ROADMAP_FILE, "utf8");
  return JSON.parse(raw);
}

export async function validateRoadmap(roadmap) {
  const errors = [];

  if (!Number.isInteger(roadmap?.version)) {
    errors.push("top-level `version` must be an integer");
  }

  if (!roadmap?.project?.githubRepository) {
    errors.push("top-level `project.githubRepository` is required");
  }

  if (!Array.isArray(roadmap?.labelCatalog) || roadmap.labelCatalog.length === 0) {
    errors.push("top-level `labelCatalog` must be a non-empty array");
  }

  if (!Array.isArray(roadmap?.items) || roadmap.items.length === 0) {
    errors.push("top-level `items` must be a non-empty array");
  }

  const labelNames = new Set();
  for (const label of roadmap?.labelCatalog ?? []) {
    if (!label?.name) {
      errors.push("every label in `labelCatalog` must have a name");
      continue;
    }
    if (labelNames.has(label.name)) {
      errors.push(`duplicate label in catalog: ${label.name}`);
    }
    labelNames.add(label.name);
    if (!/^[0-9a-fA-F]{6}$/.test(label.color ?? "")) {
      errors.push(`label ${label.name} must have a 6-char hex color`);
    }
  }

  const seenIds = new Set();
  const seenIssues = new Set();

  for (const item of roadmap?.items ?? []) {
    const prefix = item?.id ? `item ${item.id}` : "item <missing-id>";

    if (!item?.id) errors.push("every item must have an `id`");
    if (!item?.title) errors.push(`${prefix} missing title`);
    if (!item?.phase) errors.push(`${prefix} missing phase`);
    if (!item?.summary) errors.push(`${prefix} missing summary`);

    if (seenIds.has(item?.id)) {
      errors.push(`duplicate roadmap item id: ${item.id}`);
    }
    seenIds.add(item?.id);

    if (!ALLOWED_TYPES.has(item?.type)) {
      errors.push(`${prefix} has invalid type: ${item?.type}`);
    }

    if (!ALLOWED_STATUS.has(item?.status)) {
      errors.push(`${prefix} has invalid status: ${item?.status}`);
    }

    if (!ALLOWED_PRIORITY.has(item?.priority)) {
      errors.push(`${prefix} has invalid priority: ${item?.priority}`);
    }

    if (!Number.isInteger(item?.github?.issue) || item.github.issue <= 0) {
      errors.push(`${prefix} must include a positive integer github.issue`);
    } else if (seenIssues.has(item.github.issue)) {
      errors.push(`duplicate github issue number in roadmap: #${item.github.issue}`);
    } else {
      seenIssues.add(item.github.issue);
    }

    if (!Array.isArray(item?.github?.labels) || item.github.labels.length === 0) {
      errors.push(`${prefix} must include one or more github labels`);
    } else {
      for (const label of item.github.labels) {
        if (!labelNames.has(label)) {
          errors.push(`${prefix} references unknown label: ${label}`);
        }
      }
    }

    if (item?.linear?.issue && !/^https:\/\/linear\.app\//.test(item?.linear?.url ?? "")) {
      errors.push(`${prefix} has a linear.issue but is missing a valid linear.url`);
    }

    requireStringArray(errors, item?.acceptanceCriteria, `${prefix} acceptanceCriteria`);
    requireStringArray(errors, item?.evals, `${prefix} evals`);
    requireStringArray(errors, item?.tests, `${prefix} tests`);
    requireStringArray(errors, item?.paths, `${prefix} paths`);
    requireStringArray(errors, item?.definitionOfDone, `${prefix} definitionOfDone`);

    for (const relPath of item?.paths ?? []) {
      const absPath = resolve(ROOT, relPath);
      try {
        await stat(absPath);
      } catch {
        errors.push(`${prefix} references missing path: ${relPath}`);
      }
    }
  }

  return errors;
}

export function renderIssueBody(item, roadmap) {
  const lines = [
    `<!-- roadmap-id: ${item.id} -->`,
    "## Roadmap Sync",
    `- Roadmap ID: \`${item.id}\``,
    `- Phase: \`${item.phase}\``,
    `- Type: \`${item.type}\``,
    `- Priority: \`${item.priority}\``,
    `- Status: \`${pretty(item.status)}\``,
    `- Linear project: \`${item.linear?.project ?? roadmap.project?.linearProject ?? "TBD"}\``,
    item.linear?.issue ? `- Linear issue: [${item.linear.issue}](${item.linear.url})` : null,
    `- Linear state: \`${item.linear?.state ?? "Backlog"}\``,
    item.linear?.blocked ? "- Linear blocked marker: `status:blocked` label" : null,
    "",
    "## Summary",
    item.summary,
    "",
    "## Acceptance Criteria",
    ...item.acceptanceCriteria.map((entry) => `- ${entry}`),
    "",
    "## Eval Commands",
    ...item.evals.map((entry) => `- \`${entry}\``),
    "",
    "## Tests",
    ...item.tests.map((entry) => `- ${entry}`),
    "",
    "## Relevant Paths",
    ...item.paths.map((entry) => `- \`${entry}\``)
  ].filter((line) => line !== null);

  if (item.blockedBy?.length) {
    lines.push("", "## Blockers", ...item.blockedBy.map((entry) => `- ${entry}`));
  }

  lines.push("", "## Definition Of Done", ...item.definitionOfDone.map((entry) => `- ${entry}`));
  return lines.join("\n") + "\n";
}

export function roadmapSummary(roadmap) {
  const counts = new Map();
  for (const item of roadmap.items ?? []) {
    counts.set(item.status, (counts.get(item.status) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([status, count]) => `${pretty(status)}: ${count}`)
    .join(", ");
}

export function relFromRoot(path) {
  return relative(ROOT, path);
}

function requireStringArray(errors, value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${label} must be a non-empty array`);
    return;
  }
  for (const entry of value) {
    if (typeof entry !== "string" || entry.trim() === "") {
      errors.push(`${label} must contain only non-empty strings`);
      return;
    }
  }
}

function pretty(value) {
  return String(value ?? "").replaceAll("_", " ");
}
