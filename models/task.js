/**
 * task.js
 * A Task is a single piece of work. Every task belongs to exactly one project,
 * given when the task is created and never changed afterward.
 *
 * Create tasks with project.addTask(...), which also puts the task into the
 * project's list. (Calling `new Task(...)` directly makes a task that the
 * project doesn't know about.)
 */

export class Task {
  // Private field: only code inside this class can change it.
  #project;

  /**
   * @param {string} title - What needs doing (required)
   * @param {Project} project - The one project this task belongs to (required)
   * @param {object} [options]
   * @param {string} [options.description] - Optional longer description
   * @param {string} [options.id] - Supply only when restoring a saved task
   * @param {boolean} [options.completed] - Whether the task is done
   * @param {string|null} [options.completedAt] - ISO date string, when restoring
   * @param {string} [options.createdAt] - ISO date string, when restoring
   * @param {string} [options.updatedAt] - ISO date string, when restoring
   */
  constructor(
    title,
    project,
    { description = "", id, completed = false, completedAt = null, createdAt, updatedAt } = {}
  ) {
    Task.#checkTitle(title);
    if (project === null || typeof project !== "object") {
      throw new Error("A task must belong to a project.");
    }

    this.id = id ?? crypto.randomUUID();
    this.title = title.trim();
    this.description = description.trim();
    this.#project = project;
    this.completed = completed;
    this.completedAt = completed ? (completedAt ?? new Date().toISOString()) : null;
    this.createdAt = createdAt ?? new Date().toISOString();
    this.updatedAt = updatedAt ?? this.createdAt;
  }

  /** The project this task belongs to. Read-only. */
  get project() {
    return this.#project;
  }

  /** The id of the project this task belongs to. */
  get projectId() {
    return this.#project.id;
  }

  /** Change the task's title. */
  setTitle(newTitle) {
    Task.#checkTitle(newTitle);
    this.title = newTitle.trim();
    this.#touch();
  }

  /** Change the task's description. */
  setDescription(text) {
    this.description = String(text).trim();
    this.#touch();
  }

  /** Mark the task as done. Does nothing if it is already done. */
  complete() {
    if (this.completed) return;
    this.completed = true;
    this.completedAt = new Date().toISOString();
    this.#touch();
  }

  /** Mark a finished task as not done again. */
  reopen() {
    if (!this.completed) return;
    this.completed = false;
    this.completedAt = null;
    this.#touch();
  }

  /** Delete this task from its project. */
  remove() {
    this.#project.removeTask(this.id);
  }

  /**
   * Turn the task into a plain object (for JSON / localStorage).
   * There is no project id: the task is saved inside its project.
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      completed: this.completed,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // Private helpers (the # makes them usable only inside this class).
  #touch() {
    this.updatedAt = new Date().toISOString();
  }

  static #checkTitle(title) {
    if (typeof title !== "string" || title.trim() === "") {
      throw new Error("A task needs a non-empty title.");
    }
  }
}
