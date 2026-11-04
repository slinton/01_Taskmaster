/**
 * history.js
 * A list of undoable steps, plus a redo list.
 *
 * It knows nothing about projects or the page. Each step stores two snapshots
 * of the data (as strings): how it was before the change and how it was after.
 * Undoing hands back the "before" snapshot, redoing hands back the "after" one,
 * and the caller puts that data back.
 *
 *   const history = new History({ limit: 100 });
 *   history.record({ label: "Rename project", before, after, undoFocus, redoFocus });
 *   const step = history.undo();   // { state, label, focus } or null if nothing to undo
 *
 * "Focus" is a hint the caller stores with a step and gets back when the step is
 * undone or redone. Taskmaster uses it for the id of the project to select, so
 * that undoing a change shows the user what changed.
 *
 * Rules:
 *  - A new step clears the redo list (the usual editor behavior).
 *  - Only the most recent `limit` steps are kept; the oldest are dropped.
 */

export class History {
  // Private fields: only code inside this class can use them.
  #undoSteps = [];
  #redoSteps = [];
  #limit;

  /**
   * @param {object} [options]
   * @param {number} [options.limit] - Most steps to remember (default 100)
   */
  constructor({ limit = 100 } = {}) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new Error("The history limit must be a whole number, 1 or more.");
    }
    this.#limit = limit;
  }

  /** True if there is a step to undo. */
  get canUndo() {
    return this.#undoSteps.length > 0;
  }

  /** True if there is a step to redo. */
  get canRedo() {
    return this.#redoSteps.length > 0;
  }

  /** Label of the step undo would reverse, or null. (For button text like "Undo rename".) */
  get undoLabel() {
    return this.#undoSteps.at(-1)?.label ?? null;
  }

  /** Label of the step redo would repeat, or null. */
  get redoLabel() {
    return this.#redoSteps.at(-1)?.label ?? null;
  }

  /**
   * Remember a change that has just been made.
   * @param {object} step
   * @param {string} step.label - What the change was, e.g. "Rename project"
   * @param {string} step.before - Snapshot of the data before the change
   * @param {string} step.after - Snapshot of the data after the change
   * @param {*} [step.undoFocus] - Hint handed back when this step is undone
   * @param {*} [step.redoFocus] - Hint handed back when this step is redone
   */
  record({ label, before, after, undoFocus = null, redoFocus = null }) {
    if (typeof label !== "string" || label.trim() === "") {
      throw new Error("A history step needs a label.");
    }

    this.#undoSteps.push({ label, before, after, undoFocus, redoFocus });
    if (this.#undoSteps.length > this.#limit) {
      this.#undoSteps.shift(); // forget the oldest
    }
    this.#redoSteps = [];
  }

  /**
   * Step back one change.
   * @returns {{state: string, label: string, focus: *}|null} The snapshot to restore, or null if there is nothing to undo
   */
  undo() {
    const step = this.#undoSteps.pop();
    if (!step) return null;
    this.#redoSteps.push(step);
    return { state: step.before, label: step.label, focus: step.undoFocus };
  }

  /**
   * Step forward one change that was undone.
   * @returns {{state: string, label: string, focus: *}|null} The snapshot to restore, or null if there is nothing to redo
   */
  redo() {
    const step = this.#redoSteps.pop();
    if (!step) return null;
    this.#undoSteps.push(step);
    return { state: step.after, label: step.label, focus: step.redoFocus };
  }

  /** Forget everything. */
  clear() {
    this.#undoSteps = [];
    this.#redoSteps = [];
  }
}