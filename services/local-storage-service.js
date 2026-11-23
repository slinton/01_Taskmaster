import { ProjectTree } from '../models/project-tree.js';
import { eventBus } from './event-bus.js';

const STORAGE_KEY = "projectTree";
const SCHEMA_VERSION = 1;

export class LocalStorageService {

	write(projectTree) {
		if (projectTree == null) return false;
		
		try {
			const payload = {
				schemaVersion: SCHEMA_VERSION,
				data: projectTree,
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
			console.log("LocalStorageService: write successful");
			eventBus.publish('message', 'Wrote project tree to local storage.');
			return true;
		} catch {
			console.warn("LocalStorageService: write failed");
			eventBus.publish('message', 'Failed to write project tree to local storage.');
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
				eventBus.publish('message', 'Schema version mismatch in local storage.');
				return null;
			}
			this._projectTree = ProjectTree.fromObject(data);
			eventBus.publish('message', 'Read project tree from local storage.');
			return this._projectTree;
		} catch {
			console.warn("LocalStorageService: read failed");
			eventBus.publish('message', 'Failed to read project tree from local storage.');
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