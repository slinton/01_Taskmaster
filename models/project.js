/**
 * project.js
 * A Project holds its own tasks and its own subprojects, to any depth.
 *
 * Rules:
 *  - One top-level (root) project always exists. Create it with
 *    Project.createRoot() or load it with Project.loadRoot(data).
 *  - The root cannot be removed, renamed, or archived.
 *  - Removing a project removes its tasks and subprojects with it.
 *  - New subprojects and tasks go at the end. List order is the order.
 *  - Moving projects or tasks is not supported (yet).
 *
 * Create subprojects with parent.addChild(...) and tasks with project.addTask(...).
 * (`new Project(...)` on its own makes a project that isn't attached to anything.)
 */

import { Task } from "./task.js";

export class Project {
  // Private fields: only code inside this class can use them.
  /** @type {Project|null} */
  #parent = null;
  #isRoot = false;
  #children = [];
  #tasks = [];

  /**
   * @param {string} name - Display name of the project (required)
   * @param {object} [options]
   * @param {string} [options.description] - Optional longer description
   * @param {string} [options.id] - Supply only when restoring a saved project
   * @param {string} [options.createdAt] - ISO date string, when restoring
   * @param {string} [options.updatedAt] - ISO date string, when restoring
   * @param {boolean} [options.archived] - Whether the project is archived
   */
  constructor(name, { description = "", id, createdAt, updatedAt, archived = false } = {}) {
    Project.#checkName(name);

    this.id = id ?? crypto.randomUUID();
    this.name = name.trim();
    this.description = description.trim();
    this.archived = archived;
    this.createdAt = createdAt ?? new Date().toISOString();
    this.updatedAt = updatedAt ?? this.createdAt;
  }

  // --- Creating and loading the root ---

  /** Make a brand new, empty top-level project. */
  static createRoot() {
    const root = new Project("All Projects");
    root.#isRoot = true;
    return root;
  }

  /**
   * Rebuild the whole tree from data saved by JSON.stringify(root).
   * Always returns the root, so pass it the top of the saved data.
   */
  static loadRoot(data) {
    const seen = { projects: new Set(), tasks: new Set() };
    const root = Project.#restore(data, null, seen);
    root.#isRoot = true;
    return root;
  }

  // --- Structure ---

  /** True for the top-level project. */
  get isRoot() {
    return this.#isRoot;
  }

  /** The project this one is inside, or null for the root (and for removed projects). */
  get parent() {
    return this.#parent;
  }

  /** The direct subprojects, in order. (A copy: changing it does not change the project.) */
  get children() {
    return [...this.#children];
  }

  /** The tasks directly in this project, in order. (A copy.) */
  get tasks() {
    return [...this.#tasks];
  }

  /** Every project below this one (children, grandchildren, ...). */
  get descendants() {
    return this.#children.flatMap((child) => [child, ...child.descendants]);
  }

  /** The tasks in this project and in every project below it. */
  get allTasks() {
    return [...this.#tasks, ...this.#children.flatMap((child) => child.allTasks)];
  }

  /** The chain of projects from the root down to this one (inclusive). */
  get path() {
    const path = [];
    let current = this;
    while (current) {
      path.unshift(current);
      current = current.#parent;
    }
    return path;
  }

  /** Find this project or one below it by id. Returns undefined if not found. */
  find(id) {
    if (this.id === id) return this;
    for (const child of this.#children) {
      const found = child.find(id);
      if (found) return found;
    }
    return undefined;
  }

  /** Find a task in this project or any project below it by id. */
  findTask(id) {
    const own = this.#tasks.find((task) => task.id === id);
    if (own) return own;
    for (const child of this.#children) {
      const found = child.findTask(id);
      if (found) return found;
    }
    return undefined;
  }

  // --- Changing the structure ---

  /**
   * Create a subproject at the end of this project's subprojects.
   * @param {string} name
   * @param {object} [options] - Other Project options (e.g. description)
   * @returns {Project}
   */
  addChild(name, options = {}) {
    const child = new Project(name, options);
    child.#parent = this; // allowed: we are inside the Project class
    this.#children.push(child);
    return child;
  }

  /**
   * Delete this project, with all its tasks and subprojects.
   * The root cannot be removed.
   */
  remove() {
    this.#assertNotRoot("removed");
    const parent = this.#parent;
    if (!parent) {
      throw new Error("This project has already been removed.");
    }
    parent.#children.splice(parent.#children.indexOf(this), 1);
    this.#parent = null;
  }

  /**
   * Create a task at the end of this project's tasks.
   * @param {string} title
   * @param {object} [options] - Other Task options (e.g. description)
   * @returns {Task}
   */
  addTask(title, options = {}) {
    const task = new Task(title, this, options);
    this.#tasks.push(task);
    return task;
  }

  /** Delete one of this project's own tasks. Returns the removed task. */
  removeTask(id) {
    const index = this.#tasks.findIndex((task) => task.id === id);
    if (index === -1) {
      throw new Error(`No task with id ${id} in project "${this.name}".`);
    }
    return this.#tasks.splice(index, 1)[0];
  }

  // --- Changing the project itself ---

  /** Change the project's name. The root project cannot be renamed. */
  rename(newName) {
    this.#assertNotRoot("renamed");
    Project.#checkName(newName);
    this.name = newName.trim();
    this.#touch();
  }

  /** Change the project's description. */
  setDescription(text) {
    this.description = String(text).trim();
    this.#touch();
  }

  /** Hide the project without deleting it. The root project cannot be archived. */
  archive() {
    this.#assertNotRoot("archived");
    this.archived = true;
    this.#touch();
  }

  /** Bring an archived project back. */
  unarchive() {
    this.#assertNotRoot("archived");
    this.archived = false;
    this.#touch();
  }

  // --- Saving ---

  /**
   * Turn the project into a plain object (for JSON / localStorage).
   * Tasks and subprojects are nested inside it, so JSON.stringify(root) saves everything.
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      archived: this.archived,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      tasks: this.#tasks.map((task) => task.toJSON()),
      children: this.#children.map((child) => child.toJSON()),
    };
  }

  // --- Private helpers ---

  #touch() {
    this.updatedAt = new Date().toISOString();
  }

  #assertNotRoot(action) {
    if (this.#isRoot) {
      throw new Error(`The root project cannot be ${action}.`);
    }
  }

  static #checkName(name) {
    if (typeof name !== "string" || name.trim() === "") {
      throw new Error("A project needs a non-empty name.");
    }
  }

  /** Rebuild one project from saved data, along with its tasks and subprojects. */
  static #restore(data, parent, seen) {
    const project = new Project(data.name, {
      id: data.id,
      description: data.description,
      archived: data.archived,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
    if (seen.projects.has(project.id)) {
      throw new Error(`Duplicate project id: ${project.id}`);
    }
    seen.projects.add(project.id);
    project.#parent = parent;

    for (const taskData of data.tasks ?? []) {
      const task = new Task(taskData.title, project, {
        id: taskData.id,
        description: taskData.description,
        completed: taskData.completed,
        completedAt: taskData.completedAt,
        createdAt: taskData.createdAt,
        updatedAt: taskData.updatedAt,
      });
      if (seen.tasks.has(task.id)) {
        throw new Error(`Duplicate task id: ${task.id}`);
      }
      seen.tasks.add(task.id);
      project.#tasks.push(task);
    }

    for (const childData of data.children ?? []) {
      project.#children.push(Project.#restore(childData, project, seen));
    }

    return project;
  }
}
