//
// FirebaseService: Handles reading and writing the project tree to Firebase Realtime Database.
//
import { ProjectTree } from '../models/project-tree.js';
import { eventBus } from './event-bus.js';
import { localStorageService } from './local-storage-service.js';

const DB_URL = 'https://taskmaster-data-default-rtdb.firebaseio.com';
const DB_PATH = 'appdata';
const ENDPOINT = `${DB_URL}/${DB_PATH}.json`;
const SCHEMA_VERSION = 1;

export class FirebaseService {
    constructor() {
        this._needsSave = false;

        eventBus.subscribe('project-tree-changed', (_projectTree, publisher) => {
            if (publisher === this) return;
            this._needsSave = true;
        });
    }

    get needsSave() {
        return this._needsSave;
    }

    async write(projectTree) {
        if (projectTree == null) return this.clear();
        try {
            // The envelope is stored as a JSON *string* on purpose. Realtime
            // Database drops empty arrays and reshapes sparse ones, so storing
            // the tree as text keeps it exactly as it was saved.
            const envelope = JSON.stringify({ version: SCHEMA_VERSION, data: projectTree });
            const res = await fetch(ENDPOINT, {
                method: 'PUT',
                body: JSON.stringify(envelope)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            this._needsSave = false;
            eventBus.publish('project-tree-saved', projectTree, this);
            eventBus.publish('message', 'Data written to Firebase', this);
            return true;
        } catch (error) {
            console.warn('FirebaseService: write failed', error);
            eventBus.publish('message', 'Failed to write data to Firebase!', this);
            return false;
        }
    }

    async read() {
        try {
            const res = await fetch(ENDPOINT);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const raw = await res.json();
            if (raw == null) return new Error('No data found in Firebase');
            const parsed = JSON.parse(raw);
            const projectTree = ProjectTree.fromObject(parsed.data);
            eventBus.publish('message', 'Data read from Firebase', this);
            localStorageService.write(projectTree);
            this._needsSave = false;
            return projectTree;
        } catch (error) {
            console.warn('FirebaseService: read failed', error);
            eventBus.publish('message', 'Failed to read data from Firebase!', this);
            return null;
        }
    }

    async clear() {
        try {
            const res = await fetch(ENDPOINT, { method: 'DELETE' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return true;
        } catch (error) {
            console.warn('FirebaseService: clear failed', error);
            return false;
        }
    }
}

export const firebaseService = new FirebaseService();