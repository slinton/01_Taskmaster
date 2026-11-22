import { localStorageService } from '../services/local-storage-service.js';
import { firebaseService } from '../services/firebase-service.js';
import { history } from '../services/history.js';
import { eventBus } from '../services/event-bus.js';

export class Toolbar {
    constructor(containerId = "toolbar", projectTree) {
        this._container = document.getElementById(containerId);
        this._projectTree = projectTree;

        eventBus.subscribe('history-changed', (_index, _publisher) => {
            this.render();
        });
        eventBus.subscribe('saved_to_db', (_success, _publisher) => {
            this.render();
        });
    }

    render() {
        console.log(`Toolbar: Rendering`);
        this._container.replaceChildren();

        const undo_button = this.createButton({ icon: 'undo', label: 'Undo', title: 'Undo' });
        undo_button.disabled = !history.canUndo();
        undo_button.addEventListener('click', () => {
            history.undo();
        });
        this._container.appendChild(undo_button);

        const redo_button = this.createButton({ icon: 'redo', label: 'Redo', title: 'Redo' });
        redo_button.disabled = !history.canRedo();
        redo_button.addEventListener('click', () => {
            history.redo();
        });
        this._container.appendChild(redo_button);

        const save_local_button = this.createButton({ icon: 'save', label: 'Save locally', title: 'Save locally' });
        save_local_button.disabled = !history.isUnsaved;
        save_local_button.addEventListener('click', () => {
            localStorageService.write(this._projectTree);
        });
        this._container.appendChild(save_local_button);

        const load_local_button = this.createButton({ icon: 'folder_open', label: 'Load locally', title: 'Load locally' });
        load_local_button.addEventListener('click', () => {
            this._projectTree = localStorageService.read();
            eventBus.publish('project-tree-changed', this._projectTree, this);
        });
        this._container.appendChild(load_local_button);

        const save_button = this.createButton({ icon: 'cloud_upload', label: 'Save to cloud', title: 'Save to cloud' });
        save_button.disabled = !history.isUnsaved;
        save_button.addEventListener('click', () => {
            this.saveProjectTreeToFirebase();
        });
        this._container.appendChild(save_button);

        const load_button = this.createButton({ icon: 'cloud_download', label: 'Load from cloud', title: 'Load from cloud' });
        load_button.addEventListener('click', () => {
            this.loadProjectTreeFromFirebase();
        });
        this._container.appendChild(load_button);

    }

    #applyLoadedTree(projectTree) {
        console.log('Loaded project tree:', projectTree);
        // A failed or empty load returns null; keep the current tree in that case.
        if (!projectTree) return;
        this._projectTree = projectTree;
        eventBus.publish('project-tree-changed', projectTree, this);
    }

    async saveProjectTreeToFirebase() {
        if (!this._projectTree) return;
        const saved = await firebaseService.write(this._projectTree);
        console.log(saved ? 'Saved project tree to Firebase.' : 'Firebase save failed.');
    }

    async loadProjectTreeFromFirebase() {
        this.#applyLoadedTree(await firebaseService.read());
    }

    saveProjectTree() {
        if (this._projectTree) {
            localStorageService.write(this._projectTree);
        }
    }

    loadProjectTree() {
        this.#applyLoadedTree(localStorageService.read());
    }

    createButton({ icon, label, title }) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'icon-button';
        button.setAttribute('aria-label', label);
        button.title = title;

        const span = document.createElement('span');
        span.className = 'material-symbols-outlined';
        span.setAttribute('aria-hidden', 'true');
        span.textContent = icon;

        button.appendChild(span);
        return button;
    }
}