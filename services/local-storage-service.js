import { ProjectTree } from '../models/project-tree.js';
import { eventBus } from './event-bus.js';

const STORAGE_KEY = "projectTree";
const SCHEMA_VERSION = 1;

export class LocalStorageService {
	 constructor() {
        this._projectTree = null;
        
		// Auto-save on project tree changes
        eventBus.subscribe('project-tree-changed', (projectTree, publisher) => {
			console.log(`LocalStorageService: project-tree-changed event received`);
            if (this === publisher) return;
			console.log(`LocalStorageService: projectTree =`, projectTree);
            this._projectTree = projectTree;
            this.write();
        });
    }

	write() {
		if (this._projectTree == null) return this.clear();
		try {
			const payload = {
				schemaVersion: SCHEMA_VERSION,
				data: this._projectTree,
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
			// eventBus.publish('message', 'Local storage write successful', this);
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
			this._projectTree = ProjectTree.fromObject(data);
			eventBus.publish('message', 'Local storage read successful', this);
			return this._projectTree;
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