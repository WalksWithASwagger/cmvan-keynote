# Notion integration setup — `worker/submissions`

End-to-end steps to wire the Release Day submissions Worker to a Notion
database. The Worker degrades gracefully without these set (POST returns
`202 { status: "queued-no-backend" }` and logs a warning), so you can
deploy first and connect Notion later.

## 1. Create the Notion integration

1. Visit <https://www.notion.so/my-integrations>.
2. Click **New integration**.
3. Name it something obvious (e.g. `cmvan-release-day`).
4. Associated workspace: pick the workspace that owns the target DB.
5. Capabilities: read content, update content, insert content. No user
   info needed.
6. Submit. Copy the **Internal Integration Secret** (starts with
   `secret_` or `ntn_`). This is the value of `NOTION_TOKEN`.

## 2. Create / pick the database

Create a full-page Notion database (not inline) with the schema below.
Property names are case-sensitive — the Worker references them verbatim.

| Property   | Type       | Notes                                                |
|------------|------------|------------------------------------------------------|
| Name       | Title      | required                                             |
| Handle     | Rich text  | optional                                             |
| URL        | URL        | required (http/https)                                |
| What       | Rich text  | the thing — "a zine", "a short film", "the album"    |
| Why        | Rich text  | optional, ~600 chars                                 |
| Submitted  | Date       | auto-populated by the Worker                         |
| IP         | Rich text  | moderation only, never displayed                     |
| Published  | Checkbox   | default `false` — moderation gate                    |
| Status     | Select     | options: `pending`, `published`, `rejected`          |

Open the DB → top-right `•••` → **Connections** → **Add connections** →
pick the integration you just created → confirm. Without this the
Worker gets `unauthorized` from the Notion API.

## 3. Get the database ID

From the database share URL:

```
https://www.notion.so/<workspace>/<title>-<DATABASE_ID>?v=...
```

`DATABASE_ID` is the 32-char hex string just before the `?v=`. Strip
hyphens or keep them — the Notion API accepts either form. This is the
value of `NOTION_DB_ID`.

## 4. Wire the Worker

```sh
cd worker/submissions

# secret — the integration token
wrangler secret put NOTION_TOKEN
# paste the secret_... value when prompted

# DB id — either as a [vars] entry in wrangler.toml or as a secret
# (vars is fine, the id is not sensitive on its own without the token)
# Edit wrangler.toml and uncomment:
#   NOTION_DB_ID = "<paste id here>"

wrangler deploy
```

## 5. Verify

```sh
curl -X POST https://<worker-host>/submissions \
  -H 'content-type: application/json' \
  -d '{"name":"test","url":"https://example.com","what":"a smoke test"}'
```

- With both env vars set: response is `201 { id, status: "pending" }` and
  a row appears in the Notion DB with `Published: false`.
- With either unset: response is `202 { id: null, status:
  "queued-no-backend" }` and the Worker logs
  `submissions: NOTION_TOKEN or NOTION_DB_ID missing ...`.

To publish an entry, flip the `Published` checkbox to true in Notion.
The `GET /submissions` endpoint returns only `Published: true` rows.

## Rotation

```sh
wrangler secret put NOTION_TOKEN   # overwrites
```

Revoke the old token in <https://www.notion.so/my-integrations> after
the new one is in place.
