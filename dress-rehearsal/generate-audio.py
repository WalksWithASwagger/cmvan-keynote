#!/usr/bin/env python3
"""
Generate ElevenLabs audio from the Punk Rock AI full talk script.
Strips stage directions, slide cues, and markdown before sending to API.
Output: dress-rehearsal/punk-rock-ai-full-talk.mp3
"""

import re
import sys
from pathlib import Path

try:
    from elevenlabs.client import ElevenLabs
except ImportError:
    print("ERROR: elevenlabs not installed. Run: pip3 install elevenlabs --break-system-packages")
    sys.exit(1)

API_KEY = "0510b476d05adc003eb1dcba0afff2a77bbfdb23a7290caa5c57cd98f5bbe710"
VOICE_ID = "h5o5VIOBAddU9BdX8t8E"
MODEL = "eleven_multilingual_v2"

SCRIPT = Path(__file__).parent / "elevenlabs-full-script.md"
OUTPUT = Path(__file__).parent / "punk-rock-ai-full-talk.mp3"


def clean_script(raw: str) -> str:
    # Strip the header block (everything up to and including the first ---)
    if "---\n" in raw:
        raw = raw[raw.index("---\n") + 4:]

    # Remove markdown headers and horizontal rules
    text = re.sub(r"^#{1,6}\s.*$", "", raw, flags=re.MULTILINE)
    text = re.sub(r"^---+$", "", text, flags=re.MULTILINE)

    # Remove italic front-matter note (*For audio generation...*)
    text = re.sub(r"^\*.*?\*$", "", text, flags=re.MULTILINE)

    # Remove bold/italic markers but keep the words
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"\*(.*?)\*", r"\1", text)

    # Normalize whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip()

    return text


MAX_CHARS = 9800  # ElevenLabs limit is 10000; leave buffer


def split_text(text: str, max_chars: int = MAX_CHARS) -> list[str]:
    """Split on paragraph boundaries, keeping each chunk under max_chars."""
    paragraphs = text.split("\n\n")
    chunks = []
    current = ""
    for para in paragraphs:
        candidate = (current + "\n\n" + para).strip() if current else para
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                chunks.append(current)
            current = para
    if current:
        chunks.append(current)
    return chunks


def generate_chunk(client: ElevenLabs, text: str, path: Path) -> None:
    audio_bytes = client.text_to_speech.convert(
        text=text,
        voice_id=VOICE_ID,
        model_id=MODEL,
        output_format="mp3_44100_128",
    )
    with open(path, "wb") as f:
        for chunk in audio_bytes:
            if chunk:
                f.write(chunk)


def main():
    import subprocess
    import tempfile

    print(f"Reading script: {SCRIPT}")
    raw = SCRIPT.read_text()
    text = clean_script(raw)

    word_count = len(text.split())
    char_count = len(text)
    print(f"Cleaned script: {word_count} words, {char_count} characters")
    print(f"Estimated duration: ~{word_count // 128} minutes at 128 wpm")

    chunks = split_text(text)
    print(f"Split into {len(chunks)} chunks")
    print()

    client = ElevenLabs(api_key=API_KEY)

    part_files = []
    with tempfile.TemporaryDirectory() as tmp:
        for i, chunk in enumerate(chunks, 1):
            part_path = Path(tmp) / f"part_{i:02d}.mp3"
            print(f"  [{i}/{len(chunks)}] Generating chunk ({len(chunk)} chars)...")
            generate_chunk(client, chunk, part_path)
            part_files.append(str(part_path))
            print(f"           Saved {part_path.stat().st_size // 1024}KB")

        print(f"\nConcatenating {len(part_files)} parts with ffmpeg...")
        concat_list = Path(tmp) / "concat.txt"
        concat_list.write_text("\n".join(f"file '{p}'" for p in part_files))
        subprocess.run(
            ["ffmpeg", "-y", "-f", "concat", "-safe", "0",
             "-i", str(concat_list), "-c", "copy", str(OUTPUT)],
            check=True, capture_output=True,
        )

    print(f"\nSaved to: {OUTPUT}")
    print(f"File size: {OUTPUT.stat().st_size / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
