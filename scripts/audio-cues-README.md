# Audio cues — end-to-end flow

Per-slide narration mp3s are produced from `dress-rehearsal/elevenlabs-full-script.md`
in two steps: a script-only pass that fills in slide cue metadata, and an
ElevenLabs pass that generates the actual audio.

## Prerequisites

1. **ElevenLabs API key.** Sign in at <https://elevenlabs.io>, then:
   Settings → API Keys → "Create API Key". Free tier covers the full talk.
2. **Voice ID.** Pick a voice in the
   [Voice Library](https://elevenlabs.io/app/voice-library) (or use one of your
   own clones). Open the voice and copy the ID from the URL or the "View ID"
   button — it looks like `h5o5VIOBAddU9BdX8t8E`.
3. Copy `.env.example` to `.env` and fill in:
   ```env
   ELEVENLABS_API_KEY=sk_...
   ELEVENLABS_VOICE_ID=...
   # Optional — defaults shown
   # ELEVENLABS_MODEL=eleven_multilingual_v2
   # ELEVENLABS_OUTPUT_FORMAT=mp3_44100_128
   # AUDIO_PUBLIC_BASE=/audio/cues
   ```

## One-shot build

```bash
# 1. Build cue metadata (slide ↔ section map, word counts, estimated lengths).
npm run build:audio

# 2. Plan the TTS run without spending credits.
npm run generate:cues -- --dry-run

# 3. Generate every clip and rewrite site/data/audio-cues.json with mp3Urls,
#    durationMs, generatedAt.
set -a; . .env; set +a
npm run generate:cues
```

After step 3, `site/public/audio/cues/slide-NN.mp3` exists for every slide and
`site/data/audio-cues.json` has populated `mp3Url`, `durationMs`, `generatedAt`,
and `bytes` per cue.

## Useful flags

- `--dry-run` — print the plan; no API calls, no files written. Works without
  credentials, so it's safe in CI.
- `--only slide-05,slide-13` — regenerate just those slides.
- `--force` — overwrite existing mp3s (default: skip files that already exist).

## How it works

`scripts/generate-cues.mjs`:

1. Reads `site/data/audio-cues.json` (built by `scripts/build-audio-cues.mjs`).
2. Reads `dress-rehearsal/elevenlabs-full-script.md`, splits on `## ` headings.
3. Matches each cue's `section` field to the matching heading in the script,
   strips markdown emphasis, then POSTs the cleaned text to
   `https://api.elevenlabs.io/v1/text-to-speech/{voiceId}`.
4. Writes the response body to `site/public/audio/cues/<slide-id>.mp3`.
5. Estimates `durationMs` from byte size and the constant bitrate of the
   chosen `output_format` (mp3_44100_128 = 128 kbps).
6. Rewrites `site/data/audio-cues.json` with `mp3Url`, `durationMs`,
   `generatedAt`, and `bytes` populated.

## Hosting

By default `mp3Url` is written as `/audio/cues/<slide-id>.mp3`, served by the
same origin as the static site (`site/public/`). When you move the files to
R2 / a CDN, set `AUDIO_PUBLIC_BASE=https://your-cdn/cues` and rerun
`npm run generate:cues -- --only slide-01` (or `--force` for all) to rewrite
the URLs without re-hitting the API.

## Failure modes

- Missing `ELEVENLABS_API_KEY` or `ELEVENLABS_VOICE_ID` exits non-zero with a
  clear message. `--dry-run` short-circuits before that check.
- Non-200 from ElevenLabs prints status, statusText, and the first 400 chars
  of the response body, then exits.
- A section in the cue file with no matching `##` heading is skipped with a
  warning (run `npm run build:audio` first to keep these in sync).

## See also

- `dress-rehearsal/generate-audio.py` — original Python script for one-shot
  full-talk audio. Kept for posterity; per-slide cues are the supported path.
- `scripts/build-audio-cues.mjs` — builds the cue metadata that
  `generate-cues.mjs` consumes.
