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
        activeProjects.sort((a, b) => a.getAllTaskCount(task => !task.completed) - b.getAllTaskCount(task => !task.completed));
        
        for (let j = 0; j < Math.min(5, activeProjects.length); j++) {
            const project = activeProjects[j];
            // Display the active project and the number of remaining tasks
            const projectItem = document.createElement('div');
            projectItem.className = 'project-item';
            projectItem.textContent = `${project.name}`;
            projectItem.addEventListener('click', () => {
                console.log(`Project clicked: ${project.name}`);
                this._projectTree.selectedProject = project;
                eventBus.publish('project-tree-changed', this._projectTree, this);
                eventBus.publish('show-page', 'home-page', this);
            });

            // Show up to 3 uncompleted tasks for this project
            const numUncompletedTasks = project.getAllTaskCount(task => !task.completed);
            for (let i = 0; i < Math.min(3, numUncompletedTasks); i++) {
                const task = project.getAllTasks(task => !task.completed)[i];
                
                const taskItem = document.createElement('div');
                taskItem.className = 'task-item';
                taskItem.textContent = task.name;
                projectItem.appendChild(taskItem);
            }
            if (numUncompletedTasks > 3) {
                const moreTasksItem = document.createElement('div');
                moreTasksItem.className = 'task-item additional-task-item';
                moreTasksItem.textContent = `...and ${numUncompletedTasks - 3} more tasks`;
                projectItem.appendChild(moreTasksItem);
            }
            projectList.appendChild(projectItem);
        }
        if (activeProjects.length > 5) {
            const moreProjectsItem = document.createElement('div');
            moreProjectsItem.textContent = `...and ${activeProjects.length - 5} more projects`;
            projectList.appendChild(moreProjectsItem);
        }
    }
}