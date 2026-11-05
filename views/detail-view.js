/**
 * detail-view.js
 * The right-hand panel. It shows information about the selected project in a
 * header area (just the project's name for now), with the subproject list and
 * the task list side by side underneath.
 *
 * The view builds its own contents inside the container it is given, and it
 * creates the two list views itself. The app only talks to this view:
 *
 *   const view = new DetailView(containerElement, { onOpenSubproject: (id) => { ... } });
 *   view.render(project);   // call again whenever anything changes
 *
 * Both callbacks are passed straight through to the list views:
 *  - onOpenSubproject is called with a subproject's id when the user double-clicks
 *    it (or presses Enter).
 *  - onAddSubproject is called with a name when the user adds a subproject to the selected project.
 *  - onAddTask is called with a title when the user adds a task to the selected project.
 *  - onDeleteSubproject and onDeleteTask are called with an id when the user clicks a trash can.
 */

import { SubprojectListView } from "./subproject-list-view.js";
import { TaskListView } from "./task-list-view.js";

export class DetailView {
  // Private fields: only code inside this class can use them.
  #title;
  #subprojectView;
  #taskView;

  /**
   * @param {HTMLElement} container - Element the panel is drawn into
   * @param {object} [options]
   * @param {function} [options.onOpenSubproject] - Called with a subproject's id when it is opened
   * @param {function} [options.onAddSubproject] - Called with a name when a subproject is added
   * @param {function} [options.onAddTask] - Called with a title when a task is added
   * @param {function} [options.onDeleteSubproject] - Called with a subproject's id when it is deleted
   * @param {function} [options.onDeleteTask] - Called with a task's id when it is deleted
   */
  constructor(
    container,
    {
      onOpenSubproject = () => {},
      onAddSubproject = () => {},
      onAddTask = () => {},
      onDeleteSubproject = () => {},
      onDeleteTask = () => {},
    } = {}
  ) {
    // The header: information about the selected project. More will go here later.
    this.#title = document.createElement("h1");
    const header = document.createElement("header");
    header.className = "detail-header";
    header.append(this.#title);

    // The two lists, side by side under the header.
    const subprojects = document.createElement("section");
    subprojects.className = "subproject-list";
    subprojects.setAttribute("aria-label", "Subprojects");

    const tasks = document.createElement("section");
    tasks.className = "task-list";
    tasks.setAttribute("aria-label", "Tasks");

    const body = document.createElement("div");
    body.className = "detail-body";
    body.append(subprojects, tasks);

    const panel = document.createElement("div");
    panel.className = "detail";
    panel.append(header, body);
    container.replaceChildren(panel);

    this.#subprojectView = new SubprojectListView(subprojects, {
      onOpen: onOpenSubproject,
      onAddSubproject,
      onDelete: onDeleteSubproject,
    });
    this.#taskView = new TaskListView(tasks, { onAddTask, onDelete: onDeleteTask });
  }

  /**
   * Draw (or redraw) the whole panel.
   * @param {Project} project - The selected project
   */
  render(project) {
    this.#title.textContent = project.name;
    this.#subprojectView.render(project);
    this.#taskView.render(project);
  }
}