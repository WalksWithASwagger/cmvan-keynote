import test from "node:test";
import assert from "node:assert/strict";
import { loadRoadmap, renderIssueBody, validateRoadmap } from "../scripts/lib/roadmap.mjs";

test("roadmap registry is valid", async () => {
  const roadmap = await loadRoadmap();
  const errors = await validateRoadmap(roadmap);
  assert.deepEqual(errors, []);
});

test("rendered roadmap issue bodies include stable metadata and delivery sections", async (t) => {
  const roadmap = await loadRoadmap();

  for (const item of roadmap.items) {
    await t.test(item.id, () => {
      const body = renderIssueBody(item, roadmap);
      assert.match(body, new RegExp(`roadmap-id: ${item.id}`));
      assert.match(body, /## Acceptance Criteria/);
      assert.match(body, /## Eval Commands/);
      assert.match(body, /## Tests/);
      assert.match(body, /## Relevant Paths/);
      for (const command of item.evals) {
        assert.match(body, new RegExp(escapeRegExp(command)));
      }
    });
  }
});

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
