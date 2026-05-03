# scripts/

Build and ingest tooling for the punkrockai.com static site.

| Script | What it does |
| --- | --- |
| `build-quotes.mjs` | Seeds `site/data/slides.json` from talk source-of-truth. Run before `ingest-slides`. |
| `build-lineage.mjs` | Generates lineage graph data. |
| `build-library-index.mjs` | Indexes the reading-list / library page. |
| `build-audio-cues.mjs` | Compiles per-slide audio cue manifest. |
| `build-decisions.mjs` | Generates the decisions log page data. |
| `ingest-slides.mjs` | Resizes slide imagery, uploads originals to Cloudflare R2, merges URLs into `slides.json`. |

The rest of this file documents `ingest-slides.mjs`, which is the only script that talks to a remote service.

---

## ingest-slides.mjs

### What it does

1. Reads images from `$SLIDES_SRC` (a local folder, gitignored, lives outside the repo).
2. Extracts the slide number from the filename (`01_*.ext`, `slide-12-*.ext`, etc.).
3. Writes a ~1200px WebP fallback into `site/public/images/slides/` (these are committed).
4. Uploads the original to a Cloudflare R2 bucket via the S3-compatible API.
5. Merges `loRes` / `hiRes` / `alt` / `prompt` fields into `site/data/slides.json` on top of the title/act fields produced by `build-quotes.mjs`.

Re-running is idempotent. Fields the script owns (`loRes`, `hiRes`, `alt`, `prompt`) get overwritten with current values; fields it doesn't own (`title`, `act`, `note`, …) are preserved.

### Prerequisites

- Node 20+ and `npm install` from the repo root.
- A populated `site/data/slides.json` (run `npm run build:quotes` first).
- A local folder of source images named with a slide number (e.g. `01_neon-storefront.png`, `slide-12-bloodbath.jpg`).
- For a real run: a Cloudflare R2 bucket and an API token with object-write permission on it.

### Required environment variables

Copy `.env.example` to `.env` and fill in:

| Var | Description |
| --- | --- |
| `SLIDES_SRC` | Absolute path to the local slide images folder. |
| `R2_ACCOUNT_ID` | Cloudflare account ID (Dashboard → R2 → Overview, top-right). |
| `R2_ACCESS_KEY_ID` | R2 API token access key. |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret. |
| `R2_BUCKET` | Bucket name, e.g. `punkrockai-slides`. |
| `R2_PUBLIC_BASE` | Public URL prefix for the bucket (auto `pub-*.r2.dev` or a custom domain). |

Optional:

| Var | Default | Description |
| --- | --- | --- |
| `R2_MAX_RETRIES` | `3` | Upload retry attempts on transient failure. |
| `SKIP_UPLOAD` | unset | Skip R2 upload, still write WebPs. Same as `--skip-upload`. |
| `DRY_RUN` | unset | Print plan, no writes, no uploads. Same as `--dry-run`. |

### How to obtain R2 credentials

1. Sign in to the Cloudflare dashboard, select the account.
2. **R2 → Create bucket**. Pick a name (e.g. `punkrockai-slides`). Region: Automatic.
3. On the bucket's **Settings** tab, enable **Public Access** (or bind a custom domain). Copy the public URL — that's `R2_PUBLIC_BASE`.
4. **R2 → Manage R2 API Tokens → Create API Token**.
   - Permission: **Object Read & Write**.
   - Bucket: scope to the bucket you just made.
   - TTL: as long as you need.
5. Copy **Access Key ID** → `R2_ACCESS_KEY_ID`.
6. Copy **Secret Access Key** → `R2_SECRET_ACCESS_KEY`.
7. Account ID is on the **R2 → Overview** page, top right → `R2_ACCOUNT_ID`.

### wrangler.toml

The repo root `wrangler.toml` is for Cloudflare Pages and does not need to know about R2. If you want to bind the bucket to a Worker (we currently don't), the stanza looks like:

```toml
# Example only — not used by this repo today.
[[r2_buckets]]
binding = "SLIDES"
bucket_name = "punkrockai-slides"
preview_bucket_name = "punkrockai-slides-preview"
```

R2 credentials for `ingest-slides.mjs` are read from `process.env`, **not** from `wrangler.toml`. The script runs locally on your machine, not inside a Worker.

### How to run

```bash
# 1. Preview what would happen (no creds needed beyond SLIDES_SRC):
node scripts/ingest-slides.mjs --dry-run

# 2. Build local WebPs only, skip the R2 upload:
node scripts/ingest-slides.mjs --skip-upload

# 3. Real run (requires all five R2 vars):
node scripts/ingest-slides.mjs
# or via npm:
npm run ingest:slides
```

If `.env` exists, source it first (`set -a; source .env; set +a`) or use a wrapper like `dotenv-cli`.

### How to verify

After a real run:

- `site/public/images/slides/` contains a `<slide-id>.webp` for each ingested slide.
- `site/data/slides.json` has `loRes` and `hiRes` URLs filled in for each entry.
- `curl -I "$R2_PUBLIC_BASE/slides/<slide-id>.png"` returns `200`.
- Open `/talk` locally (`npm run dev`) — the slide reel renders real imagery instead of placeholders.
- Commit the updated `slides.json` and the new WebPs.

### Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| `SLIDES_SRC is required` | Set `SLIDES_SRC` to an absolute path, or pass `--dry-run` to preview. |
| `missing R2 env: ...` | Set the listed variables, or use `--skip-upload` / `--dry-run`. |
| `missing dep: install with npm i ...` | Run `npm install` at the repo root. |
| `no slide images found under <path>` | Filenames must contain a 1- or 2-digit slide number, e.g. `01_*.png`. |
| `slide N not in slides.json — skipped` | Add the slide to the source-of-truth and re-run `npm run build:quotes`. |
| `upload <key> failed (attempt N/3)` | Transient — script retries with exponential backoff. If all attempts fail, check token scope and bucket name. |
| `403 Forbidden` from R2 | API token isn't scoped to the bucket, or lacks Object Write. |
| Public URL returns `404` | Public Access not enabled on the bucket, or `R2_PUBLIC_BASE` points at the wrong host. |
| Public URL returns `200` but browser blocks it | Configure bucket CORS for the deployed site origin. |
