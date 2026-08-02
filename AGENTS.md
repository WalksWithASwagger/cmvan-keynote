# Punk Rock AI agent operating contract

This repo powers the Punk Rock AI / CreativeMornings Vancouver static learning portal at https://www.punkrockai.com/.

## Site purpose

Punk Rock AI is Kris Krüg's creative AI keynote/portal: critique in one hand, capability in the other. It should feel zine-like, practical, weird, human, and useful — not generic SaaS copy.

## Key entities and search opportunities

Priority terms from the network SEO/AEO/GEO inventory:

- `punk ai`
- `Punk Rock AI`
- `cut up generator`
- `creative AI`
- `Kris Krüg`
- `CreativeMornings Vancouver`
- `Both Hands Full`

Important network links:

- Kris authority hub: https://kriskrug.co/
- BC + AI Ecosystem: https://bc-ai.ca/
- FutureProof Festival: https://www.futureproof.website/
- Both Hands Full: https://www.bothhandsfull.com/

## Safe edit boundaries

Allowed without extra approval when scoped to a PR:

- static HTML/CSS/JS improvements;
- metadata, canonical, sitemap, schema, and accessibility fixes;
- tests, docs, and validation scripts;
- GitHub issue comments/PRs with evidence.

Owner-gated unless Kris explicitly approves in the current task:

- production deploys;
- DNS/hosting/account changes;
- newsletter/social/DM posting;
- credential changes;
- deletes or destructive git operations;
- merging PRs.

## SEO/schema rules

- Canonical host is `https://www.punkrockai.com`.
- Sitemap URLs should be canonical, extensionless, and non-redirecting.
- Every sitemap page needs title, description, canonical, `og:url`, `og:image`, and matching `twitter:image`.
- Use schema only when it is true and specific: `WebSite`, `Person`, `CreativeWork`, `WebApplication`, `FAQPage`, and `BreadcrumbList` are appropriate here.
- Internal/network links should help readers move through Kris's actual creative AI ecosystem; no spammy keyword blocks.

## Verification commands

Run the narrow gate for metadata/schema work:

```bash
npm run seo:index-hygiene
npm run test:index-hygiene
```

Run the full repo gate before a PR when practical:

```bash
npm run check
```

If `npm audit` blocks on pre-existing dependency advisories, report it honestly and include the narrow SEO/test results.
