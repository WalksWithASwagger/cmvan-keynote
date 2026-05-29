# Release Day Operations

Current as of 2026-05-25 (verified against live GitHub, Linear, and production API smoke).

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
FORM_STARTED_AT="$(node -e 'console.log(Date.now() - 5000)')"
curl -i https://punkrockai.com/api/submissions \
  -H 'content-type: application/json' \
  -d "{\"name\":\"Smoke Test\",\"url\":\"https://example.com/release-day-smoke\",\"what\":\"Smoke-test artifact\",\"why\":\"Verifies the moderation queue.\",\"company\":\"\",\"formStartedAt\":$FORM_STARTED_AT}"
```

Expected result:

- HTTP 200 with `status: pending` and a Notion page id.
- Requests with a filled `company` honeypot or impossible `formStartedAt` age
  return a no-write pending response.
- The Notion row has `Published: false`.
- Invalid `name`, `url`, or `what` values return HTTP 400.
- HTTP 502 with `submission backend unavailable` means the Notion backend is
  configured but inaccessible; verify the database is shared with the
  integration before closing #135.

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

- #135 / BC-51 still needs a real smoke test in preview or production with
  configured Vercel env vars. Production smoke on 2026-05-25 proved `GET`
  returns HTTP 200 and invalid POST returns HTTP 400, but valid POST failed
  because Notion could not find or access database
  `8b726851-21ce-499f-bd0b-4cceee9a0d52`. Share the database with the
  configured integration, then rerun the valid POST smoke and record the
  Notion page id. GitHub #135 is open; Linear BC-51 is In Review.
- #134 / BC-53 still needs approved-row gallery proof on `/release-day`.
  GitHub #134 closed on 2026-05-13, but Linear BC-53 remains In Review
  until a real row can be created, approved/published, verified, and rolled
  back.
- #136 / BC-52 still needs named answers for Adobe involvement and recording
  rights. GitHub #136 closed on 2026-05-13, but Linear BC-52 remains Todo and
  human-gated.
