/**
 * notice-view.js
 * Short messages to the user, such as "Couldn't save your changes". It is
 * given the element to show them in (the toolbar has one), and hides it when
 * there is no message.
 *
 *   const notice = new NoticeView(containerElement);
 *   notice.show("Updated with changes made in another tab.");   // goes away by itself after a few seconds
 *   notice.show("Couldn't save.", { error: true });              // stays until replaced or cleared
 *   notice.clear();
 */

export class NoticeView {
  // Private fields: only code inside this class can use them.
  #container;
  #timer = null;

  /** @param {HTMLElement} container - The element the message is shown in */
  constructor(container) {
    this.#container = container;
    container.setAttribute("role", "status"); // screen readers read out new messages
    this.clear();
  }

  /**
   * Show a message, replacing any earlier one.
   * @param {string} text
   * @param {object} [options]
   * @param {boolean} [options.error] - Style it as a problem, and keep it until cleared
   */
  show(text, { error = false } = {}) {
    clearTimeout(this.#timer);
    this.#container.textContent = text;
    this.#container.classList.toggle("error", error);
    this.#container.hidden = false;
    if (!error) {
      this.#timer = setTimeout(() => this.clear(), 8000);
    }
  }

  /** Remove the message and hide the strip. */
  clear() {
    clearTimeout(this.#timer);
    this.#container.textContent = "";
    this.#container.classList.remove("error");
    this.#container.hidden = true;
  }
}
