// Versioned localStorage helpers. Every key is namespaced under `pra:` and
// scoped by a SCHEMA version so we can ship breaking changes to widget state
// shape without leaking stale fields into a new build. Returns { ok, value }
// to keep call-sites simple — never throws.

const NAMESPACE = "pra";
const SCHEMA = 1;

function key(name) {
  return `${NAMESPACE}:v${SCHEMA}:${name}`;
}

export function load(name, fallback = null) {
  try {
    const raw = localStorage.getItem(key(name));
    if (raw === null) return { ok: false, value: fallback };
    return { ok: true, value: JSON.parse(raw) };
  } catch (err) {
    console.warn("[storage] load failed:", name, err);
    return { ok: false, value: fallback };
  }
}

export function save(name, value) {
  try {
    localStorage.setItem(key(name), JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn("[storage] save failed:", name, err);
    return false;
  }
}

export function remove(name) {
  try {
    localStorage.removeItem(key(name));
    return true;
  } catch (err) {
    return false;
  }
}

export function debounceSave(name, delay = 400) {
  let t;
  return (value) => {
    clearTimeout(t);
    t = setTimeout(() => save(name, value), delay);
  };
}
