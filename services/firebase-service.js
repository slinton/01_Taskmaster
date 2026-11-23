//
// FirebaseService: Handles reading and writing the project tree to Firebase Realtime Database.
//
import { ProjectTree } from '../models/project-tree.js';
import { eventBus } from './event-bus.js';

const DB_URL = 'https://taskmaster-data-default-rtdb.firebaseio.com';
const DB_PATH = 'appdata';
const ENDPOINT = `${DB_URL}/${DB_PATH}.json`;
const SCHEMA_VERSION = 1;

export class FirebaseService {

    async write(projectTree) {
        if (projectTree == null) return false;
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
            console.log('FirebaseService: Wrote project tree to Firebase.');
            eventBus.publish('message', 'Wrote project tree to Firebase.');
            return true;
        } catch (error) {
            console.warn('FirebaseService: write failed', error);
            eventBus.publish('message', 'Failed to write project tree to Firebase.');
            return false;
        }
    }

    async read() {
        try {
            const res = await fetch(ENDPOINT);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const raw = await res.json();
            if (raw == null) return new Error('No project tree found in Firebase');

            const parsed = JSON.parse(raw);
            console.log('FirebaseService: Read project tree from Firebase:');
            eventBus.publish('message', 'Read project tree from Firebase.');
            return ProjectTree.fromObject(parsed.data);
           
        } catch (error) {
            console.warn('FirebaseService: read failed', error);
            eventBus.publish('message', 'Failed to read project tree from Firebase.');
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