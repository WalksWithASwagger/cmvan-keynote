# Studio image/export feasibility — #190

**Decision: no-go for a cross-browser image-edition PNG release using the current renderer.**
This is an experiment, not a production uploader or a certified mobile limit.
The text-only work can proceed independently. Keep #196 gated until its other
prerequisites and the image-export failure below are resolved.

## Reproduce

The offline gate needs only the existing Node runtime:

```sh
node scripts/check-studio-image.mjs --check
npm run check
```

The browser experiment requires an already installed Playwright module with
Chromium and WebKit browsers, and a local copy of the same public
`html-to-image@1.11.13/dist/html-to-image.min.js` used by cut-up. No package,
lockfile, production route, or live controller is changed. Supply absolute paths:

```sh
node scripts/check-studio-image.mjs --playwright /path/to/playwright --renderer /path/to/html-to-image.min.js --output /tmp/studio-image-evidence
```

It starts an ephemeral loopback server and closes browsers/server in cleanup.
Outputs: `report.json`, browser/viewport PNGs, print-media screenshots, Chromium
A4 PDFs. Exit zero means the experiment completed and invariant checks passed;
it does **not** mean release approval. Read `recommendation` and `imagePresent`.
Missing browsers or an unexpected assertion fail the command, never count as a pass.

## Provenance and boundaries

All pixels are synthetic, generated at runtime by the committed harness: red/blue
2400×1600 canvas, JPEG encoding, that JPEG with an EXIF orientation-6 segment,
and PNG with half its area transparent. No photo, identity, remote asset, or
private source is embedded. The malformed PNG is literal `not an image` bytes.
The oversized case is **trusted synthetic header metadata**, 40000×40000,
rejected without allocating/decoding it. It is not a real oversized file decoder
or a malicious-file corpus. Encoder bytes differ between browsers.

The offline tests exercise admission boundaries and PNG chunk filtering;
browser tests exercise decoding, orientation, alpha, normalization, PNG export,
missing/throwing renderer fallback, horizontal overflow and print media.
The harness reproduces cut-up's `toPng` options (pixelRatio 2, cream background,
cacheBust true) and workshop's browser-print strategy. It does not test those
controllers end to end or invoke a native print dialog.

## Measurements — 2026-09-06, desktop macOS

Chromium **151.0.7922.34**, WebKit **26.5**; viewports 1280 and 390 pixels.
390px is desktop emulation, **not real iPhone/iPad testing**.

| Probe | Chromium | WebKit |
| --- | --- | --- |
| JPEG source bytes | 23,835 | 62,165 |
| EXIF-6 JPEG bytes | 23,871 | 62,201 |
| Transparent PNG bytes | 79,781 | 72,622 |
| Normal/alpha dimensions | 2400×1600 → 1600×1067 | same |
| Rotated dimensions | 1600×2400 → 1067×1600 | same |
| Normalized PNG byte range | 37,236–39,859 | 33,139–33,814 |
| Decode + normalize | approximately 14–16ms | approximately 21–25ms |
| Long-text PNG, 1280 viewport | 1280×3398, 68ms, image present | 1280×3398, 143ms, **image absent** |
| Long-text PNG, 390 viewport | 700×3896, 44ms, image present | 700×3896, 91ms, **image absent** |
| Malformed / oversized metadata | rejected / no decode | rejected / no decode |
| Missing + throwing renderer | complete text fallback preserved | complete text fallback preserved |

Timings are single-run observations, not benchmarks or budgets. The prose is
18 repeats of an 88-character synthetic sentence. PNG visual inspection found
legible text in both engines but a blank image area in WebKit. A pixel sample
inside the expected red image proves the difference: Chromium `[238,34,35,255]`,
WebKit background `[244,237,224,255]`. A resolved render promise and output
size are insufficient success checks. Chromium A4 PDF was rendered and visually
inspected: image and full long text fit legibly on one page. Print-media screenshots
in both engines retain the image. **Native print preview/dialog, actual printer,
WebKit PDF, real mobile memory pressure, HEIC/GIF/WebP and color fidelity: unavailable/unrun.**

## Findings and proposed limits

1. An image left as a blob URL made the existing renderer options reject with
   an Event in Chromium. Embedding normalized PNG bytes as a data URL resolved
   that failure. WebKit still silently omitted the embedded image. Do not ship
   image PNG on that engine merely because a download exists.
2. Canvas re-encoding alone is insufficient evidence of metadata stripping.
   Chromium emitted no EXIF/text chunks; WebKit emitted an 80-byte EXIF chunk.
   The experiment explicitly removes `eXIf`, `tEXt`, `iTXt`, and `zTXt` while
   preserving color/alpha chunks; tests verify removal and decoded appearance.
   This helper handles browser-created PNGs only, not arbitrary hostile input.
3. Proposed **experimental** admission: PNG/JPEG only, ≤8 MiB, ≤12 megapixels,
   ≤6000px per edge; normalize once to ≤1600px longest edge without upscaling.
   These are policy candidates, not measured safe mobile maxima. Only 3.84MP
   input was decoded here. At 12MP one RGBA buffer alone is 48MB; decoded source,
   canvas, encoded bytes, data URL and export surfaces can coexist. A 1280×3398
   output alone requires about 17.4MB RGBA; this excludes renderer overhead.
4. Before production, read and validate actual JPEG/PNG dimensions with bounded
   header parsing **before native decode**, enforce byte/pixel limits and export
   pixel-area limits, then test on constrained devices. Current helper receives
   dimensions; it does not safely discover them from user files. Proposed export
   ceiling: 5MP at pixelRatio 2, then offer print/selectable text for longer work.
   This ceiling covers measured desktop output, not a mobile safety guarantee.
5. Rejection copy is in the experiment policy: “Use a PNG or JPEG image.”,
   “Choose an image smaller than 8 MiB.”, “Resize this image to at most
   12 megapixels and 6000 pixels per side.” Malformed input asks for another
   PNG/JPEG. Export failure keeps the complete selectable text available.

## Acceptance and next decision

All five fixture classes, both desktop engines, concrete candidate limits,
normalization/metadata behavior and failure/text escape hatch were exercised.
The requested legibility check **found a failing WebKit PNG image**, rather than
establishing universal success. Print evidence is headless simulation plus a
visually inspected Chromium PDF. The real-device check is unavailable.

Next bounded work: resolve and pixel-test the WebKit image rasterization failure
or design an explicit print-first image edition, then validate real mobile
resource limits before promoting #196. Do not add a renderer dependency or
promise broad image support based on this experiment alone. Rollback is removal
of experiment/eval wiring only; it stores no user data and requires no migration.
