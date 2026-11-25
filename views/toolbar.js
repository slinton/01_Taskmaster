import { history } from '../services/history.js';
import { eventBus } from '../services/event-bus.js';
import { persistenceService } from '../services/persistence-service.js';

export class Toolbar {
    constructor(containerId = "toolbar") {
        this._container = document.getElementById(containerId);
        this._projectTree = null;

        eventBus.subscribe('history-changed', (_index, _publisher) => {
            this.render();
        });
    }

    render() {
        console.log(`Toolbar: Rendering`);
        this._container.replaceChildren();

        // Home button
        const home_button = this.createButton({ icon: 'home', label: 'Home', title: 'Home'});
        home_button.addEventListener('click', () => {
            eventBus.publish('show-page', 'home-page', this);
        });
        this._container.appendChild(home_button);

        // Summary button
        const summary_button = this.createButton({ icon: 'S', label: 'S', title: 'S'});
        summary_button.addEventListener('click', () => {
            eventBus.publish('show-page', 'summary-page', this);
        });
        this._container.appendChild(summary_button);

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
            console.log('Toolbar: Saving project tree to local storage.');
            persistenceService.writeToLocalStorage(this._projectTree);
        });
        this._container.appendChild(save_local_button);

        // Load from local storage
        const load_local_button = this.createButton({ icon: 'folder_open', label: 'Load locally', title: 'Load locally' });
        load_local_button.addEventListener('click', () => {
            console.log('Toolbar: Loading project tree from local storage.');
            const projectTree = persistenceService.readFromLocalStorage();
            if (!projectTree) return;
            this._projectTree = projectTree;
            eventBus.publish('project-tree-changed', this._projectTree, this);
        });
        this._container.appendChild(load_local_button);

        // Save to firebase
        const save_button = this.createButton({ icon: 'cloud_upload', label: 'Save to cloud', title: 'Save to cloud' });
        save_button.addEventListener('click', async () => {
            console.log('Toolbar: Saving project tree to Firebase.');
            await persistenceService.writeToFirebase(this._projectTree);
        });
        this._container.appendChild(save_button);

        // Load from firebase
        const load_button = this.createButton({ icon: 'cloud_download', label: 'Load from cloud', title: 'Load from cloud' });
        load_button.addEventListener('click', async () => {
            console.log('Toolbar: Loading project tree from Firebase.');
            const projectTree = await persistenceService.readFromFirebase();
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