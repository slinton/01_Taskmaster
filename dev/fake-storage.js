/**
 * storage-tests.js
 * Small self-checking tests for the saving and loading code in models/storage.js.
 * Works in a browser (see storage-tests.html) or in Node:
 *   node dev/storage-tests.js
 */

import { Project } from "../models/project.js";
import { FORMAT_VERSION, DEFAULT_KEY, serialize, parse, LocalStore } from "../models/storage.js";

/** A stand-in for localStorage that tests can make misbehave. */
class FakeStorage {
  #data = new Map();
  failReads = false;
  failWrites = false;

  getItem(key) {
    if (this.failReads) throw new Error("blocked");
    return this.#data.has(key) ? this.#data.get(key) : null;
  }

  setItem(key, value) {
    if (this.failWrites) throw new Error("full");
    this.#data.set(key, String(value));
  }

  keys() {
    return [...this.#data.keys()];
  }
}

/** Run every test and return a list of { label, ok, error } results. */
export function runTests() {
  const results = [];

  // Run one test. A thrown error means the test failed.
  function test(label, fn) {
    try {
      fn();
      results.push({ label, ok: true });
    } catch (error) {
      results.push({ label, ok: false, error: error.message });
    }
  }

  function check(condition, message = "check failed") {
    if (!condition) throw new Error(message);
  }

  // Check that fn throws an error whose message contains `part`.
  function throwsWith(fn, part) {
    try {
      fn();
    } catch (error) {
      check(error.message.includes(part), `message was "${error.message}", expected it to contain "${part}"`);
      return;
    }
    throw new Error("expected an error but none was thrown");
  }

  function sampleTree() {
    const root = Project.createRoot();
    root.addTask("Top task");
    const a = root.addChild("A", { description: "first" });
    a.addTask("In A", { description: "soon" }).complete();
    a.addChild("B").addTask("In B");
    root.addChild("C").archive();
    return root;
  }

  // --- serialize and parse ---

  test("serialize wraps the tree in a versioned envelope", () => {
    const root = sampleTree();
    const data = JSON.parse(serialize(root, { now: new Date("2026-11-02T18:30:00Z") }));
    check(data.version === FORMAT_VERSION && FORMAT_VERSION === 1);
    check(data.savedAt === "2026-11-02T18:30:00.000Z");
    check(data.root.name === "All Projects" && data.root.children.length === 2);
  });

  test("pretty output is indented, the default is compact", () => {
    const root = sampleTree();
    check(serialize(root, { pretty: true }).includes("\n  "));
    check(!serialize(root).includes("\n"));
  });

  test("parse gives back exactly what was serialized", () => {
    const root = sampleTree();
    const copy = parse(serialize(root));
    check(JSON.stringify(copy) === JSON.stringify(root));
    check(copy.isRoot && copy.children[0].parent === copy);
    const prettyCopy = parse(serialize(root, { pretty: true }));
    check(JSON.stringify(prettyCopy) === JSON.stringify(root));
  });

  test("a bare project tree (no envelope) is accepted too", () => {
    const root = sampleTree();
    const copy = parse(JSON.stringify(root));
    check(JSON.stringify(copy) === JSON.stringify(root));
  });

  test("text that isn't JSON is rejected", () => {
    throwsWith(() => parse("{nope"), "isn't valid JSON");
    throwsWith(() => parse(""), "isn't valid JSON");
  });

  test("JSON that isn't an object is rejected", () => {
    for (const text of ["[]", "[1,2]", "null", '"text"', "42", "true"]) {
      throwsWith(() => parse(text), "doesn't look like Taskmaster data");
    }
  });

  test("a bad version number is rejected", () => {
    for (const version of [0, -1, 1.5, "1", null]) {
      throwsWith(() => parse(JSON.stringify({ version, root: { name: "x" } })), "unrecognized format version");
    }
  });

  test("a newer format version is rejected with a helpful message", () => {
    throwsWith(() => parse(JSON.stringify({ version: 2, root: { name: "x" } })), "newer version of Taskmaster");
  });

  test("an envelope with no tree is rejected", () => {
    throwsWith(() => parse(JSON.stringify({ version: 1 })), "doesn't contain any projects");
    throwsWith(() => parse(JSON.stringify({ version: 1, root: 5 })), "doesn't contain any projects");
    throwsWith(() => parse(JSON.stringify({ version: 1, root: [] })), "doesn't contain any projects");
  });

  test("a tree with bad contents is rejected, saying why", () => {
    throwsWith(() => parse(JSON.stringify({ version: 1, root: { name: "" } })), "can't be loaded");
    throwsWith(() => parse(JSON.stringify({ version: 1, root: { name: "R", tasks: [{ title: "" }] } })), "can't be loaded");
    const dup = { name: "R", children: [{ id: "x", name: "A" }, { id: "x", name: "B" }] };
    throwsWith(() => parse(JSON.stringify({ version: 1, root: dup })), "Duplicate project id");
  });

  // --- LocalStore ---

  test("with nothing saved, load returns no tree and no problem", () => {
    const store = new LocalStore({ storage: new FakeStorage() });
    const result = store.load();
    check(result.root === null && result.problem === null);
  });

  test("what is saved can be loaded again", () => {
    const storage = new FakeStorage();
    const root = sampleTree();
    new LocalStore({ storage }).save(root);

    const { root: loaded, problem } = new LocalStore({ storage }).load();
    check(problem === null);
    check(JSON.stringify(loaded) === JSON.stringify(root));
  });

  test("data is saved under one specific name, in the envelope format", () => {
    const storage = new FakeStorage();
    new LocalStore({ storage }).save(sampleTree());
    check(storage.keys().join() === DEFAULT_KEY && DEFAULT_KEY === "taskmaster:data");
    check(JSON.parse(storage.getItem(DEFAULT_KEY)).version === 1);
  });

  test("a second save replaces the first", () => {
    const storage = new FakeStorage();
    const store = new LocalStore({ storage });
    const root = Project.createRoot();
    store.save(root);
    root.addChild("New");
    store.save(root);
    check(store.load().root.children.length === 1);
    check(storage.keys().length === 1);
  });

  test("different keys keep separate data", () => {
    const storage = new FakeStorage();
    const one = new LocalStore({ storage, key: "one" });
    const two = new LocalStore({ storage, key: "two" });
    const root = Project.createRoot();
    root.addChild("Only in one");
    one.save(root);
    check(two.load().root === null);
    check(one.load().root.children.length === 1);
  });

  test("unreadable saved data is reported, and a copy of it is kept", () => {
    const storage = new FakeStorage();
    storage.setItem(DEFAULT_KEY, "{broken");
    const { root, problem } = new LocalStore({ storage }).load();

    check(root === null);
    check(problem.includes("couldn't be read") && problem.includes("started empty"), problem);
    check(problem.includes("A copy of the unreadable data was kept"), problem);
    check(storage.getItem(DEFAULT_KEY) === "{broken", "the original must be left alone");
    const backups = storage.keys().filter((k) => k.startsWith(`${DEFAULT_KEY}:unreadable:`));
    check(backups.length === 1 && storage.getItem(backups[0]) === "{broken", "the copy should hold the original text");
  });

  test("saving after an unreadable load does not destroy the kept copy", () => {
    const storage = new FakeStorage();
    storage.setItem(DEFAULT_KEY, "{broken");
    const store = new LocalStore({ storage });
    store.load();
    store.save(Project.createRoot());
    check(store.load().root !== null);
    check(storage.keys().some((k) => storage.getItem(k) === "{broken"), "the copy must survive");
  });

  test("data from a newer version is kept, not overwritten silently", () => {
    const storage = new FakeStorage();
    const future = JSON.stringify({ version: 99, root: { name: "x" } });
    storage.setItem(DEFAULT_KEY, future);
    const { root, problem } = new LocalStore({ storage }).load();
    check(root === null && problem.includes("newer version"), problem);
    check(storage.keys().some((k) => k !== DEFAULT_KEY && storage.getItem(k) === future));
  });

  test("a failure to keep the copy doesn't stop load from reporting", () => {
    const storage = new FakeStorage();
    storage.setItem(DEFAULT_KEY, "{broken");
    storage.failWrites = true;
    const { root, problem } = new LocalStore({ storage }).load();
    check(root === null && problem.includes("couldn't be read"));
    check(!problem.includes("A copy"), problem);
  });

  test("storage the browser refuses to read is a reported problem, not a crash", () => {
    const storage = new FakeStorage();
    storage.failReads = true;
    const { root, problem } = new LocalStore({ storage }).load();
    check(root === null && problem.includes("isn't letting Taskmaster save"), problem);
  });

  test("no storage at all is a reported problem, and saving fails clearly", () => {
    const store = new LocalStore({ storage: null });
    check(!store.available);
    const { root, problem } = store.load();
    check(root === null && problem.includes("isn't letting Taskmaster save"));
    throwsWith(() => store.save(Project.createRoot()), "isn't available");
  });

  test("a failed save throws and leaves the earlier save intact", () => {
    const storage = new FakeStorage();
    const store = new LocalStore({ storage });
    const root = Project.createRoot();
    root.addChild("Kept");
    store.save(root);

    storage.failWrites = true;
    root.addChild("Lost");
    throwsWith(() => store.save(root), "full");

    storage.failWrites = false;
    check(store.load().root.children.map((c) => c.name).join() === "Kept");
  });

  return results;
}

// When run directly with Node, print a report.
if (typeof process !== "undefined" && process.argv?.[1]?.endsWith("storage-tests.js")) {
  const results = runTests();
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.ok ? "" : ` (${r.error})`}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}