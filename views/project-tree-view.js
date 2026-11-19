// .project-node.expanded            <- the one we're styling
//   ├─ .project-row
//   │    └─ .chevron               <- should rotate
//   └─ .project-children
//        └─ .project-node          <- a collapsed child
//             ├─ .project-row
//             │    └─ .chevron     <- must NOT rotate
//             └─ .project-children <- must stay hidden


import { eventBus } from '../services/event-bus.js';
import { Project } from '../models/project.js';
import { Task } from '../models/task.js';

export class ProjectTreeView {
    constructor(containerId = "project-tree-view", projectTree) {
        // if (!projectTree) {
        //     throw new Error('ProjectTree instance is required');
        // }
        this.projectTree = projectTree;
        this.container = document.getElementById(containerId);
        this.expandedProjects = new Set();

        // Survives re-renders, so expansion isn't lost when a project is selected
        // if (!projectTree || !projectTree.rootProject) {
        //     throw new Error('ProjectTree instance with a root project is required');
        // }
        // this.expandedProjects = new Set([projectTree.rootProject]);

        eventBus.subscribe('project-selected', (project, _subscriber) => {
            this.projectTree.selectedProject = project;
            this.render();
        });
        eventBus.subscribe('project-edited', (_project, _subscriber) => {
            this.render();
        });
        eventBus.subscribe('project-tree-changed', (projectTree, _subscriber) => {
            this.projectTree = projectTree;
            this.expandedProjects.clear();
            this.expandedProjects.add(projectTree.rootProject);
            this.render();
        });
    }

    render() {
        console.log('ProjectTreeView: Rendering');
        this.container.replaceChildren();

        const header = document.createElement('h1');
        header.textContent = 'Project Tree';
        this.container.appendChild(header);

        if (!this.projectTree || !this.projectTree.rootProject) {
            return;
        }

        const ancestors = this.projectTree.selectedProject ? this.projectTree.selectedProject.getAncestors() : [];
        this.container.appendChild(this.createProjectNode(this.projectTree.rootProject, ancestors));
    }

    createProjectNode(project, ancestors) {
        const hasChildren = project.subprojects.length > 0;

        // Create a container for the project node
        const node = document.createElement('div');
        node.className = 'project-node';
        node.classList.toggle('expanded', this.expandedProjects.has(project) || ancestors.includes(project));

        // Row: chevron + name
        const row = document.createElement('div');
        row.className = 'project-row';

        // Create the chevron element for expanding/collapsing subprojects
        const chevron = document.createElement('span');
        chevron.className = 'material-symbols-outlined chevron';
        chevron.textContent = 'chevron_right';
        chevron.setAttribute('aria-hidden', 'true');

        if (hasChildren) {
            chevron.addEventListener('click', () => {
                const isExpanded = node.classList.toggle('expanded');
                if (isExpanded) {
                    this.expandedProjects.add(project);
                } else {
                    this.expandedProjects.delete(project);
                }
            });
        } else {
            // Keeps leaf names aligned with their siblings that have chevrons
            chevron.classList.add('placeholder');
        }

        const projectName = document.createElement('span');
        projectName.className = 'project-name';
        projectName.addEventListener('click', () => {
            this.projectTree.selectedProject = project;
            eventBus.publish('project-selected', project, this);
        });
        if (this.projectTree.selectedProject === project) {
            projectName.classList.add('selected');
        }
        projectName.textContent = project.name;

        row.append(chevron, projectName);
        node.appendChild(row);

        // Children, built recursively
        if (hasChildren) {
            const children = document.createElement('div');
            children.className = 'project-children';
            project.subprojects.forEach(subproject => {
                children.appendChild(this.createProjectNode(subproject, ancestors));
            });
            node.appendChild(children);
        }

        return node;
    }
}

