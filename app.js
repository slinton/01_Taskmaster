/**
 * app.js
 * Entry point for Taskmaster. The App class owns the data (the root project)
 * and the selected project, creates the views, and redraws them whenever
 * something changes.
 *
 * There is exactly one piece of selection state: the id of the selected
 * project. Every view is drawn from it:
 *
 *   tree click ──────────────┐
 *   subproject double-click ─┴─> #select(id) ──> #render()
 *                                                 ├─ tree view      (highlights it)
 *                                                 └─ detail view    (its name, subprojects and tasks)
 *
 * Changing the DATA is different: every change goes through #apply(), which
 * makes it one undoable step. Selecting a project is not a data change, so it
 * is not undoable. Undo and redo are Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (or Ctrl+Y).
 */

import { Project } from "./models/project.js";
import { History } from "./models/history.js";
import { TreeView } from "./views/tree-view.js";
import { DetailView } from "./views/detail-view.js";

class App {
  // Private fields: only code inside this class can use them.
  /** @type {Project|null} */
  #root = null;

  /** Id of the selected project. (An id, not the object, so it can't go stale.) */
  #selectedProjectId = null;

  #history = new History({ limit: 100 });

  /** The current data as a JSON string. It becomes the "before" of the next change. */
  #snapshot = "";

  #treeView;
  #detailView;

  /**
   * @param {object} elements - The page elements the views draw into
   * @param {HTMLElement} elements.tree - Container for the tree view
   * @param {HTMLElement} elements.detail - Container for the detail view
   */
  constructor({ tree, detail }) {
    this.#treeView = new TreeView(tree, {
      onSelect: (selection) => this.#select(selection.id),
    });
    this.#detailView = new DetailView(detail, {
      onOpenSubproject: (id) => this.#select(id),
    });

    document.addEventListener("keydown", this.#handleKeydown);
  }

  /** Load the data, select the root project, and draw everything for the first time. */
  async start() {
    this.#root = await App.#loadInitialRoot();
    this.#snapshot = JSON.stringify(this.#root);
    this.#selectedProjectId = this.#root.id;
    this.#render();
  }

  // --- Selecting (not undoable) ---

  /** Make a project the selected one. Called by the tree and the detail view. */
  #select(projectId) {
    this.#selectedProjectId = projectId;
    this.#render();
  }

  // --- Changing the data (undoable) ---

  /**
   * Change the data as ONE undoable step. Every edit goes through here.
   *
   *   this.#apply("Rename project", (root) => {
   *     root.find(id).rename(newName);
   *   });
   *
   *   this.#apply("Add subproject", (root) => root.find(parentId).addChild(name));
   *
   * The change function is handed the current root. Always look projects up by
   * id inside it, because undo replaces every Project object with a new one,
   * so objects kept from earlier would be out of date.
   *
   * If the change function returns a Project (such as one it just added), that
   * project becomes the selected one. If it throws, the data is put back the way
   * it was. If it changes nothing, no undo step is recorded.
   *
   * No edit in the app uses this yet.
   *
   * @param {string} label - What the change is, e.g. "Rename project"
   * @param {function(Project): (Project|void)} change
   */
  #apply(label, change) {
    const before = this.#snapshot;
    const selectedBefore = this.#selectedProjectId;
    const pathBefore = this.#pathIds(selectedBefore);

    let result;
    try {
      result = change(this.#root);
    } catch (error) {
      // Throw away any half-finished change.
      this.#root = Project.loadRoot(JSON.parse(before));
      throw error;
    }

    const wanted = result instanceof Project ? result.id : selectedBefore;
    this.#selectedProjectId = App.#survivingId(this.#root, wanted, pathBefore);

    const after = JSON.stringify(this.#root);
    if (after !== before) {
      this.#history.record({
        label,
        before,
        after,
        undoFocus: selectedBefore, // undo takes you back to where you made the change
        redoFocus: this.#selectedProjectId,
      });
      this.#snapshot = after;
    }

    this.#render();
  }

  /** Undo the most recent change. */
  #undo() {
    this.#restore(this.#history.undo());
  }

  /** Redo the change that was most recently undone. */
  #redo() {
    this.#restore(this.#history.redo());
  }

  /** Put the data back to a snapshot from the history. Does nothing for null. */
  #restore(step) {
    if (!step) return;

    const pathBefore = this.#pathIds(this.#selectedProjectId);
    this.#root = Project.loadRoot(JSON.parse(step.state));
    this.#snapshot = step.state;

    // Show the project the step was about, or the nearest one that still exists.
    this.#selectedProjectId = App.#survivingId(this.#root, step.focus ?? this.#selectedProjectId, pathBefore);
    this.#render();
  }

  // --- Keyboard shortcuts ---

  // Arrow functions as fields keep `this` pointing at the app when the browser calls them.
  #handleKeydown = (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    if (App.#isTyping(event.target)) return; // leave the browser's own text undo alone

    const key = event.key.toLowerCase();
    if (key === "z" && !event.shiftKey) {
      this.#undo();
    } else if ((key === "z" && event.shiftKey) || (key === "y" && event.ctrlKey)) {
      this.#redo();
    } else {
      return; // not one of ours
    }
    event.preventDefault();
  };

  // --- Drawing ---

  /** Redraw every view from the current data and selection. */
  #render() {
    // If the selected project no longer exists, fall back to the root.
    const project = this.#root.find(this.#selectedProjectId) ?? this.#root;
    this.#selectedProjectId = project.id;

    this.#treeView.render(this.#root, { selection: { kind: "project", id: project.id } });
    this.#detailView.render(project);
  }

  // --- Helpers ---

  /** Ids of the projects from the root down to this one (empty if it doesn't exist). */
  #pathIds(projectId) {
    return this.#root?.find(projectId)?.path.map((project) => project.id) ?? [];
  }

  /**
   * Pick a project to select: the wanted one if it exists, otherwise the nearest
   * project that still exists above where the selection used to be, otherwise the root.
   * @param {Project} root - The data to choose from
   * @param {string} wantedId - The project we would like
   * @param {string[]} fallbackPathIds - Ids from the old root down to the old selection
   */
  static #survivingId(root, wantedId, fallbackPathIds) {
    if (root.find(wantedId)) return wantedId;
    for (const id of [...fallbackPathIds].reverse()) {
      if (root.find(id)) return id;
    }
    return root.id;
  }

  /** True if the user is typing in a text field. */
  static #isTyping(target) {
    return Boolean(target?.isContentEditable) || ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName);
  }

  /**
   * Where the data comes from at startup.
   * TEMPORARY, until saving and loading exist: use the sample data if it is
   * there, otherwise start with an empty root project.
   */
  static async #loadInitialRoot() {
    try {
      const response = await fetch("dev/sample-data/taskmaster.json");
      if (response.ok) {
        return Project.loadRoot(await response.json());
      }
    } catch (error) {
      console.warn("Could not load the sample data, starting empty.", error);
    }
    return Project.createRoot();
  }
}

const app = new App({
  tree: document.getElementById("tree"),
  detail: document.getElementById("detail"),
});
await app.start();