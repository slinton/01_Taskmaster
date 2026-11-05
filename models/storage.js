/**
 * storage.js
 * Saving and loading Taskmaster's data.
 *
 * The data is stored as one piece of text, an "envelope" around the root project:
 *
 *   { "version": 1, "savedAt": "2026-11-02T18:30:00.000Z", "root": { ...the project tree... } }
 *
 * The version number lets the format change later without breaking old saves
 * and old exported files. The same text is used for both the copy kept in the
 * browser (LocalStore) and the files the user exports and imports.
 *
 *   serialize(root)   -> text to save or export
 *   parse(text)       -> a root Project, or an Error saying what is wrong with the text
 *
 *   const store = new LocalStore();
 *   const { root, problem } = store.load();   // root is null if nothing is saved (or it can't be read)
 *   store.save(root);                         // throws if the browser won't store it
 *
 * Nothing here touches the page, so it can be tested on its own. LocalStore is
 * given the storage to use, which lets the tests hand it a fake one.
 */

import { Project } from "./project.js";

/** Version of the saved format. Raise it when the format changes, and teach parse() to upgrade older ones. */
export const FORMAT_VERSION = 1;

/** Name the data is saved under. (GitHub Pages sites under one account share storage, so it is specific.) */
export const DEFAULT_KEY = "taskmaster:data";

/**
 * Turn the root project into text for saving or exporting.
 * @param {Project} root
 * @param {object} [options]
 * @param {boolean} [options.pretty] - Indent it so a person can read it (for exported files)
 * @param {Date} [options.now] - The time to record as savedAt
 * @returns {string}
 */
export function serialize(root, { pretty = false, now = new Date() } = {}) {
  const envelope = { version: FORMAT_VERSION, savedAt: now.toISOString(), root };
  return pretty ? JSON.stringify(envelope, null, 2) : JSON.stringify(envelope);
}

/**
 * Turn saved or imported text back into a root project.
 *
 * A file that is just a project tree, with no version wrapper (such as the
 * sample data used in development), is accepted too.
 *
 * Errors have a short message that starts in lower case and has no full stop,
 * so it can go inside a sentence: `Couldn't import "x.json": ${error.message}.`
 *
 * @param {string} text
 * @returns {Project} The root project
 * @throws {Error} If the text isn't usable Taskmaster data
 */
export function parse(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("the file isn't valid JSON");
  }

  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("the file doesn't look like Taskmaster data");
  }

  let tree;
  if ("version" in data) {
    if (!Number.isInteger(data.version) || data.version < 1) {
      throw new Error("the file has an unrecognized format version");
    }
    if (data.version > FORMAT_VERSION) {
      throw new Error(
        `the file was saved by a newer version of Taskmaster (format ${data.version}; this version reads up to ${FORMAT_VERSION})`
      );
    }
    // (When FORMAT_VERSION goes up, upgrade older data here before loading it.)
    tree = data.root;
  } else {
    tree = data; // a bare project tree
  }

  if (tree === null || typeof tree !== "object" || Array.isArray(tree)) {
    throw new Error("the file doesn't contain any projects");
  }

  try {
    return Project.loadRoot(tree);
  } catch (error) {
    throw new Error(`the projects in the file can't be loaded (${error.message})`);
  }
}

/** Keeps the data in the browser's localStorage. */
export class LocalStore {
  // Private fields: only code inside this class can use them.
  #storage;
  #key;

  /**
   * @param {object} [options]
   * @param {Storage|null} [options.storage] - Where to keep the data. Defaults to the browser's localStorage.
   * @param {string} [options.key] - Name to save the data under
   */
  constructor({ storage = LocalStore.#browserStorage(), key = DEFAULT_KEY } = {}) {
    this.#storage = storage;
    this.#key = key;
  }

  /** True if the browser is letting us store data. */
  get available() {
    return this.#storage !== null;
  }

  /**
   * Read the saved data.
   *
   * Never throws. If the saved data can't be read, a copy of it is kept under a
   * different name (so it isn't lost when a fresh start is saved over it) and
   * `problem` says what happened.
   *
   * @returns {{root: Project|null, problem: string|null}}
   *   root: the saved project tree, or null if nothing is saved or it can't be read
   *   problem: a message for the user if something went wrong, otherwise null
   */
  load() {
    if (!this.#storage) {
      return { root: null, problem: LocalStore.#unavailableMessage };
    }

    let text;
    try {
      text = this.#storage.getItem(this.#key);
    } catch {
      return { root: null, problem: LocalStore.#unavailableMessage };
    }
    if (text === null) {
      return { root: null, problem: null }; // nothing saved yet
    }

    try {
      return { root: parse(text), problem: null };
    } catch (error) {
      const kept = this.#keepCopy(text);
      const problem =
        `Your saved data couldn't be read: ${error.message}. Taskmaster started empty.` +
        (kept ? " A copy of the unreadable data was kept in this browser." : "");
      return { root: null, problem };
    }
  }

  /**
   * Save the root project.
   * @param {Project} root
   * @throws {Error} If the browser won't store it (storage blocked or full)
   */
  save(root) {
    if (!this.#storage) {
      throw new Error("storage isn't available");
    }
    this.#storage.setItem(this.#key, serialize(root));
  }

  /**
   * Call `callback` whenever ANOTHER tab or window changes the saved data.
   * (A tab is not told about its own saves.)
   * @param {function} callback
   * @returns {function} Call this to stop listening
   */
  onExternalChange(callback) {
    const listener = (event) => {
      if (event.storageArea === this.#storage && event.key === this.#key && event.newValue !== null) {
        callback();
      }
    };
    globalThis.addEventListener?.("storage", listener);
    return () => globalThis.removeEventListener?.("storage", listener);
  }

  // --- Private helpers ---

  static get #unavailableMessage() {
    return "This browser isn't letting Taskmaster save data, so changes won't be kept. Use Export to keep a copy of your work.";
  }

  /** The browser's localStorage, or null if the browser refuses access to it. */
  static #browserStorage() {
    try {
      return globalThis.localStorage ?? null;
    } catch {
      return null;
    }
  }

  /** Save a copy of unreadable text under another name. Returns true if that worked. */
  #keepCopy(text) {
    try {
      this.#storage.setItem(`${this.#key}:unreadable:${Date.now()}`, text);
      return true;
    } catch {
      return false;
    }
  }
}