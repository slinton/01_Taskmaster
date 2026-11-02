/**
 * subproject-list-view.js
 * Draws a flat list of one project's subprojects (archived ones are left out).
 *
 * The view only displays and reports. Double-clicking a subproject, or pressing
 * Enter while it has focus, calls onOpen with that subproject's id. A single
 * click does nothing. The app decides what "open" means (it makes that project
 * the selected one) and then calls render() again.
 *
 *   const view = new SubprojectListView(containerElement, { onOpen: (id) => { ... } });
 *   view.render(project);   // call again whenever anything changes
 *
 * After a render caused by keyboard use, focus moves to the first subproject
 * in the new list (or to the heading if there are none), so it isn't lost.
 */

export class SubprojectListView {
  // Private fields: only code inside this class can use them.
  #container;
  #onOpen;

  /**
   * @param {HTMLElement} container - Element the list is drawn into
   * @param {object} [options]
   * @param {function} [options.onOpen] - Called with a subproject's id when it is opened
   */
  constructor(container, { onOpen = () => {} } = {}) {
    this.#container = container;
    this.#onOpen = onOpen;

    // One listener each for the whole list, instead of one per row.
    container.addEventListener("dblclick", this.#handleDoubleClick);
    container.addEventListener("keydown", this.#handleKeydown);
  }

  /**
   * Draw (or redraw) the list.
   * @param {Project} project - The selected project; its subprojects are listed
   */
  render(project) {
    // If the user is working in this list, put focus somewhere sensible afterward.
    const hadFocus = this.#container.contains(document.activeElement);

    const heading = document.createElement("h2");
    heading.textContent = "Subprojects";
    heading.tabIndex = -1; // can be given focus by code, but is not a Tab stop

    const subprojects = project.children.filter((child) => !child.archived);

    let body;
    if (subprojects.length === 0) {
      body = document.createElement("p");
      body.className = "empty";
      body.textContent = "No subprojects.";
    } else {
      body = document.createElement("ul");
      for (const subproject of subprojects) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.id = subproject.id;
        button.title = "Double-click to open";
        button.textContent = subproject.name;

        const item = document.createElement("li");
        item.append(button);
        body.append(item);
      }
    }

    this.#container.replaceChildren(heading, body);

    if (hadFocus) {
      (body.querySelector("button") ?? heading).focus();
    }
  }

  // --- Events ---

  // Arrow functions as fields keep `this` pointing at the view when the browser calls them.
  #handleDoubleClick = (event) => {
    const button = event.target.closest("button[data-id]");
    if (button && this.#container.contains(button)) {
      this.#onOpen(button.dataset.id);
    }
  };

  #handleKeydown = (event) => {
    if (event.key !== "Enter") return;
    const button = event.target.closest("button[data-id]");
    if (!button || !this.#container.contains(button)) return;

    event.preventDefault(); // we handle Enter ourselves
    this.#onOpen(button.dataset.id);
  };
}