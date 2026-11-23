import { localStorageService } from '../services/local-storage-service.js';
import { firebaseService } from '../services/firebase-service.js';
import { history } from '../services/history.js';
import { eventBus } from '../services/event-bus.js';

export class Toolbar {
    constructor(containerId = "toolbar") {
        this._container = document.getElementById(containerId);
        this._projectTree = null;

        eventBus.subscribe('project-tree-changed', (projectTree, _publisher) => {
            this._projectTree = projectTree;
            this.render();
        });
        eventBus.subscribe('history-changed', (_index, _publisher) => {
            this.render();
        });
        eventBus.subscribe('project-tree-saved', (_projectTree, _publisher) => {
            this.render();
        });
    }

    render() {
        console.log(`Toolbar: Rendering`);
        this._container.replaceChildren();

        // Undo button
        const undo_button = this.createButton({ icon: 'undo', label: 'Undo', title: 'Undo' });
        undo_button.disabled = !history.canUndo();
        undo_button.addEventListener('click', () => {
            history.undo();
        });
        this._container.appendChild(undo_button);

        // Redo button
        const redo_button = this.createButton({ icon: 'redo', label: 'Redo', title: 'Redo' });
        redo_button.disabled = !history.canRedo();
        redo_button.addEventListener('click', () => {
            history.redo();
        });
        this._container.appendChild(redo_button);

        // Save to local storage
        const save_local_button = this.createButton({ icon: 'save', label: 'Save locally', title: 'Save locally' });
        save_local_button.addEventListener('click', () => {
            localStorageService.write();
        });
        this._container.appendChild(save_local_button);

        // Load from local storage
        const load_local_button = this.createButton({ icon: 'folder_open', label: 'Load locally', title: 'Load locally' });
        load_local_button.addEventListener('click', () => {
            this._projectTree = localStorageService.read();
            eventBus.publish('project-tree-changed', this._projectTree, this);
        });
        this._container.appendChild(load_local_button);

        // Save to firebase
        const save_button = this.createButton({ icon: 'cloud_upload', label: 'Save to cloud', title: 'Save to cloud' });
        save_button.disabled = !this._projectTree || !firebaseService.needsSave;
        console.log(`Toolbar: Save button disabled = ${save_button.disabled}`);
        save_button.addEventListener('click', async () => {
            if (!this._projectTree) return;
            const saved = await firebaseService.write(this._projectTree);
            console.log(saved ? 'Saved project tree to Firebase.' : 'Firebase save failed.');
        });
        console.log(`Toolbar: Save button needsSave = ${firebaseService.needsSave}`);
        save_button.disabled = !firebaseService.needsSave;
        this._container.appendChild(save_button);

        // Load from firebase
        const load_button = this.createButton({ icon: 'cloud_download', label: 'Load from cloud', title: 'Load from cloud' });
        load_button.addEventListener('click', async () => {
            const projectTree = await firebaseService.read();
            if (!projectTree) return;
            this._projectTree = projectTree;
            eventBus.publish('project-tree-changed', this._projectTree, this);
        });
        this._container.appendChild(load_button);
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