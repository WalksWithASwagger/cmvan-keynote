# Punk Rock AI review checklist

Use this checklist for PRs against the Punk Rock AI static site.

## Truth and ownership

- Does the change preserve the canonical production site as `https://www.punkrockai.com`?
- Does it avoid claiming analytics/search improvements without GSC/GA evidence?
- If an opportunity belongs to KrisKrug.co, BC + AI, FutureProof, or Both Hands Full, does the PR link out or open a focused follow-up instead of stuffing everything here?

## SEO/AEO/GEO checks

For priority pages, especially `/` and `/widgets/cut-up`:

- title and meta description are specific;
- canonical URL is correct;
- `og:url`, `og:image`, and `twitter:image` are present and consistent;
- schema is valid JSON-LD and matches the page purpose;
- page copy answers the target query directly before getting clever;
- links to Kris/network pages are editorially useful, not keyword spam.

## Voice

Reject generic AI marketing voice. This site should sound like zine culture, creative practice, and Kris's “both hands full” doctrine: sharp, plain, practical, human, and a little feral.

## Safety gates

Do not approve PRs that perform or imply:

- public posting/newsletter sends/social DMs;
- DNS, hosting, or credential mutations;
- destructive deletes;
- production deploy/merge without current Kris approval.

## Verification

Preferred gates:

```bash
npm run seo:index-hygiene
npm run test:index-hygiene
npm run check
```

If the full gate fails only because of external audit/network state, include the exact failure and the passing narrow SEO gates in the PR body.
