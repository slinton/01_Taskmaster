
import { localStorageService } from '../services/local-storage-service.js';
import { firebaseService } from '../services/firebase-service.js';
import { history } from '../services/history.js';
import { eventBus } from '../services/event-bus.js';

export class Toolbar {
    constructor(containerId = "toolbar", projectTree) {
        this.container = document.getElementById(containerId);
        this.projectTree = projectTree;

        eventBus.subscribe('history-changed', (_index, _subscriber) => {
            this.render();
        });
    }

    render() {
        console.log(`Toolbar: Rendering`);
        this.container.replaceChildren();

        const buttons = [
            { id: 'undo', icon: 'undo', label: 'Undo', title: 'Undo' },
            { id: 'redo', icon: 'redo', label: 'Redo', title: 'Redo' },
            { id: 'upload', icon: 'file_upload', label: 'Upload', title: 'Upload' },
            { id: 'download', icon: 'file_download', label: 'Download', title: 'Download' },
            { id: 'save', icon: 'cloud_upload', label: 'Save to cloud', title: 'Save to cloud' },
            { id: 'load', icon: 'cloud_download', label: 'Load from cloud', title: 'Load from cloud' }
        ];

        buttons.forEach(({ id, icon, label, title }) => {
            const button = this.createButton({ icon, label, title });
            button.addEventListener('click', () => {
                this.handleButtonClick(id);
            });
            if (id === 'undo') {
                button.disabled = !history.canUndo();
            }
            if (id === 'redo') {
                button.disabled = !history.canRedo();
            }
            this.container.appendChild(button);
        });
    }

    handleButtonClick(id) {
        console.log(`Toolbar: ${id} button clicked.`);
        switch (id) {
            case 'undo':
                history.undo();
                break;
            case 'redo':
                history.redo();
                break;
            case 'upload':
                this.loadProjectTree();
                break;
            case 'download':
                this.saveProjectTree();
                break;
            case 'save':
                this.saveProjectTreeToFirebase();
                break;
            case 'load':
                this.loadProjectTreeFromFirebase();
                break;
            default:
                console.warn(`Unhandled button id: ${id}`);
        }
    }

    #applyLoadedTree(projectTree) {
        console.log('Loaded project tree:', projectTree);
        // A failed or empty load returns null; keep the current tree in that case.
        if (!projectTree) return;
        this.projectTree = projectTree;
        eventBus.publish('project-tree-changed', projectTree, this);
    }

    async saveProjectTreeToFirebase() {
        if (!this.projectTree) return;
        const saved = await firebaseService.write(this.projectTree);
        console.log(saved ? 'Saved project tree to Firebase.' : 'Firebase save failed.');
    }

    async loadProjectTreeFromFirebase() {
        this.#applyLoadedTree(await firebaseService.read());
    }

    saveProjectTree() {
        if (this.projectTree) {
            localStorageService.write(this.projectTree);
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