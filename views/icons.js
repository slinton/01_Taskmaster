/**
 * icons.js
 * Small icons drawn with SVG, so they take their colour from the surrounding text
 * and stay sharp at any size.
 */

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/**
 * A trash can icon. Decorative: the button that holds it must have its own accessible name.
 * @returns {SVGElement}
 */
export function createTrashIcon() {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS(SVG_NAMESPACE, "path");
  // lid and handle, the can, and two lines inside it
  path.setAttribute("d", "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6");
  svg.append(path);
  return svg;
}

/**
 * A button with a trash can icon.
 * @param {string} label - What it does, for screen readers and the tooltip, e.g. 'Delete task "Buy markers"'
 * @returns {HTMLButtonElement}
 */
export function createDeleteButton(label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "delete";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.append(createTrashIcon());
  return button;
}
