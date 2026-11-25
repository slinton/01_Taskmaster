//
// View for overall project properties
//
import { ProjectState } from '../models/project.js';
import { Project } from '../models/project.js';
import { eventBus } from '../services/event-bus.js';


export class SummaryPage {
    constructor(containerId = 'summary-page') {
        this._projectTree = null;
        this._container = document.querySelector(`#${containerId}`);

        eventBus.subscribe('project-tree-changed', (projectTree, _publisher) => {
            this._projectTree = projectTree;
            this.render();
        });
    }

    // Render the project properties view
    render() {
        console.log(`ActiveProjectsView: Rendering`);
        this._container.replaceChildren();

        const heading = document.createElement('h1');
        heading.textContent = 'Active Projects';
        this._container.appendChild(heading);

        const projectList = document.createElement('div');
        projectList.id = 'project-list';
        this._container.appendChild(projectList);

        if (!this._projectTree || !this._projectTree.rootProject) {
            const noProjectsMessage = document.createElement('div');
            noProjectsMessage.textContent = 'No active projects found.';
            projectList.appendChild(noProjectsMessage);
            return;
        }

        const rootProject = this._projectTree.rootProject;
        const activeProjects = rootProject.getAllSubprojects(p => p.state === ProjectState.ACTIVE);
        console.log(`ActiveProjectsView: Found ${activeProjects.length} active projects`);
        activeProjects.forEach(project => {
            const numTasksRemaining = project.getTaskCount() - project.getCompletedTaskCount();
            const projectItem = document.createElement('div');
            projectItem.textContent = `${project.name} (${numTasksRemaining} tasks remaining)` ;
            projectList.appendChild(projectItem);
        });
    }
}