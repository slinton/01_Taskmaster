//
// View for overall project properties
//
import { ProjectState } from '../models/project.js';
import { Project } from '../models/project.js';
import { eventBus } from '../services/event-bus.js';


export class ProjectPropertiesView {
    constructor(containerId = 'project-properties-view') {
        this._projectTree = null;
        this._project = null;
        this._container = document.querySelector(`#${containerId}`);

        eventBus.subscribe('project-tree-changed', (projectTree, _publisher) => {
            //console.log(`ProjectPropertiesView: Project tree changed:`, projectTree);
            this._projectTree = projectTree;
            this._project = projectTree.selectedProject;
            this.render();
        });
    }

    // Breadcrumbs for the project hierarchy
    createBreadcrumbs() {
        const breadcrumbs = document.createElement('div');
        breadcrumbs.classList.add('breadcrumbs');
        const ancestors = this._project ? this._project.getAncestors() : [];
        for (const ancestor of ancestors) {
            const projectButton = document.createElement('button');
            projectButton.textContent = ancestor.name;
            projectButton.addEventListener('click', () => {
                this._projectTree.selectedProject = ancestor;
                eventBus.publish('project-tree-changed', this._projectTree, this);
            });
            breadcrumbs.prepend(projectButton);
            if (ancestor !== ancestors[ancestors.length - 1]) {
                const separator = document.createElement('span');
                separator.textContent = ' > ';
                breadcrumbs.prepend(separator);
            }
        }
        return breadcrumbs;
    }

    createCompletionDisplay() {
        const display = document.createElement('div');
        display.classList.add('completion-display');

        const label = document.createElement('span');
        label.textContent = 'Completion:';
        display.append(label);
        display.append(this.createCompletionMeter());
        display.append(this.createCompletionDescription());

        return display;
    }

    createCompletionDescription() {
        const description = document.createElement('p');
        description.textContent = this._project ? this._project.getCompletionDescription() : '';
        return description;
    }

    createCompletionMeter() {
        const meter = document.createElement('meter');
        if (this._project) {
            meter.max = this._project.getTaskCount();
            meter.value = this._project.getCompletedTaskCount();
        }
        return meter;
    }

    createStateDisplay() {
        const stateDisplay = document.createElement('div');
        stateDisplay.classList.add('state-display');

        const label = document.createElement('span');
        label.textContent = 'State:';
        stateDisplay.append(label);

        const dropdown = document.createElement('select');
        if (this._project) {
            const states = Object.values(ProjectState);
            for (const state of states) {
                const option = document.createElement('option');
                option.value = state;
                option.textContent = state;
                if (state === this._project.state) {
                    option.selected = true;
                }
                dropdown.append(option);
            }
            dropdown.addEventListener('change', () => {
                this._project.state = dropdown.value;
                eventBus.publish('project-tree-changed', this._projectTree, this);
            });
        }
        stateDisplay.append(dropdown);
        return stateDisplay;
    }

    // Render the project properties view
    render() {
        console.log(`ProjectPropertiesView: Rendering`);
        this._container.replaceChildren();

        // Empty project
        if (!this._project) {
            const noProjectMessage = document.createElement('p');
            noProjectMessage.textContent = 'No project selected';
            this._container.append(noProjectMessage);
            return;
        }

        // Breadcrumbs
        this._container.append(this.createBreadcrumbs());

        // Header
        const header = document.createElement('h1');
        header.textContent = `Project: ${this._project ? this._project.name : 'NA'}`
        this._container.append(header);

        if (this._project.hasImmediateTasks()) {
            // Completion description
            this._container.append(this.createCompletionDisplay());

            // State dropdown
            this._container.append(this.createStateDisplay());
        }
    }
}