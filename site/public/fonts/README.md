# Self-hosted fonts

These woff2s back the typography stack in `site/css/theme.css`. Served at
`/public/fonts/*.woff2` by Cloudflare Pages. CSP `font-src 'self'` (in
`site/_headers`) already permits them.

Files:

- `JetBrainsMono-Regular.woff2`, `JetBrainsMono-Italic.woff2`,
  `JetBrainsMono-Bold.woff2` — from
  https://github.com/JetBrains/JetBrainsMono (`fonts/webfonts/`).
- `Newsreader-Regular.woff2`, `Newsreader-Bold.woff2` — latin subset
  pulled from Google Fonts (https://fonts.google.com/specimen/Newsreader).
  Open Font License.

System fallbacks in `--font-mono` and `--font-display` keep the page legible
if any of these 404.
