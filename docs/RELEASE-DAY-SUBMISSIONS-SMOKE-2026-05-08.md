# Release Day Submissions Smoke - May 8, 2026

## Scope

Issue: [#135](https://github.com/WalksWithASwagger/cmvan-keynote/issues/135)

Goal: prove as much of the `/release-day` submission path as possible without
submitting a real external form, writing production data, or changing launch
copy materially.

## Environment

| Item | Result |
| --- | --- |
| Date | May 8, 2026 |
| Branch | `codex/issue-135-release-day-smoke` |
| Base | `origin/main` at `d0e682b` |
| Local site route | `site/release-day.html` |
| Browser controller | `site/js/widgets/release-day.js` |
| Production API path | `api/submissions.js` on Vercel |
| Moderation target | Notion database from `NOTION_DB_ID` |

## Local Smoke Result

Added `npm run smoke:release-day`, which invokes the Vercel API handler with
mocked request/response objects and never calls the network unless the test
installs its own local `fetch` stub.

Covered locally:

- CORS preflight returns `204` and allows `GET, POST, OPTIONS`.
- Missing backend env returns `GET 200 { submissions: [] }`.
- Missing backend env returns `POST 202 { status: "queued-no-backend" }`.
- Invalid empty `name` returns `400 { error: "name required" }`.
- Invalid empty `url` returns `400 { error: "url required" }`.
- Invalid non-http(s) `url` returns `400 { error: "valid http/https url required" }`.
- Invalid empty `what` returns `400 { error: "what required" }`.
- Mocked valid POST builds a Notion page payload with:
  - `Published: false`
  - `Status: pending`
  - submitted name, handle, URL, what, why
  - first `x-forwarded-for` IP value
- Mocked GET queries Notion with `Published` filtered to `true` and maps the
  response into the public gallery shape.

Commands run:

```sh
npm run smoke:release-day
npm run eval
```

Both commands passed locally.

## Route/Data Smoke Result

The static Release Day page and its data dependencies are present in the
checkout:

| Path | Status |
| --- | --- |
| `site/release-day.html` | Present |
| `site/js/widgets/release-day.js` | Present |
| `site/css/widgets/release-day.css` | Present |
| `site/data/submissions.json` | Present and valid JSON |
| `api/submissions.js` | Present and covered by local smoke |
| `vercel.json` | `outputDirectory: "site"`, `cleanUrls: true`, API path owned by Vercel |

## Live Smoke Status

Blocked from this agent run by the safety scope of issue #135: do not submit
real external forms and do not write production data.

The true acceptance test still requires a human/operator with Vercel and
Notion access to verify:

1. `NOTION_TOKEN` is set in the relevant Vercel environment.
2. `NOTION_DB_ID` is set in the relevant Vercel environment.
3. A preview or production browser submission creates exactly one Notion row.
4. The row has `Published: false` and `Status: pending`.
5. Invalid browser submissions show clear behavior for missing name, invalid
   URL, and missing what fields.

## Operator Checklist

Use a non-public test URL and delete/reject the row after verification if the
database is production-owned.

```sh
curl -i https://<preview-or-production-host>/api/submissions

curl -i -X POST https://<preview-or-production-host>/api/submissions \
  -H 'content-type: application/json' \
  -d '{"name":"Release Day smoke - May 8","handle":"@cmvan","url":"https://example.com/release-day-smoke","what":"a smoke test","why":"Verifying pending moderation path"}'
```

Expected valid POST with env configured:

```json
{ "id": "<notion-page-id>", "status": "pending" }
```

Expected backend access failure:

```json
{ "error": "submission backend unavailable" }
```

Expected invalid cases:

| Payload change | Expected response |
| --- | --- |
| `name` empty | `400 { "error": "name required" }` |
| `url` empty | `400 { "error": "url required" }` |
| `url` is `ftp://example.com` | `400 { "error": "valid http/https url required" }` |
| `what` empty | `400 { "error": "what required" }` |

## Notes

- The browser form posts to same-origin `/api/submissions`, so Vercel preview
  and production should not need cross-origin browser access for normal use.
- The handler currently returns `200` for a successful Notion-backed POST; the
  local smoke locks current behavior rather than changing API semantics.
- The handler returns a generic `502` for upstream Notion access failures so
  production does not expose database or integration details to visitors.
- The static gallery still reads `site/data/submissions.json`; the
  moderation-to-gallery publishing loop remains a follow-up tracked outside
  this issue.
