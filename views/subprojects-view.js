//
// SubprojectsView displays all subprojects for the selected project
//
import { Project } from '../models/project.js';
import { eventBus } from '../services/event-bus.js';


export class SubprojectsView {
    constructor(containerId = 'subprojects-view') {
        // Subproject view element
        this.container = document.querySelector(`#${containerId}`);
        this.container.tabIndex = 0; // Make the container focusable for key events
        this.container.addEventListener('keydown', (event) => {
            this.onKeyDown(event);
        });

        // Subproject data
        this.project = null;
        this.selectedSubproject = null;
        this.selectedDiv = null;

        // Event bus for handling project-related events
        eventBus.subscribe('project-selected', (project, _subscriber) => {
            //console.log(`SubprojectsView: Project selected:`, project);
            this.project = project;
            this.render();
        });
        eventBus.subscribe('project-edited', (project, _subscriber) => {
            //console.log(`SubprojectsView: Project edited:`, project);
            if (this.project && project === this.project) {
                this.render();
            }
        });
        eventBus.subscribe('project-tree-changed', (projectTree, _subscriber) => {
            //console.log(`SubprojectsView: Project tree changed:`, projectTree);
            this.project = projectTree.selectedProject;
            this.render();
        });
    }

    // Handle key down events for subproject navigation and reordering
    onKeyDown(event) {
        if (!this.project || !this.selectedSubproject) return;
        const currentIndex = this.project.subprojects.indexOf(this.selectedSubproject);
        if (event.key === 'ArrowUp' && currentIndex > 0) {
            this.handleArrowKey(event, currentIndex, currentIndex - 1);
        } else if (event.key === 'ArrowDown' && currentIndex < this.project.subprojects.length - 1) {
            this.handleArrowKey(event, currentIndex, currentIndex + 1);
        }
    }

    // Handle arrow key navigation and reordering of subprojects
    handleArrowKey(event, currentIndex, newIndex) {
        event.preventDefault();
        // Swap order of subprojects if Alt key is pressed
        if (event.altKey) {
            console.log('Alt key pressed with ArrowUp');
            const subprojects = this.project.subprojects;
            [subprojects[currentIndex], subprojects[newIndex]] = [subprojects[newIndex], subprojects[currentIndex]];
            eventBus.publish('project-edited', this.project, this);
        }
        // Move selection
        else {
            this.selectedSubproject = this.project.subprojects[newIndex];
            this.render();
        }
        this.container.focus({ preventScroll: true });
    }

    // Input to create a new subproject
    createSubprojectInput() {
        const newSubprojectInput = document.createElement('input');
        newSubprojectInput.type = 'text';
        newSubprojectInput.placeholder = 'Add a new subproject';
        newSubprojectInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && newSubprojectInput.value.trim() !== '') {
                const newSubproject = new Project(newSubprojectInput.value.trim());
                newSubproject.parent = this.project;
                this.project.subprojects.push(newSubproject);
                newSubprojectInput.value = '';
                eventBus.publish('project-edited', this.project, this);
            }
        });
        return newSubprojectInput;
    }

    // Delete button for a subproject
    createDeleteButton(subproject, project) {
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'icon-button delete-button';
        deleteButton.setAttribute('aria-label', 'Delete subproject');
        deleteButton.setAttribute('title', 'Delete subproject');
        deleteButton.addEventListener('click', () => {
            const index = project.subprojects.indexOf(subproject);
            if (index > -1) {
                project.subprojects.splice(index, 1);
                eventBus.publish('project-edited', project, this);
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
    createSubprojectDiv(subproject, project) {
        const subprojectDiv = document.createElement('div');
        subprojectDiv.className = 'subproject';
        if (this.selectedSubproject === subproject) {
            subprojectDiv.classList.add('selected');
            this.selectedDiv = subprojectDiv;
        }
        subprojectDiv.addEventListener('click', () => {
            this.selectedSubproject = subproject;
            if (this.selectedDiv) {
                this.selectedDiv.classList.remove('selected');
            }
            this.selectedDiv = subprojectDiv;
            subprojectDiv.classList.toggle('selected', true);
        });

        subprojectDiv.addEventListener('dblclick', () => {
            eventBus.publish('project-selected', subproject, this);
        });

        // Subproject name
        subprojectDiv.appendChild(document.createTextNode(` ${subproject.name}`));

        // Delete button
        const deleteButtonElement = this.createDeleteButton(subproject, project, this);
        subprojectDiv.appendChild(deleteButtonElement);

        return subprojectDiv;
    }

    // List of subprojects
    createSubprojectList() {
        // List of subprojects
        const itemsList = document.createElement('div');
        itemsList.className = 'items-list';
        this.container.appendChild(itemsList);

        this.project.subprojects.forEach(subproject => {
            const subprojectDiv = this.createSubprojectDiv(subproject, this.project);
            itemsList.appendChild(subprojectDiv);
        });
        return itemsList;
    }

    // Render the subprojects view
    render() {
        console.log(`SubprojectsView: Rendering`);
        this.container.replaceChildren();

        // Header
        const header = document.createElement('h2');
        header.textContent = 'Subprojects';
        this.container.appendChild(header);

        // Empty project
        if (!this.project) {
            const noProjectMessage = document.createElement('p');
            noProjectMessage.textContent = 'No project selected';
            this.container.appendChild(noProjectMessage);
            return;
        }

        // New subproject input
        const newSubprojectInput = this.createSubprojectInput();
        this.container.appendChild(newSubprojectInput);

        // List of subprojects
        const itemsList = this.createSubprojectList();
        this.container.appendChild(itemsList);
    }
}