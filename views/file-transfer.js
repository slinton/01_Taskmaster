/**
 * file-transfer.js
 * Helpers for getting text out of the page as a downloaded file, and for
 * letting the user pick a text file to read in.
 */

/**
 * Save text as a file. The browser puts it in the user's Downloads folder
 * (or asks where to save it, depending on the browser's settings).
 * @param {string} filename
 * @param {string} text
 * @param {string} [type] - The kind of file, e.g. "application/json"
 */
export function downloadTextFile(filename, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename; // tells the browser to save it instead of showing it
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000); // the browser has taken what it needs by then
}

/**
 * Let the user choose a file, and read its text.
 *
 * Browsers only allow the file chooser to open in direct response to a click,
 * so call this straight from a click handler, before doing anything slow.
 *
 * @param {object} [options]
 * @param {string} [options.accept] - Kinds of file the chooser offers
 * @param {number} [options.maxBytes] - Refuse files bigger than this
 * @returns {Promise<{name: string, text: string}|null>} The file, or null if the user cancelled
 * @throws {Error} (as a rejected promise) if the file is too big or can't be read
 */
export function pickTextFile({ accept = ".json,application/json", maxBytes = 10 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.hidden = true;
    document.body.append(input);

    const finish = (action) => {
      input.remove();
      action();
    };

    input.addEventListener("change", () => {
      const file = input.files[0];
      if (!file) return finish(() => resolve(null));
      if (file.size > maxBytes) {
        return finish(() => reject(new Error(`that file is too large (over ${Math.round(maxBytes / 1024 / 1024)} MB)`)));
      }
      file.text().then(
        (text) => finish(() => resolve({ name: file.name, text })),
        () => finish(() => reject(new Error("the file couldn't be read")))
      );
    });
    input.addEventListener("cancel", () => finish(() => resolve(null)));

    input.click();
  });
}
