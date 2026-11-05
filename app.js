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
 *
 * Every change is also saved in the browser (see models/storage.js) as soon as it
 * happens, and the saved data is loaded when the app starts. The undo history is
 * not saved: after a reload there is nothing to undo.
 */

import { Project } from "./models/project.js";
import { History } from "./models/history.js";
import { LocalStore, serialize, parse } from "./models/storage.js";
import { TreeView } from "./views/tree-view.js";
import { DetailView } from "./views/detail-view.js";
import { NoticeView } from "./views/notice-view.js";
import { ToolbarView } from "./views/toolbar-view.js";
import { downloadTextFile, pickTextFile } from "./views/file-transfer.js";

class App {
  // Private fields: only code inside this class can use them.
  /** @type {Project|null} */
  #root = null;

  /** Id of the selected project. (An id, not the object, so it can't go stale.) */
  #selectedProjectId = null;

  #history = new History({ limit: 100 });

  /** The current data as a JSON string. It becomes the "before" of the next change. */
  #snapshot = "";

  #store;
  #treeView;
  #detailView;
  #noticeView;

  /** True after a save fails, so that a later success can clear the warning. */
  #saveFailed = false;

  /** The browser is asked once to keep our data safe from automatic clean-up. */
  #persistRequested = false;

  /**
   * @param {object} elements - The page elements the views draw into
   * @param {HTMLElement} elements.tree - Container for the tree view
   * @param {HTMLElement} elements.detail - Container for the detail view
   * @param {HTMLElement} elements.toolbar - Container for the toolbar (it also shows messages to the user)
   * @param {LocalStore} [elements.store] - Where data is saved (tests can give a different one)
   */
  constructor({ tree, detail, toolbar, store = new LocalStore() }) {
    this.#store = store;
    const toolbarView = new ToolbarView(toolbar, {
      onExport: () => this.#export(),
      onImport: () => this.#import(),
    });
    this.#noticeView = new NoticeView(toolbarView.messageElement);
    this.#treeView = new TreeView(tree, {
      onSelect: (selection) => this.#select(selection.id),
    });
    this.#detailView = new DetailView(detail, {
      onOpenSubproject: (id) => this.#select(id),
      onAddSubproject: (name) => this.#addSubproject(name),
      onAddTask: (title) => this.#addTask(title),
      onDeleteSubproject: (id) => this.#deleteSubproject(id),
      onDeleteTask: (id) => this.#deleteTask(id),
    });

    document.addEventListener("keydown", this.#handleKeydown);

    // If another tab of Taskmaster saves changes, pick them up instead of overwriting them later.
    this.#store.onExternalChange(() => this.#reloadFromStorage());
  }

  /** Load the saved data (or start empty), select the root project, and draw everything. */
  start() {
    const { root, problem } = this.#store.load();
    this.#root = root ?? Project.createRoot();
    this.#snapshot = JSON.stringify(this.#root);
    this.#selectedProjectId = this.#root.id;
    if (problem) this.#noticeView.show(problem, { error: true });
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
      this.#save();
    }

    this.#render();
  }

  /**
   * Add a subproject to the end of the selected project's subprojects. One undoable step.
   * The change deliberately does not return the new project, so the selection stays on
   * the parent and the user can keep adding. (Return it to select the new project.)
   */
  #addSubproject(name) {
    const projectId = this.#selectedProjectId;
    this.#apply("Add subproject", (root) => {
      root.find(projectId).addChild(name);
    });
  }

  /** Add a task to the end of the selected project's tasks. One undoable step. */
  #addTask(title) {
    const projectId = this.#selectedProjectId;
    this.#apply("Add task", (root) => {
      root.find(projectId).addTask(title);
    });
  }

  /**
   * Replace ALL the data with a different project tree, as one undoable step.
   * The new root becomes the selected project.
   */
  #replaceAll(label, newRoot) {
    const before = this.#snapshot;
    const selectedBefore = this.#selectedProjectId;

    this.#root = newRoot;
    this.#selectedProjectId = newRoot.id;

    const after = JSON.stringify(newRoot);
    if (after !== before) {
      this.#history.record({ label, before, after, undoFocus: selectedBefore, redoFocus: newRoot.id });
      this.#snapshot = after;
      this.#save();
    }
    this.#render();
  }

  // --- Export and import ---

  /** Download everything as a file the user can keep, or copy to another computer. */
  #export() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const filename = `taskmaster-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;

    downloadTextFile(filename, serialize(this.#root, { pretty: true, now }));
    this.#noticeView.show(`Exported to ${filename}. Look in your Downloads folder.`);
  }

  /** Let the user pick a file, check it, and (after confirming) replace everything with it. */
  async #import() {
    let file;
    try {
      file = await pickTextFile(); // must be called straight from the click, so it comes first
    } catch (error) {
      this.#noticeView.show(`Couldn't import: ${error.message}.`, { error: true });
      return;
    }
    if (!file) return; // the user cancelled

    let newRoot;
    try {
      newRoot = parse(file.text);
    } catch (error) {
      this.#noticeView.show(`Couldn't import "${file.name}": ${error.message}. Nothing was changed.`, { error: true });
      return;
    }

    const projects = newRoot.descendants.length;
    const tasks = newRoot.allTasks.length;
    const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
    const ok = confirm(
      `Replace everything in Taskmaster with "${file.name}" (${plural(projects, "project")}, ${plural(tasks, "task")})?\n\n` +
        "You can undo this with Ctrl+Z."
    );
    if (!ok) return;

    this.#replaceAll("Import file", newRoot);
    this.#noticeView.show(`Imported "${file.name}". Ctrl+Z undoes it.`);
  }

  /** Delete a subproject of the selected project, with everything inside it. One undoable step. */
  #deleteSubproject(subprojectId) {
    this.#apply("Delete subproject", (root) => {
      root.find(subprojectId)?.remove();
    });
  }

  /** Delete a task from the selected project. One undoable step. */
  #deleteTask(taskId) {
    const projectId = this.#selectedProjectId;
    this.#apply("Delete task", (root) => {
      root.find(projectId).removeTask(taskId);
    });
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
    this.#save();
    this.#render();
  }

  // --- Saving ---

  /** Save the data in the browser. If that fails, tell the user instead of failing silently. */
  #save() {
    try {
      this.#store.save(this.#root);
    } catch {
      this.#saveFailed = true;
      this.#noticeView.show("Couldn't save your changes in this browser. They will be lost if you close or reload this page.", {
        error: true,
      });
      return;
    }

    if (this.#saveFailed) {
      this.#saveFailed = false;
      this.#noticeView.clear();
    }
    this.#requestPersistence();
  }

  /** Ask Chrome not to clear our saved data when the computer is low on space. Asked once; failure is fine. */
  #requestPersistence() {
    if (this.#persistRequested) return;
    this.#persistRequested = true;
    Promise.resolve(navigator.storage?.persist?.()).catch(() => {});
  }

  /**
   * Another tab saved new data: switch to it. Undo history belongs to the old data,
   * so it is cleared.
   */
  #reloadFromStorage() {
    const { root, problem } = this.#store.load();
    if (!root) {
      if (problem) this.#noticeView.show(problem, { error: true });
      return;
    }

    const pathBefore = this.#pathIds(this.#selectedProjectId);
    this.#root = root;
    this.#snapshot = JSON.stringify(root);
    this.#history.clear();
    this.#selectedProjectId = App.#survivingId(root, this.#selectedProjectId, pathBefore);
    this.#render();
    this.#noticeView.show("Updated with changes made in another tab.");
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

  /**
   * True if the user is typing in a text field, so the browser's own text undo
   * should handle Ctrl+Z. An EMPTY field doesn't count: it has nothing to undo,
   * and this lets Ctrl+Z undo the task just added while the add field has focus.
   */
  static #isTyping(target) {
    if (target?.isContentEditable) return true;
    if (["INPUT", "TEXTAREA"].includes(target?.tagName)) return target.value !== "";
    return target?.tagName === "SELECT";
  }
}

const app = new App({
  tree: document.getElementById("tree"),
  detail: document.getElementById("detail"),
  toolbar: document.getElementById("toolbar"),
});
app.start();
