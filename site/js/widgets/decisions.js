// /decisions — render decisions.json. Two columns: open questions (filterable)
// + session log. Markdown is pre-rendered to safe HTML in build-decisions.mjs;
// this module only assigns innerHTML on those server-prepared strings.

const questionsEl = document.getElementById("dec-questions");
const sessionsEl = document.getElementById("dec-sessions-list");
const filterEl = document.getElementById("dec-filter");
const resolvedStat = document.getElementById("dec-resolved");
const openStat = document.getElementById("dec-open");
const sessionsStat = document.getElementById("dec-sessions");

let data = null;
let activeFilter = "all";

main();

async function main() {
  try {
    const res = await fetch("/data/decisions.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
    paintStats();
    paintQuestions();
    paintSessions();
    wireFilter();
  } catch (err) {
    console.warn("[decisions]", err);
    questionsEl.innerHTML = `<p class="kicker">Decisions data unavailable — run <code>npm run build:decisions</code>.</p>`;
  }
}

function paintStats() {
  resolvedStat.textContent = String(data.counts.resolved);
  openStat.textContent = String(data.counts.open);
  sessionsStat.textContent = String(data.counts.sessions);
}

function paintQuestions() {
  questionsEl.innerHTML = "";
  for (const q of data.openQuestions) {
    if (activeFilter !== "all" && q.status !== activeFilter) continue;
    questionsEl.appendChild(renderQuestion(q));
  }
  if (!questionsEl.children.length) {
    questionsEl.innerHTML = `<p class="kicker">No questions match this filter.</p>`;
  }
}

function paintSessions() {
  sessionsEl.innerHTML = "";
  for (const s of data.sessions) {
    sessionsEl.appendChild(renderSession(s));
  }
}

function renderQuestion(q) {
  const article = document.createElement("article");
  article.className = "dec-q";
  article.id = q.id;
  article.innerHTML = `
    <header class="dec-q__head">
      <span class="dec-q__num">Q${q.n}</span>
      <span class="dec-q__status" data-status="${escapeAttr(q.status)}">${escapeHTML(q.status)}</span>
      <h3 class="dec-q__title">${escapeHTML(q.question)}</h3>
    </header>
    ${q.statusNote ? `<p class="dec-q__note">↳ ${escapeHTML(q.statusNote)}</p>` : ""}
    <div class="dec-q__body dec-md">${q.bodyHtml || ""}</div>
  `;
  return article;
}

function renderSession(s) {
  const article = document.createElement("article");
  article.className = "dec-session";
  article.id = s.id;
  article.setAttribute("data-level", String(s.level));
  article.innerHTML = `
    <h3 class="dec-session__head">${escapeHTML(s.title)}</h3>
    <div class="dec-md">${s.bodyHtml || ""}</div>
  `;
  return article;
}

function wireFilter() {
  filterEl.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeFilter = btn.getAttribute("data-filter");
      filterEl.querySelectorAll("button").forEach((b) => {
        b.setAttribute("aria-pressed", String(b === btn));
      });
      paintQuestions();
    });
  });
}

function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(s) {
  return escapeHTML(s).replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
