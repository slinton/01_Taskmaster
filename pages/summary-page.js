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

        eventBus.subscribe('show-page', (pageId, _publisher) => {
            console.log(`Received show-page, id = ${pageId}`);
            console.log()
            if (this._container.id === pageId) {
                console.log('SummaryPage showing');
                this._container.classList.remove('hidden');
            }
            else {
                console.log('SummaryPage hiding');
                this._container.classList.add('hidden')
            }
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
        activeProjects.sort((a, b) => a.getTaskCount(task => !task.completed) - b.getTaskCount(task => !task.completed));
        activeProjects.forEach(project => {
            const numTasksRemaining = project.getTaskCount(task => !task.completed);
            const projectItem = document.createElement('div');
            projectItem.className = 'project-item';
            projectItem.textContent = `${project.name} (${numTasksRemaining} tasks remaining)`;
            projectItem.addEventListener('click', () => {
                console.log(`Project clicked: ${project.name}`);
                this._projectTree.selectedProject = project;
                eventBus.publish('project-tree-changed', this._projectTree, this);
                eventBus.publish('show-page', 'home-page', this);
            });
            projectList.appendChild(projectItem);
        });
    }
}