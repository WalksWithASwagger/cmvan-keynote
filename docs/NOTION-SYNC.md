# Notion sync — Punk Rock AI / CMVan

## Notion hub

**Workspace / entry:** [https://is.kriskrug.ai/punk-ceo?source=copy_link](https://is.kriskrug.ai/punk-ceo?source=copy_link)

Use Notion for **sharing**, **collaborator previews**, **running notes**, and **assets that do not belong in git** (raw mood boards, private sponsor threads). Use **this repo** ([cmvan-keynote](https://github.com/WalksWithASwagger/cmvan-keynote)) as the **source of truth** for:

- Talk script, slide outlines, quote bank  
- Image prompts and design bible pointers  
- Companion `index.html` / deploy instructions  
- Roadmap, bibliography, and publication checklist  

The **kk-bb** folder [`creative-mornings-vancouver-may-2026`](https://github.com/WalksWithASwagger/kk-kb) mirrors narrative content for the knowledge base; Notion does **not** replace kb for long-term archival unless you explicitly copy there.

---

## After each meaningful repo change

1. **Notion:** Add a dated log line (or toggle) linking to the **commit** or file on GitHub (e.g. `https://github.com/WalksWithASwagger/cmvan-keynote/commit/<sha>`).  
2. **Notion:** If you changed dates, titles, or CTAs, update the same blocks you use for social / Mark so nothing drifts.  
3. **Repo:** If Notion became the place a decision was finalized, **paste the essence** into [`OPEN-QUESTIONS.md`](../OPEN-QUESTIONS.md) or the roadmap so agents and future-you see it in git.

---

## Optional automation (later)

- Notion API or Zapier: new GitHub release → append row to a Notion database.  
- Cursor / Notion MCP: pull a Notion page into a scratch recap in kb — still **commit** outcomes to git.

---

## Link from Notion back to git

On the Notion home page for this project, pin:

- Repo: `https://github.com/WalksWithASwagger/cmvan-keynote`  
- Issue: `https://github.com/WalksWithASwagger/kk-kb/issues/1570`  
- Roadmap: `https://github.com/WalksWithASwagger/cmvan-keynote/blob/main/docs/PROJECT-ROADMAP.md`

That keeps the loop bidirectional when you share `is.kriskrug.ai` links.
