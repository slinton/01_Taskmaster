import { ProjectTree } from '../models/project-tree.js';
import { eventBus } from './event-bus.js';
import { localStorageService } from './local-storage-service.js';
import { firebaseService } from './firebase-service.js';


export class PersistenceService {
    constructor() {
        this._projectTree = null;

        // Auto-save on project tree changes
        eventBus.subscribe('project-tree-changed', (projectTree, publisher) => {
            console.log(`PersistenceService: project-tree-changed event received. publisher is me ${publisher === this}`);
            if (this === publisher) return;
            this._projectTree = projectTree;
            // Note: toolbar read from either results in writing back to both.
            this.writeToLocalStorage(this._projectTree);
            this.writeToFirebase(this._projectTree);
        });
    }

    async readOnStartup() {
        // Attempt to read from Firebase first
        this._projectTree = await this.readFromFirebase();
        console.log(`PersistenceService:readOnStartup - read from firebase success = ${this._projectTree != null}`)
        if (this._projectTree !== null) {
            this.writeToLocalStorage(this._projectTree);
            eventBus.publish('project-tree-changed', this._projectTree, this);
            return;
        }

        // Firebase read failed, try local storage next
        this._projectTree = this.readFromLocalStorage();
        console.log(`PersistenceService:readOnStartup - read from localStorage success = ${this._projectTree != null}`)
        if (this._projectTree !== null) {
            await this.writeToFirebase(this._projectTree);
            eventBus.publish('project-tree-changed', this._projectTree, this);
            return;
        }

        // Local storage read failed, create an empty project tree
        // this._projectTree = ProjectTree.createEmpty();
        this._projectTree = null;
        console.log('PersistenceService: Created empty project tree');
        eventBus.publish('project-tree-changed', this._projectTree, this);
    }

    writeToLocalStorage(projectTree) {
        return localStorageService.write(projectTree);
    }

    readFromLocalStorage() {
        return localStorageService.read();
    }

    async writeToFirebase(projectTree) {
        return await firebaseService.write(projectTree);
    }

    async readFromFirebase() {
        return await firebaseService.read();
    }
}

export const persistenceService = new PersistenceService();