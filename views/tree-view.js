/**
 * tree-view.js
 * Draws the project tree: each project with its tasks and subprojects.
 *
 * The view only displays and reports. It never changes projects or tasks, and
 * it knows nothing about saving. The app owns the data and the selection:
 *
 *   const view = new TreeView(containerElement, { onSelect: (sel) => { ... } });
 *   view.render(root, { selection });   // call again whenever anything changes
 *
 * A selection is { kind: "project" | "task", id: "..." } (or null for none).
 * Clicking a row calls onSelect with that. The view does NOT highlight it by
 * itself: the app decides, then calls render() again with the new selection.
 *
 * The view keeps only one thing of its own: which projects are collapsed.
 * Everything else is rebuilt from the root each time render() is called.
 *
 * Keyboard (follows the standard "tree" pattern):
 *   Up / Down      move to the previous / next visible row
 *   Home / End     first / last visible row
 *   Right          expand a collapsed project, or move to its first row
 *   Left           collapse an expanded project, or move to its parent
 *   Enter / Space  select the focused row
 */

export class TreeView {
  // Private fields: only code inside this class can use them.
  #container;
  #onSelect;
  #root = null;
  #selection = null;
  #collapsed = new Set(); // ids of projects the user has collapsed

  /**
   * @param {HTMLElement} container - Element the tree is drawn into
   * @param {object} [options]
   * @param {function} [options.onSelect] - Called with { kind, id } when a row is chosen
   */
  constructor(container, { onSelect = () => {} } = {}) {
    this.#container = container;
    this.#onSelect = onSelect;

    // One listener each for the whole tree, instead of one per row.
    container.addEventListener("click", this.#handleClick);
    container.addEventListener("keydown", this.#handleKeydown);
  }

  /**
   * Draw (or redraw) the tree.
   * @param {Project} root - The root project
   * @param {object} [options]
   * @param {{kind: string, id: string}|null} [options.selection] - Row to highlight
   */
  render(root, { selection = null } = {}) {
    this.#root = root;
    this.#selection = selection;
    this.#redraw();
  }

  // --- Drawing ---

  #redraw() {
    // If the user is working in the tree, put focus back on the same row afterward.
    const active = document.activeElement;
    const focusedItem = this.#container.contains(active) ? active.closest('[role="treeitem"]') : null;
    const focusKey = focusedItem ? TreeView.#key(focusedItem.dataset.kind, focusedItem.dataset.id) : null;

    this.#container.replaceChildren();
    if (!this.#root) return;

    const tree = document.createElement("ul");
    tree.setAttribute("role", "tree");
    tree.setAttribute("aria-label", "Projects and tasks");
    tree.append(this.#buildProject(this.#root));
    this.#container.append(tree);

    // Exactly one row can be reached with the Tab key: the focused row,
    // else the selected row, else the first row.
    const items = [...tree.querySelectorAll('[role="treeitem"]')];
    const tabStop =
      items.find((item) => TreeView.#key(item.dataset.kind, item.dataset.id) === focusKey) ??
      items.find((item) => item.getAttribute("aria-selected") === "true") ??
      items[0];
    tabStop.tabIndex = 0;
    if (focusedItem) tabStop.focus();
  }

  #buildProject(project, showTasks = false) {

    const children = project.children;
    const tasks = showTasks ? project.tasks : [];
    const hasContents = children.length + tasks.length > 0;
    const collapsed = this.#collapsed.has(project.id);

    const item = this.#buildItem("project", project.id);
    if (project.archived) item.classList.add("archived");
    if (hasContents) item.setAttribute("aria-expanded", String(!collapsed));

    const row = document.createElement("div");
    row.className = "row";

    const toggle = document.createElement("span");
    toggle.setAttribute("aria-hidden", "true");
    if (hasContents) {
      toggle.className = "toggle";
      toggle.textContent = collapsed ? "▸" : "▾";
    } else {
      //toggle.className = "spacer";
      toggle.textContent = "-";
    }

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = project.name;

    row.append(toggle, label);

    // if (project.archived) {
    //   const badge = document.createElement("span");
    //   badge.className = "badge";
    //   badge.textContent = "archived";
    //   row.append(badge);
    // }

    item.append(row);

    if (hasContents && !collapsed) {
      const group = document.createElement("ul");
      group.setAttribute("role", "group");
      if (showTasks) {
        for (const task of tasks) group.append(this.#buildTask(task));
      }
      for (const child of children) {
        if (!child.archived) {
          group.append(this.#buildProject(child, showTasks));
        }
      }
      item.append(group);
    }

    return item;
  }

  #buildTask(task) {
    const item = this.#buildItem("task", task.id);
    if (task.completed) item.classList.add("completed");

    const row = document.createElement("div");
    row.className = "row";

    const spacer = document.createElement("span");
    spacer.className = "spacer";
    spacer.setAttribute("aria-hidden", "true");

    const check = document.createElement("span");
    check.className = "check";
    check.setAttribute("aria-hidden", "true");
    check.textContent = task.completed ? "☑" : "☐";

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = task.title;

    row.append(spacer, check, label);

    if (task.completed) {
      const note = document.createElement("span");
      note.className = "visually-hidden";
      note.textContent = " (completed)";
      row.append(note);
    }

    item.append(row);
    return item;
  }

  /** Make the <li> every row starts from. */
  #buildItem(kind, id) {
    const item = document.createElement("li");
    item.setAttribute("role", "treeitem");
    item.dataset.kind = kind;
    item.dataset.id = id;
    item.tabIndex = -1; // focusable with code and clicks, but not with Tab
    const selected = this.#selection?.kind === kind && this.#selection?.id === id;
    item.setAttribute("aria-selected", String(selected));
    return item;
  }

  // --- Events ---

  // Arrow functions as fields keep `this` pointing at the view when the browser calls them.
  #handleClick = (event) => {
    const item = event.target.closest('[role="treeitem"]');
    if (!item || !this.#container.contains(item)) return;

    // The small arrow next to a project expands or collapses it.
    if (event.target.closest(".toggle") && item.hasAttribute("aria-expanded")) {
      this.#toggle(item.dataset.id);
    } else {
      this.#choose(item);
    }
  };

  #handleKeydown = (event) => {
    const item = event.target.closest('[role="treeitem"]');
    if (!item) return;

    const items = this.#visibleItems();
    const index = items.indexOf(item);
    const expanded = item.getAttribute("aria-expanded");

    switch (event.key) {
      case "ArrowDown":
        if (index < items.length - 1) this.#moveFocus(items[index + 1]);
        break;
      case "ArrowUp":
        if (index > 0) this.#moveFocus(items[index - 1]);
        break;
      case "Home":
        this.#moveFocus(items[0]);
        break;
      case "End":
        this.#moveFocus(items[items.length - 1]);
        break;
      case "ArrowRight":
        if (expanded === "false") {
          this.#toggle(item.dataset.id);
        } else if (expanded === "true") {
          const firstChild = item.querySelector('[role="treeitem"]');
          if (firstChild) this.#moveFocus(firstChild);
        }
        break;
      case "ArrowLeft":
        if (expanded === "true") {
          this.#toggle(item.dataset.id);
        } else {
          const parent = item.parentElement.closest('[role="treeitem"]');
          if (parent) this.#moveFocus(parent);
        }
        break;
      case "Enter":
      case " ":
        this.#choose(item);
        break;
      default:
        return; // a key we don't use: leave it alone
    }
    event.preventDefault(); // stop the page scrolling on the keys we handled
  };

  // --- Helpers ---

  /** Tell the app a row was chosen. */
  #choose(item) {
    this.#moveFocus(item);
    this.#onSelect({ kind: item.dataset.kind, id: item.dataset.id });
  }

  /** Expand or collapse a project. This is the view's own business, so no callback. */
  #toggle(projectId) {
    if (this.#collapsed.has(projectId)) {
      this.#collapsed.delete(projectId);
    } else {
      this.#collapsed.add(projectId);
    }
    this.#redraw();
  }

  /** Every row currently on screen, top to bottom. Collapsed rows are never drawn. */
  #visibleItems() {
    return [...this.#container.querySelectorAll('[role="treeitem"]')];
  }

  /** Give one row focus and make it the only row Tab can reach. */
  #moveFocus(item) {
    for (const other of this.#visibleItems()) other.tabIndex = -1;
    item.tabIndex = 0;
    item.focus();
  }

  static #key(kind, id) {
    return `${kind}:${id}`;
  }
}
