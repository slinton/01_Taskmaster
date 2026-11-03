/**
 * subproject-list-view.js
 * Draws a flat list of one project's subprojects (archived ones are left out),
 * with a field underneath for adding a subproject quickly.
 *
 * The view only displays and reports:
 *  - Double-clicking a subproject, or pressing Enter while it has focus, calls
 *    onOpen with that subproject's id. A single click does nothing.
 *  - Typing a name in the field and pressing Enter (or clicking Add) calls
 *    onAddSubproject with the name.
 * The app decides what each means, changes its data, and calls render() again.
 *
 *   const view = new SubprojectListView(containerElement, {
 *     onOpen: (id) => { ... },
 *     onAddSubproject: (name) => { ... },
 *   });
 *   view.render(project);   // call again whenever anything changes
 *
 * The heading, the list area and the add form are built once, when the view is
 * created. render() only replaces the list, so the text field keeps focus and any
 * unsent text through every redraw. The one exception: unsent text is cleared
 * when a different project is shown, so it can't end up in the wrong project.
 *
 * After a render caused by keyboard use IN THE LIST, focus moves to the first
 * subproject in the new list (or to the heading if there are none), so it isn't lost.
 */

export class SubprojectListView {
  // Private fields: only code inside this class can use them.
  #container;
  #onOpen;
  #onAddSubproject;
  #heading;
  #items; // the area that holds the list (or the "No subprojects." message)
  #input;
  #status; // screen reader announcements
  #projectId = null;

  /**
   * @param {HTMLElement} container - Element the list is drawn into
   * @param {object} [options]
   * @param {function} [options.onOpen] - Called with a subproject's id when it is opened
   * @param {function} [options.onAddSubproject] - Called with a name when the user adds a subproject
   */
  constructor(container, { onOpen = () => {}, onAddSubproject = () => {} } = {}) {
    this.#container = container;
    this.#onOpen = onOpen;
    this.#onAddSubproject = onAddSubproject;

    this.#heading = document.createElement("h2");
    this.#heading.textContent = "Subprojects";
    this.#heading.tabIndex = -1; // can be given focus by code, but is not a Tab stop

    this.#items = document.createElement("div");
    this.#items.className = "subproject-items";

    this.#input = document.createElement("input");
    this.#input.type = "text";
    this.#input.name = "name";
    this.#input.autocomplete = "off";
    this.#input.placeholder = "Add a subproject…"; // short, because this column is narrow

    const button = document.createElement("button");
    button.type = "submit";
    button.textContent = "Add";

    // A form gives us Enter-to-submit for free, and handles text-entry
    // methods (such as Japanese or Chinese input) correctly.
    const form = document.createElement("form");
    form.className = "add-subproject";
    form.append(this.#input, button);
    form.addEventListener("submit", this.#handleSubmit);

    this.#status = document.createElement("p");
    this.#status.className = "visually-hidden";
    this.#status.setAttribute("role", "status");

    container.replaceChildren(this.#heading, this.#items, form, this.#status);

    // One listener each for the whole list, instead of one per row.
    container.addEventListener("dblclick", this.#handleDoubleClick);
    container.addEventListener("keydown", this.#handleKeydown);
  }

  /**
   * Draw (or redraw) the list.
   * @param {Project} project - The selected project; its subprojects are listed
   */
  render(project) {
    // If the user is working in the list itself (not in the add field), put focus somewhere sensible afterward.
    const hadFocus = this.#items.contains(document.activeElement);

    if (project.id !== this.#projectId) {
      this.#projectId = project.id;
      this.#input.value = ""; // unsent text belongs to the project it was typed for
    }

    // Screen readers hear which project the new subproject will go into.
    this.#input.setAttribute("aria-label", `Add a subproject to ${project.name}`);

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

    this.#items.replaceChildren(body);

    if (hadFocus) {
      (body.querySelector("button") ?? this.#heading).focus();
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
    if (!button || !this.#container.contains(button)) return; // e.g. Enter in the add field: let the form handle it

    event.preventDefault(); // we handle Enter ourselves
    this.#onOpen(button.dataset.id);
  };

  #handleSubmit = (event) => {
    event.preventDefault(); // don't reload the page
    const name = this.#input.value.trim();
    if (!name) return;

    this.#onAddSubproject(name); // the app adds the subproject and redraws this view
    this.#input.value = ""; // cleared only after the app took it, so a failure keeps the text
    this.#input.focus(); // ready for the next one
    this.#status.textContent = `Added subproject: ${name}`;
    this.#items.querySelector("li:last-child")?.scrollIntoView?.({ block: "nearest" });
  };
}