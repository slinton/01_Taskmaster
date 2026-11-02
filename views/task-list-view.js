/**
 * task-list-view.js
 * Draws a flat list of the tasks that belong directly to one project.
 *
 * Display only for now: it reports nothing and changes nothing.
 *
 *   const view = new TaskListView(containerElement);
 *   view.render(project);   // call again whenever anything changes
 */

export class TaskListView {
  // Private field: only code inside this class can use it.
  #container;

  /**
   * @param {HTMLElement} container - Element the list is drawn into
   */
  constructor(container) {
    this.#container = container;
  }

  /**
   * Draw (or redraw) the list.
   * @param {Project} project - The selected project; its tasks are listed
   */
  render(project) {
    const heading = document.createElement("h2");
    heading.textContent = "Tasks";

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

    this.#container.replaceChildren(heading, body);
  }

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