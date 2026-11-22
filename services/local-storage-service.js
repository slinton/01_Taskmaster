import { ProjectTree } from '../models/project-tree.js';
import { eventBus } from './event-bus.js';

const STORAGE_KEY = "projectTree";
const SCHEMA_VERSION = 1;

export class LocalStorageService {
	write(projectTree) {
		if (projectTree == null) return this.clear();
		try {
			const payload = {
				schemaVersion: SCHEMA_VERSION,
				data: projectTree,
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
			eventBus.publish('message', 'Local storage write successful', this);
			return true;
		} catch {
			console.warn("LocalStorageService: write failed");
			eventBus.publish('message', 'Local storage write failed', this);
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
				eventBus.publish('message', 'Local storage schema version mismatch', this);
				return null;
			}
			eventBus.publish('message', 'Local storage read successful', this);
			return ProjectTree.fromObject(data);
		} catch {
			console.warn("LocalStorageService: read failed");
			eventBus.publish('message', 'Local storage read failed', this);
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