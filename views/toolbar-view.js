/**
 * toolbar-view.js
 * The bar across the top of the app: the app's name, the Export and Import
 * buttons, and a place for short messages to the user.
 *
 * The view only displays and reports. Clicking a button calls the matching callback.
 *
 *   const toolbar = new ToolbarView(containerElement, {
 *     onExport: () => { ... },
 *     onImport: () => { ... },
 *   });
 *   toolbar.messageElement   // the element messages are shown in (give it to a NoticeView)
 *
 * It is built once and never redrawn, because nothing in it depends on the data.
 */

export class ToolbarView {
  #messageElement;

  /**
   * @param {HTMLElement} container - Element the toolbar is built in
   * @param {object} [options]
   * @param {function} [options.onExport] - Called when Export is clicked
   * @param {function} [options.onImport] - Called when Import is clicked
   */
  constructor(container, { onExport = () => {}, onImport = () => {} } = {}) {
    const brand = document.createElement("span");
    brand.className = "brand";
    brand.textContent = "Taskmaster";

    const exportButton = ToolbarView.#button("Export", "Save all your projects and tasks to a file", onExport);
    const importButton = ToolbarView.#button("Import…", "Replace everything with the contents of a file", onImport);

    const buttons = document.createElement("div");
    buttons.className = "toolbar-buttons";
    buttons.append(exportButton, importButton);

    this.#messageElement = document.createElement("p");
    this.#messageElement.className = "notice";

    container.replaceChildren(brand, buttons, this.#messageElement);
  }

  /** The element where messages to the user are shown. */
  get messageElement() {
    return this.#messageElement;
  }

  static #button(text, title, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.title = title;
    button.addEventListener("click", () => onClick());
    return button;
  }
}
