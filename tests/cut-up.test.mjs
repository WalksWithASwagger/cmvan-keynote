import test from "node:test";
import assert from "node:assert/strict";
import { splitText, seededShuffle, moveFragment, compositionText, parseDraft } from "../site/js/widgets/cut-up-state.js";
import { save } from "../site/js/common/storage.js";

const fragments = ["same", "same", "third", "fourth"].map((text, id) => ({ id, text, kept: true }));
const draft = {
  version: 1, source: "Source being revised", credit: "An author", note: "My intervention",
  cutMode: "word", punctMode: "strip", marksMode: "on", layoutMode: "scatter",
  generatedCutMode: "line", generatedPunctMode: "keep", currentSeed: 42,
  fragments: [{ ...fragments[2] }, { ...fragments[1], kept: false }, { ...fragments[0] }, { ...fragments[3] }],
};

test("phrase boundaries survive stripping punctuation, including ellipses", () => {
  assert.deepEqual(splitText("First sentence. Second! Third… Fourth, fifth; sixth\nseventh", "phrase", "strip"),
    ["First sentence", "Second", "Third", "Fourth", "fifth", "sixth", "seventh"]);
  assert.deepEqual(splitText("First. Second!", "phrase", "keep"), ["First.", "Second!"]);
  assert.deepEqual(splitText("... !!!", "phrase", "strip"), []);
  assert.deepEqual(splitText("one two\r\nthree", "line", "keep"), ["one two", "three"]);
  assert.deepEqual(splitText("one\n two", "word", "keep"), ["one", "two"]);
  assert.deepEqual(splitText("one,two can't", "word", "strip"), ["one", "two", "can", "t"]);
});

test("re-shuffle replay always starts from original fragment identities", () => {
  const first = seededShuffle(fragments, 42);
  assert.deepEqual(first.map((f) => f.id), [0, 3, 1, 2]);
  const second = seededShuffle(first, 2718);
  assert.deepEqual(second, seededShuffle(fragments, 2718));
  assert.deepEqual(seededShuffle(second, 42), first);
  assert.deepEqual(fragments.map((f) => f.id), [0, 1, 2, 3]);
});

test("duplicate text can be removed, moved, shuffled, and restored independently", () => {
  const selected = fragments.map((f) => ({ ...f, kept: f.id !== 1 }));
  const moved = moveFragment(selected, 2, -1);
  assert.deepEqual(moved.map((f) => f.id), [2, 1, 0, 3]);
  assert.equal(moved.find((f) => f.id === 1).kept, false);
  assert.equal(moved.find((f) => f.id === 0).kept, true);
  assert.deepEqual(moveFragment(moved, 2, -1), moved);
  assert.deepEqual(moveFragment(moved, 3, 1), moved);
  assert.deepEqual(moveFragment(moved, 1, -1), moved);
  const reshuffled = seededShuffle(moved, 42);
  reshuffled.find((f) => f.id === 1).kept = true;
  assert.equal(reshuffled.filter((f) => f.kept && f.text === "same").length, 2);
  assert.deepEqual(fragments.map((f) => f.id), [0, 1, 2, 3]);
});

test("complete draft round-trips without regenerating or losing pending source settings", () => {
  const restored = parseDraft(JSON.stringify(draft));
  assert.deepEqual(restored, draft);
  assert.deepEqual(parseDraft(JSON.stringify({ ...draft, fragments: null, currentSeed: null })),
    { ...draft, fragments: null, currentSeed: null });
  assert.equal(compositionText(restored), "third\nsame\nfourth\n\nSource: An author\n\nNote: My intervention");
  assert.equal(compositionText({ ...restored, credit: "", note: "  " }), "third\nsame\nfourth");
});

test("malformed and incompatible drafts are rejected without echoing their contents", () => {
  for (const raw of ["PRIVATE invalid JSON", "null", "{}", JSON.stringify({ ...draft, version: 2 }),
    JSON.stringify({ ...draft, cutMode: "bad" }), JSON.stringify({ ...draft, currentSeed: -1 }),
    JSON.stringify({ ...draft, fragments: [fragments[0], fragments[0]] }),
    JSON.stringify({ ...draft, fragments: [{ ...fragments[0], kept: "yes" }] })]) {
    assert.equal(parseDraft(raw), null);
  }
});

test("draft saves synchronously under its own namespace; failure leaves exportable state intact", (t) => {
  const memory = new Map([["pra:v1:tdoc:policy", '"Existing policy"']]);
  const prior = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    setItem(key, value) { memory.set(key, value); },
  } });
  t.after(() => { if (prior) Object.defineProperty(globalThis, "localStorage", prior); else delete globalThis.localStorage; });
  assert.equal(save("cutup:draft", draft), true);
  assert.deepEqual(parseDraft(memory.get("pra:v1:cutup:draft")), draft);
  assert.equal(memory.get("pra:v1:tdoc:policy"), '"Existing policy"');
  t.mock.method(console, "warn", () => {});
  globalThis.localStorage.setItem = () => { throw new Error("quota exceeded"); };
  assert.equal(save("cutup:draft", draft), false);
  assert.match(compositionText(draft), /Source: An author\n\nNote: My intervention$/);
});
