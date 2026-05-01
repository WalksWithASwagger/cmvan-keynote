# Self-hosted fonts

Drop the woff2 files here to activate the self-hosted stack. The system fallbacks
in `css/theme.css` already render cleanly without these — this directory is the
hook, not a hard dependency.

Expected files (deferred until ready):

- `JetBrainsMono-Variable.woff2` — variable axis 100–800. From
  https://github.com/JetBrains/JetBrainsMono/releases (latest, `webfonts/` dir).
- `GTMaru-Bold.woff2` — brutalist serif counterpart for display type. License
  pending; substitute any single brutalist serif woff2 you have rights to and
  update the `--font-display` token in `theme.css` to match.

Once the files land, uncomment the `@font-face` blocks at the top of
`site/css/theme.css`.
