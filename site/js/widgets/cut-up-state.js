export const MODES = {
  cutMode: ["word", "phrase", "line"], punctMode: ["keep", "strip"],
  marksMode: ["off", "on"], layoutMode: ["flow", "scatter"],
};

export function splitText(text, mode, punct) {
  const boundary = mode === "word" ? /\s+/ : mode === "line" ? /\r?\n/ : /(?<=[.!?…])\s+|[,;]\s+|\n+/;
  return text.split(boundary)
    .flatMap((s) => {
      const cleaned = (punct === "strip" ? s.replace(/[.,;:!?…"'`*_()\[\]{}]/g, " ") : s).trim();
      return mode === "word" ? cleaned.split(/\s+/) : cleaned;
    })
    .filter(Boolean);
}

// mulberry32 keeps shuffle and scatter replay stable without storing geometry.
export function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle(fragments, seed) {
  const rng = makeRng(seed);
  const a = [...fragments].sort((x, y) => x.id - y.id);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function moveFragment(fragments, id, direction) {
  const a = [...fragments];
  const from = a.findIndex((f) => f.id === id && f.kept);
  if (from < 0) return a;
  let to = from + direction;
  while (a[to] && !a[to].kept) to += direction;
  if (a[to]) [a[from], a[to]] = [a[to], a[from]];
  return a;
}

export function compositionText({ fragments, generatedCutMode, credit, note }) {
  return [fragments.filter((f) => f.kept).map((f) => f.text).join(generatedCutMode === "line" ? "\n" : " "),
    credit.trim() && `Source: ${credit.trim()}`, note.trim() && `Note: ${note.trim()}`]
    .filter(Boolean).join("\n\n");
}

export function parseDraft(raw) {
  try {
    const d = JSON.parse(raw);
    if (d?.version !== 1 || ![d.source, d.credit, d.note].every((v) => typeof v === "string") ||
        !Object.entries(MODES).every(([key, values]) => values.includes(d[key])) ||
        !MODES.cutMode.includes(d.generatedCutMode) || !MODES.punctMode.includes(d.generatedPunctMode) ||
        !(d.currentSeed === null || (Number.isInteger(d.currentSeed) && d.currentSeed >= 0 && d.currentSeed < 2 ** 32)) ||
        !(d.fragments === null || (Array.isArray(d.fragments) &&
          d.fragments.every((f) => f && Number.isSafeInteger(f.id) && f.id >= 0 &&
            typeof f.text === "string" && f.text.trim() && typeof f.kept === "boolean") &&
          new Set(d.fragments.map((f) => f.id)).size === d.fragments.length))) return null;
    return d;
  } catch {
    return null;
  }
}

export function parseTake(raw) {
  const take = parseDraft(raw);
  return take?.fragments?.some((f) => f.kept) ? take : null;
}

export function saveTake(name, value, confirmReplace) {
  try {
    const encoded = JSON.stringify(value);
    const take = parseTake(encoded);
    if (!take) return { status: "empty" };
    const key = `pra:v1:cutup:${name}`;
    const previous = localStorage.getItem(key);
    if (previous !== null && previous !== encoded && !confirmReplace()) return { status: "cancelled" };
    localStorage.setItem(key, encoded);
    return { status: "saved", take };
  } catch {
    return { status: "failed" };
  }
}
