//
// SubprojectsView displays all subprojects for the selected project
//
import { Project } from '../models/project.js';
import { eventBus } from '../services/event-bus.js';


export class SubprojectsView {
    constructor(containerId = 'subprojects-view') {
        // Subproject view element
        this._container = document.querySelector(`#${containerId}`);
        this._container.tabIndex = 0; // Make the container focusable for key events
        this._container.addEventListener('keydown', (event) => {
            this.onKeyDown(event);
        });

        // Subproject data
        this._projectTree = null;
        this._project = null;
        this._selectedSubproject = null;
        this._selectedDiv = null;

        eventBus.subscribe('project-tree-changed', (projectTree, _publisher) => {
            //console.log(`SubprojectsView: Project tree changed:`, projectTree);
            if (!projectTree) return;
            this._projectTree = projectTree;
            this._project = projectTree.selectedProject;
            this.render();
        });
    }

    // Handle key down events for subproject navigation and reordering
    onKeyDown(event) {
        if (!this._project || !this._selectedSubproject) return;
        const currentIndex = this._project.subprojects.indexOf(this._selectedSubproject);
        if (event.key === 'ArrowUp' && currentIndex > 0) {
            this.handleArrowKey(event, currentIndex, currentIndex - 1);
        } else if (event.key === 'ArrowDown' && currentIndex < this._project.subprojects.length - 1) {
            this.handleArrowKey(event, currentIndex, currentIndex + 1);
        }
    }

    // Handle arrow key navigation and reordering of subprojects
    handleArrowKey(event, currentIndex, newIndex) {
        event.preventDefault();
        // Swap order of subprojects if Alt key is pressed
        if (event.altKey) {
            console.log('Alt key pressed with ArrowUp');
            const subprojects = this._project.subprojects;
            [subprojects[currentIndex], subprojects[newIndex]] = [subprojects[newIndex], subprojects[currentIndex]];
            eventBus.publish('project-tree-changed', this._projectTree, this);
        }
        // Move selection
        else {
            this._selectedSubproject = this._project.subprojects[newIndex];
            this.render();
        }
        this._container.focus({ preventScroll: true });
    }

    // Input to create a new subproject
    createSubprojectInput() {
        const newSubprojectInput = document.createElement('input');
        newSubprojectInput.type = 'text';
        newSubprojectInput.placeholder = 'Add a new subproject';
        newSubprojectInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && newSubprojectInput.value.trim() !== '') {
                const newSubproject = new Project(newSubprojectInput.value.trim());
                newSubproject.parent = this._project;
                this._project.subprojects.push(newSubproject);
                this._project.changeStateToActiveIfAnyTaskNotCompleted();
                newSubprojectInput.value = '';
                eventBus.publish('project-tree-changed', this._projectTree, this);

            }
            else if (event.key === 'Escape') {
                newSubprojectInput.value = '';
            }
        });
        newSubprojectInput.addEventListener('blur', () => {
            newSubprojectInput.value = '';
        });
        return newSubprojectInput;
    }

    createSubprojectNameInput(subproject) {
        const subprojectNameInput = document.createElement('input');
        subprojectNameInput.type = 'text';
        subprojectNameInput.value = subproject.name;
        subprojectNameInput.addEventListener('blur', () => {
            subproject.name = subprojectNameInput.value;
            eventBus.publish('project-tree-changed', this._projectTree, this);
        });
        subprojectNameInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                subprojectNameInput.blur();
            }
        });
        return subprojectNameInput;
    }

    // Delete button for a subproject
    createDeleteButton(subproject) {
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'icon-button delete-button';
        deleteButton.setAttribute('aria-label', 'Delete subproject');
        deleteButton.setAttribute('title', 'Delete subproject');
        deleteButton.addEventListener('click', () => {
            const index = this._project.subprojects.indexOf(subproject);
            if (index > -1) {
                this._project.subprojects.splice(index, 1);
                this._project.changeStateToCompletedIfAllTasksCompleted();
                eventBus.publish('project-tree-changed', this._projectTree, this);
            }
        });
        const deleteIcon = document.createElement('span');
        deleteIcon.className = 'material-symbols-outlined danger';
        deleteIcon.setAttribute('aria-hidden', 'true');
        deleteIcon.textContent = 'delete';
        deleteButton.appendChild(deleteIcon);
        return deleteButton;
    }

    // Subproject information
    createSubprojectDiv(subproject) {
        const subprojectDiv = document.createElement('div');
        subprojectDiv.className = 'subproject';
        if (this._selectedSubproject === subproject) {
            subprojectDiv.classList.add('selected');
            this._selectedDiv = subprojectDiv;
        }
        subprojectDiv.addEventListener('click', () => {
            this._selectedSubproject = subproject;
            if (this._selectedDiv) {
                this._selectedDiv.classList.remove('selected');
            }
            this._selectedDiv = subprojectDiv;
            subprojectDiv.classList.toggle('selected', true);
            subprojectNameInput.select();
        });

        subprojectDiv.addEventListener('dblclick', () => {
            this._projectTree.selectedProject = subproject;
            eventBus.publish('project-tree-changed', this._projectTree, this);
        });

        const subprojectNameInput = this.createSubprojectNameInput(subproject);
        subprojectDiv.appendChild(subprojectNameInput);

        const subprojectStateLabel = document.createElement('span');
        subprojectStateLabel.className = 'subproject-state';
        subprojectStateLabel.textContent = subproject.state;
        subprojectDiv.appendChild(subprojectStateLabel);

        // Delete button
        const deleteButtonElement = this.createDeleteButton(subproject);
        subprojectDiv.appendChild(deleteButtonElement);

        return subprojectDiv;
    }

    // List of subprojects
    createSubprojectList() {
        const itemsList = document.createElement('div');
        itemsList.className = 'items-list';
        this._container.appendChild(itemsList);

        this._project.subprojects.forEach(subproject => {
            const subprojectDiv = this.createSubprojectDiv(subproject);
            itemsList.appendChild(subprojectDiv);
        });
        return itemsList;
    }

    // Render the subprojects view
    render() {
        console.log(`SubprojectsView: Rendering`);
        this._container.replaceChildren();

        // Header
        const header = document.createElement('h2');
        header.textContent = 'Subprojects';
        this._container.appendChild(header);

        // Empty project
        if (!this._project) {
            const noProjectMessage = document.createElement('p');
            noProjectMessage.textContent = 'No project selected';
            this._container.appendChild(noProjectMessage);
            return;
        }

        // New subproject input
        const newSubprojectInput = this.createSubprojectInput();
        this._container.appendChild(newSubprojectInput);
        newSubprojectInput.focus();

        // List of subprojects
        const itemsList = this.createSubprojectList();
        this._container.appendChild(itemsList);
    }
}