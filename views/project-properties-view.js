//
// View for overall project properties
//
import { Project } from '../models/project.js';
import { eventBus } from '../services/event-bus.js';


export class ProjectPropertiesView {
    constructor(containerId = 'project-properties-view') {
        this.project = null;
        this.container = document.querySelector(`#${containerId}`);

        eventBus.subscribe('project-selected', (project, _subscriber) => {
            //console.log(`ProjectPropertiesView: Project selected:`, project);
            this.project = project;
            this.render();
        });
        eventBus.subscribe('project-tree-changed', (projectTree, _subscriber) => {
            //console.log(`ProjectPropertiesView: Project tree changed:`, projectTree);
            this.project = projectTree.selectedProject;
            this.render();
        });
    }

    // Breadcrumbs for the project hierarchy
    createBreadcrumbs() {
        const breadcrumbs = document.createElement('div');
        breadcrumbs.classList.add('breadcrumbs');
        const ancestors = this.project ? this.project.getAncestors() : [];
        for (const ancestor of ancestors) {
            const projectButton = document.createElement('button');
            projectButton.textContent = ancestor.name;
            projectButton.addEventListener('click', () => {
                eventBus.publish('project-selected', ancestor, this);
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

    // Render the project properties view
    render() {
        console.log(`ProjectPropertiesView: Rendering`);
        this.container.replaceChildren();

        // Breadcrumbs
        this.container.append(this.createBreadcrumbs());

        // Header
        const header = document.createElement('h1');
        header.textContent = `Project: ${this.project ? this.project.name : 'NA'}`
        this.container.append(header);

        // Empty project
        if (!this.project) {
            const noProjectMessage = document.createElement('p');
            noProjectMessage.textContent = 'No project selected';
            this.container.append(noProjectMessage);
            return;
        }
    }
}