/**
 * load-data.js
 * Test helper: reads a JSON file and returns the root Project (with everything inside it).
 * Kept separate so it can be deleted or replaced later (e.g. by localStorage loading).
 */

import { Project } from "../models/project.js";

/**
 * @param {string} url - Path to a JSON file, e.g. "./sample-data/taskmaster.json"
 * @returns {Promise<Project>} The root project
 */
export async function loadRoot(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${url} (status ${response.status})`);
  }

  const data = await response.json();
  return Project.loadRoot(data);
}
