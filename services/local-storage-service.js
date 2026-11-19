import { ProjectTree } from '../models/project-tree.js';

const STORAGE_KEY = "projectTree";
const SCHEMA_VERSION = 1;

export class LocalStorageService {
	// static #instance = null;

	// static get instance() {
	// 	return (LocalStorageService.#instance ??= new LocalStorageService());
	// }

	write(projectTree) {
		if (projectTree == null) return this.clear();
		try {
			const payload = {
				schemaVersion: SCHEMA_VERSION,
				data: projectTree,
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
			return true;
		} catch {
			console.warn("LocalStorageService: write failed");
			return false;
		}
	}

	read() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw == null) return null;
			const { schemaVersion, data } = JSON.parse(raw);
			if (schemaVersion !== SCHEMA_VERSION) {
				console.warn("LocalStorageService: schema version mismatch");
				return null;
			}
			return ProjectTree.fromJSONString(data);
		} catch {
			console.warn("LocalStorageService: read failed");
			return null;
		}
	}

	clear() {
		try {
			localStorage.removeItem(STORAGE_KEY);
			return true;
		} catch (error) {
			console.warn("LocalStorageService: clear failed", error);
			return false;
		}
	}
}

export const localStorageService = new LocalStorageService();