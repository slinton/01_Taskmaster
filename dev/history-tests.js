/**
 * history-tests.js
 * Small self-checking tests for History.
 * Works in a browser (see history-tests.html) or in Node:
 *   node dev/history-tests.js
 */

import { History } from "../models/history.js";

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

  function throws(fn, message) {
    try {
      fn();
    } catch {
      return;
    }
    throw new Error(message ?? "expected an error but none was thrown");
  }

  test("a new history has nothing to undo or redo", () => {
    const history = new History();
    check(!history.canUndo && !history.canRedo);
    check(history.undo() === null && history.redo() === null);
    check(history.undoLabel === null && history.redoLabel === null);
  });

  test("undo gives back the earlier state, redo the later one", () => {
    const history = new History();
    history.record({ label: "Rename", before: "A", after: "B" });
    check(history.canUndo && !history.canRedo);

    const undone = history.undo();
    check(undone.state === "A" && undone.label === "Rename");
    check(!history.canUndo && history.canRedo);

    const redone = history.redo();
    check(redone.state === "B" && redone.label === "Rename");
    check(history.canUndo && !history.canRedo);
  });

  test("steps undo in reverse order and redo in the original order", () => {
    const history = new History();
    history.record({ label: "one", before: "A", after: "B" });
    history.record({ label: "two", before: "B", after: "C" });
    history.record({ label: "three", before: "C", after: "D" });

    check([history.undo(), history.undo(), history.undo()].map((s) => s.state).join() === "C,B,A");
    check(history.undo() === null);
    check([history.redo(), history.redo(), history.redo()].map((s) => s.state).join() === "B,C,D");
    check(history.redo() === null);
  });

  test("undoing part way, then redoing, ends where it started", () => {
    const history = new History();
    history.record({ label: "one", before: "A", after: "B" });
    history.record({ label: "two", before: "B", after: "C" });
    history.undo();
    history.undo();
    check(history.redo().state === "B");
    check(history.undo().state === "A");
    check(history.redo().state === "B");
    check(history.redo().state === "C");
  });

  test("labels name the next undo and the next redo", () => {
    const history = new History();
    history.record({ label: "Add project", before: "A", after: "B" });
    history.record({ label: "Rename project", before: "B", after: "C" });
    check(history.undoLabel === "Rename project" && history.redoLabel === null);
    history.undo();
    check(history.undoLabel === "Add project" && history.redoLabel === "Rename project");
    history.undo();
    check(history.undoLabel === null && history.redoLabel === "Add project");
  });

  test("a new step clears the redo list", () => {
    const history = new History();
    history.record({ label: "one", before: "A", after: "B" });
    history.undo();
    check(history.canRedo);
    history.record({ label: "other", before: "A", after: "X" });
    check(!history.canRedo && history.redo() === null);
    check(history.undo().state === "A");
  });

  test("only the most recent steps are kept past the limit", () => {
    const history = new History({ limit: 3 });
    for (let i = 0; i < 5; i++) {
      history.record({ label: `step ${i}`, before: `s${i}`, after: `s${i + 1}` });
    }
    const states = [];
    while (history.canUndo) states.push(history.undo().state);
    check(states.join() === "s4,s3,s2", states.join());
  });

  test("the default limit is 100 steps", () => {
    const history = new History();
    for (let i = 0; i < 150; i++) {
      history.record({ label: "step", before: `s${i}`, after: `s${i + 1}` });
    }
    let count = 0;
    let last;
    while (history.canUndo) {
      last = history.undo().state;
      count++;
    }
    check(count === 100, `${count} steps kept`);
    check(last === "s50", `oldest kept step starts at ${last}`);
  });

  test("focus hints come back with each step", () => {
    const history = new History();
    history.record({ label: "Delete", before: "A", after: "B", undoFocus: "x", redoFocus: "y" });
    check(history.undo().focus === "x");
    check(history.redo().focus === "y");
  });

  test("focus defaults to null", () => {
    const history = new History();
    history.record({ label: "Delete", before: "A", after: "B" });
    check(history.undo().focus === null && history.redo().focus === null);
  });

  test("a step needs a label", () => {
    const history = new History();
    throws(() => history.record({ before: "A", after: "B" }));
    throws(() => history.record({ label: "", before: "A", after: "B" }));
    throws(() => history.record({ label: "   ", before: "A", after: "B" }));
    check(!history.canUndo);
  });

  test("the limit must be a whole number, 1 or more", () => {
    throws(() => new History({ limit: 0 }));
    throws(() => new History({ limit: -1 }));
    throws(() => new History({ limit: 1.5 }));
    throws(() => new History({ limit: "5" }));
    new History({ limit: 1 });
  });

  test("clear forgets everything", () => {
    const history = new History();
    history.record({ label: "one", before: "A", after: "B" });
    history.record({ label: "two", before: "B", after: "C" });
    history.undo();
    history.clear();
    check(!history.canUndo && !history.canRedo);
    check(history.undo() === null && history.redo() === null);
  });

  return results;
}

// When run directly with Node, print a report.
if (typeof process !== "undefined" && process.argv?.[1]?.endsWith("history-tests.js")) {
  const results = runTests();
  for (const r of results) {
    console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.ok ? "" : ` (${r.error})`}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}