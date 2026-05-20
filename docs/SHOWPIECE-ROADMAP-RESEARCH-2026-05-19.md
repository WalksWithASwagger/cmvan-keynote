# Showpiece roadmap research - May 19, 2026

Scope: end-to-end local smoke, curriculum coverage, interaction/design gap scan,
and outside inspiration pass for keeping `punkrockai.com` a world-class
post-talk showpiece.

## Verification run

- `npm run eval` passed: JavaScript syntax, JSON manifests, roadmap pipeline,
  site references, header navigation, clean URL aliases, widget contracts, data
  references, Vercel static config, and local Release Day submissions smoke.
- Local static server: `npm run dev` at `http://localhost:3000`.
- Browser smoke covered 21 representative routes and flows:
  `/`, `/talk`, `/recap`, `/release-day`, `/workshop`, `/library`, `/lineage`,
  `/posse`, `/decisions`, `/signal`, and representative Make/Name/Connect/Ship
  widgets.
- Interaction smoke covered Three Documents text entry, Pattern Finder fallback,
  Release Day local queue/fallback, and mobile homepage overflow.

## Bugs fixed during this pass

- Mobile homepage horizontal overflow came from the animated photo marquee track
  contributing its full offscreen width to the document. Fixed with page-level
  horizontal clipping plus marquee containment in `theme.css` and
  `zine-overhaul.css`.

## Expected local-console noise

The static `serve site` dev server does not mount Vercel functions, so browser
smoke sees expected 404s for:

- `/api/submissions` on `/release-day`
- `/api/pattern-finder` on Pattern Finder

Both flows render fallback states, but the console noise makes demos feel less
polished. A local Vercel dev smoke or quieter expected-404 handling would make
future end-to-end testing cleaner.

## Current strength

The portal already has unusually strong raw material:

- A vivid thesis: critique plus capability, not boosterism.
- A complete visual language: photos, zine textures, slide crops, punk tokens,
  print rules, and bespoke page treatments.
- A broad widget rack: Make, Name, Connect, Ship, including printable workshop
  material and local-first builders.
- Durable content infrastructure: markdown source, JSON manifests, route
  contracts, and a single local eval gate.

## Coverage gaps

### 1. Curriculum spine is implied, not fully taught

The widgets are rich, but the learning path is still mostly a gallery of tools.
Add a visible curriculum spine that answers: "What should I do first, second,
third, and why?"

Recommended lane:

- Create a "Punk Rock AI Field Course" path across five modules:
  1. Name the contradiction.
  2. Externalize taste.
  3. Diagnose harms precisely.
  4. Build with both hands.
  5. Ship and gather a posse.
- Each module should link one talk beat, one widget, one worksheet, and one
  public artifact.
- Add progress state locally, not accounts.

### 2. Widgets need stronger completion states

Many widgets let a user make something, but fewer have a memorable final state
that feels shareable, collectible, or like a finished scene.

Recommended lane:

- Add "receipt moments" to the highest-value tools:
  Three Documents, Taste Audit, Name What You See, Both Hands, Action Chooser,
  and Release Day.
- Each output should have print, copy, and image export where appropriate.
- Use one consistent saved-work drawer so users can return to artifacts across
  the site.

### 3. Motion is abundant, but not yet narrative choreography

Current motion adds vibe. The next level is motion that teaches: scroll progress,
lineage reveal, tool state changes, and before/after transformations.

Recommended lane:

- Add one signature scroll narrative, not ten new effects: a "Dada -> Punk ->
  DJs -> Hip Hop -> AI" interactive lineage that morphs the same gesture across
  eras.
- Keep animation CSS-first or light JS. Do not introduce a heavy framework just
  for spectacle.
- Preserve reduced-motion behavior and test it.

### 4. Media proof is still incomplete

The showpiece wants to feel like the definitive artifact from the room. The
photo galleries are strong, but audio/video remains partly placeholder-driven.

Recommended lane:

- Finish the talk audio path or remove the promise from the primary talk page.
- Replace recap placeholder media with a real generation/process clip.
- Add one tight "making of" strip: source markdown -> slide prompts -> final
  room photos -> public widgets.

### 5. Live backend boundaries need demo polish

Fallback-only is honest and good, but local demos currently surface 404s in the
console for expected backend absence.

Recommended lane:

- Add a demo-safe local API mode, likely through `vercel dev` instructions or a
  small static mock strategy for smoke tests.
- Keep Pattern Finder fallback-only unless model budget, privacy copy, abuse
  controls, and rate limits are accepted.

### 6. Public share metadata is uneven

Several primary pages have OG metadata, but widget pages are likely below the
quality bar for a showpiece that people will link directly.

Recommended lane:

- Give the top 8 shareable widgets explicit `og:title`, `og:description`, and
  `og:image`.
- Add a social preview checklist to `npm run eval` or a companion script.

### 7. Accessibility and performance are the showpiece risk

The design language is intentionally loud. The risk is not that it becomes too
punk; the risk is that image payloads and motion hide the craft underneath.

Recommended lane:

- Re-run Lighthouse after the overflow fix.
- Prioritize responsive hero/background images, lazy decorative assets, and
  `requestIdleCallback`/delayed analytics.
- Keep keyboard paths and reduced-motion proof in the gate.

## World-class benchmark notes

Outside inspiration confirms the right direction:

- Awwwards' animation/microinteraction collection emphasizes Canvas, SVG, CSS,
  WebGL, forms, transitions, scroll, navigation, and content interactions. The
  useful lesson is not "add WebGL"; it is "make every interaction carry the
  content."
- Awwwards' storytelling collection frames strong storytelling as the merger of
  visual design and UI design that encourages interaction and engagement. That
  matches this project's best current mode: the widgets are the story.
- Contemporary parallax guidance still treats scroll depth as useful when it
  supports story, but warns implicitly through examples that it can become bulk
  and novelty. For this site, one signature scroll set piece is better than
  broad parallax everywhere.
- Award programs such as w3 now explicitly recognize immersive/AI/software
  craft. That suggests the strongest submission angle would be "interactive
  cultural artifact from a live talk," not a generic conference microsite.

Sources:

- https://www.awwwards.com/awwwards/collections/animation/
- https://www.awwwards.com/awwwards/collections/storytelling/
- https://www.creativebloq.com/web-design/parallax-scrolling-1131762
- https://www.w3award.com/

## Recommended next roadmap

### P0 - Make demos clean

- Run a true Vercel-local E2E path or document the expected static-server 404s
  as non-failures.
- Re-run browser smoke after CSS overflow fix.
- Add a small route for "Start the field course" from the homepage.

### P1 - Add the course spine

- Build `/course` or `/field-course` as the primary guided path.
- Organize current widgets into modules rather than adding new isolated tools.
- Add local progress and artifact save/revisit.

### P1 - Create one signature interactive scene

- Build an interactive lineage/remix map that turns the talk's intellectual
  history into a kinetic learning object.
- Use the existing `moves.json`, `lineage.json`, and slide art before inventing
  new data.

### P2 - Polish shareability

- Add OG metadata/images to the top widget pages.
- Add social preview validation.
- Add final artifact export paths to the top six widgets.

### P2 - Finish media proof

- Decide whether talk audio/video is coming soon or intentionally omitted.
- Replace the recap process placeholder.
- Add a compact behind-the-scenes build/process section.

## One thing to ship next

Ship the guided curriculum spine first. The site already has enough raw
interaction. What will make it feel world-class is a clear path through the
world: enter confused, make choices, produce artifacts, understand the thesis,
and leave with something worth sharing.

## Follow-up implementation

This recommendation now has a first shipped slice:

- `/field-course` is a five-module guided path through the existing portal.
- Homepage and primary nav link into the course.
- Progress is local-first through `localStorage`; no account or backend needed.
- Browser smoke verified the route, five modules, fifteen action links,
  persisted progress, and no mobile overflow.
