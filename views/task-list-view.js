/**
 * task-list-view.js
 * Draws a flat list of the tasks that belong directly to one project, with a
 * field underneath for adding a task quickly.
 *
 * The view only displays and reports. Typing a title and pressing Enter (or
 * clicking Add) calls onAddTask with the title. The app adds the task and
 * redraws, and the field is ready for the next one.
 *
 *   const view = new TaskListView(containerElement, { onAddTask: (title) => { ... } });
 *   view.render(project);   // call again whenever anything changes
 *
 * The heading, the list area and the add form are built once, when the view is
 * created. render() only replaces the list, so the text field keeps focus and any
 * unsent text through every redraw. The one exception: unsent text is cleared
 * when a different project is shown, so it can't end up in the wrong project.
 */

export class TaskListView {
  // Private fields: only code inside this class can use them.
  #onAddTask;
  #items; // the area that holds the list (or the "No tasks." message)
  #input;
  #status; // screen reader announcements
  #projectId = null;

  /**
   * @param {HTMLElement} container - Element the list is drawn into
   * @param {object} [options]
   * @param {function} [options.onAddTask] - Called with the title when the user adds a task
   */
  constructor(container, { onAddTask = () => {} } = {}) {
    this.#onAddTask = onAddTask;

    const heading = document.createElement("h2");
    heading.textContent = "Tasks";

    this.#items = document.createElement("div");
    this.#items.className = "task-items";

    this.#input = document.createElement("input");
    this.#input.type = "text";
    this.#input.name = "title";
    this.#input.autocomplete = "off";

    const button = document.createElement("button");
    button.type = "submit";
    button.textContent = "Add";

    // A form gives us Enter-to-submit for free, and handles text-entry
    // methods (such as Japanese or Chinese input) correctly.
    const form = document.createElement("form");
    form.className = "add-task";
    form.append(this.#input, button);
    form.addEventListener("submit", this.#handleSubmit);

    this.#status = document.createElement("p");
    this.#status.className = "visually-hidden";
    this.#status.setAttribute("role", "status");

    container.replaceChildren(heading, this.#items, form, this.#status);
  }

  /**
   * Draw (or redraw) the list.
   * @param {Project} project - The selected project; its tasks are listed
   */
  render(project) {
    if (project.id !== this.#projectId) {
      this.#projectId = project.id;
      this.#input.value = ""; // unsent text belongs to the project it was typed for
    }

    const label = `Add a task to ${project.name}`;
    this.#input.placeholder = `${label}…`;
    this.#input.setAttribute("aria-label", label);

    const tasks = project.tasks;

    let body;
    if (tasks.length === 0) {
      body = document.createElement("p");
      body.className = "empty";
      body.textContent = "No tasks.";
    } else {
      body = document.createElement("ul");
      for (const task of tasks) {
        body.append(TaskListView.#buildTask(task));
      }
    }

    this.#items.replaceChildren(body);
  }

  // --- Events ---

  // Arrow functions as fields keep `this` pointing at the view when the browser calls them.
  #handleSubmit = (event) => {
    event.preventDefault(); // don't reload the page
    const title = this.#input.value.trim();
    if (!title) return;

    this.#onAddTask(title); // the app adds the task and redraws this view
    this.#input.value = ""; // cleared only after the app took it, so a failure keeps the text
    this.#input.focus(); // ready for the next one
    this.#status.textContent = `Added: ${title}`;
    this.#items.querySelector("li:last-child")?.scrollIntoView?.({ block: "nearest" });
  };

  static #buildTask(task) {
    const item = document.createElement("li");
    item.dataset.id = task.id;
    if (task.completed) item.classList.add("completed");

    const check = document.createElement("span");
    check.className = "check";
    check.setAttribute("aria-hidden", "true");
    check.textContent = task.completed ? "☑" : "☐";

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = task.title;

    item.append(check, label);

    if (task.completed) {
      const note = document.createElement("span");
      note.className = "visually-hidden";
      note.textContent = " (completed)";
      item.append(note);
    }

    return item;
  }
}