//
// FirebaseService: Handles reading and writing the project tree to Firebase Realtime Database.
//

import { ProjectTree } from '../models/project-tree.js';

const DB_URL = 'https://taskmaster-data-default-rtdb.firebaseio.com';
const DB_PATH = 'appdata';
const ENDPOINT = `${DB_URL}/${DB_PATH}.json`;
const SCHEMA_VERSION = 1;

export class FirebaseService {
    // static #instance = null;

    // static get instance() {
    //     return (FirebaseService.#instance ??= new FirebaseService());
    // }

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
            return true;
        } catch (error) {
            console.warn('FirebaseService: write failed', error);
            return false;
        }
    }

    async read() {
        try {
            const res = await fetch(ENDPOINT);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const raw = await res.json();
            if (raw == null) return null;

            const parsed = JSON.parse(raw);
            // Data saved before versioning has no envelope: the tree is the value.
            const isLegacy = parsed.version === undefined;
            if (!isLegacy && parsed.version !== SCHEMA_VERSION) return null; // add migrations here later
            return ProjectTree.fromJSONString(isLegacy ? parsed : parsed.data);
        } catch (error) {
            console.warn('FirebaseService: read failed', error);
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