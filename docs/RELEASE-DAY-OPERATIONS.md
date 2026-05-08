# Release Day Operations

Current as of 2026-05-08.

## Submission Path

Production uses the Vercel function at `/api/submissions`.

Required Vercel environment variables:

- `NOTION_TOKEN`
- `NOTION_DB_ID`

Expected browser-to-Notion flow:

1. A visitor submits the `/release-day` form.
2. `api/submissions.js` validates `name`, `url`, and `what`.
3. A valid submission creates a Notion page with `Published: false` and
   `Status: pending`.
4. The operator reviews the Notion row.
5. When the work is ready to show, set `Status: approved` and `Published: true`.
6. `/release-day` reads published rows from `GET /api/submissions`.

If the Vercel env vars are missing, `POST /api/submissions` returns
`202` with `status: queued-no-backend`; the browser adds the submission to
the local pending queue and leaves the draft available for retry.
If the live gallery API returns no rows, the page falls back to
`site/data/submissions.json`.

## Smoke Test

Run this against a Vercel preview or production URL after confirming the env
vars are configured:

```sh
curl -i https://punkrockai.com/api/submissions \
  -H 'content-type: application/json' \
  -d '{"name":"Smoke Test","url":"https://example.com/release-day-smoke","what":"Smoke-test artifact","why":"Verifies the moderation queue."}'
```

Expected result:

- HTTP 200 with `status: pending` and a Notion page id.
- The Notion row has `Published: false`.
- Invalid `name`, `url`, or `what` values return HTTP 400.

Record the exact smoke-test date, environment, and Notion row result in issue
#135 before closing it.

## Gallery Publishing

The chosen publishing path is live Notion read through the existing Vercel API,
with static JSON as a fallback.

Operator checklist:

1. Review new rows in the Release Day Notion database.
2. Fix obvious title/link formatting if needed.
3. Confirm the linked work is public and appropriate for the gallery.
4. Set `Status: approved`.
5. Set `Published: true`.
6. Refresh `/release-day` and confirm the card appears.

Rollback / unpublish:

1. Set `Published: false` on the Notion row.
2. Optionally set `Status: hidden`, `rejected`, or another operator-visible
   non-public state.
3. Refresh `/release-day` and confirm the card disappears from the gallery.

Static fallback:

- Use `site/data/submissions.json` only when the API is unavailable or when a
  static export is intentionally preferred for a campaign day.
- Keep `generated` and `moderation` fields current when editing the file.

## Known Blockers

- #135 still needs a real smoke test in preview or production with configured
  Vercel env vars.
- #136 still needs named answers for Adobe involvement and recording rights.
