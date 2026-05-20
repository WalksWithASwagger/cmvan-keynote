import { load, save } from "/js/common/storage.js";

const KEY = "field-course:progress";
const checks = Array.from(document.querySelectorAll("[data-course-check]"));
const bar = document.querySelector("[data-course-progress-bar]");
const label = document.querySelector("[data-course-progress-label]");

const saved = load(KEY, {}).value || {};

for (const input of checks) {
  const id = input.dataset.courseCheck;
  input.checked = Boolean(saved[id]);
  input.closest("[data-module]")?.setAttribute("data-complete", String(input.checked));
  input.addEventListener("change", () => {
    saved[id] = input.checked;
    if (!input.checked) delete saved[id];
    save(KEY, saved);
    input.closest("[data-module]")?.setAttribute("data-complete", String(input.checked));
    renderProgress();
  });
}

renderProgress();

function renderProgress() {
  const done = checks.filter((input) => input.checked).length;
  const total = checks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  if (bar) bar.style.width = `${pct}%`;
  if (label) label.textContent = `${done} of ${total} complete`;
}
