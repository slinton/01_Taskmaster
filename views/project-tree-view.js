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

export class ProjectTreeView {
    constructor(containerId = "project-tree-view", projectTree) {
        this._projectTree = projectTree;
        this._container = document.getElementById(containerId);
        this._expandedProjects = new Set();

        // eventBus.subscribe('project-selected', (project, _publisher) => {
        //     this._projectTree.selectedProject = project;
        //     this.render();
        // });
        // eventBus.subscribe('project-edited', (_project, _publisher) => {
        //     this.render();
        // });
        eventBus.subscribe('project-tree-changed', (projectTree, _publisher) => {
            this._projectTree = projectTree;
            this._expandedProjects.clear();
            this._expandedProjects.add(projectTree.rootProject);
            this.render();
        });
    }

    render() {
        console.log('ProjectTreeView: Rendering');
        this._container.replaceChildren();

        const header = document.createElement('h1');
        header.textContent = 'Project Tree';
        this._container.append(header);

        if (!this._projectTree || !this._projectTree.rootProject) {
            return;
        }

        const ancestors = this._projectTree.selectedProject ? this._projectTree.selectedProject.getAncestors() : [];
        this._container.appendChild(this.createProjectNode(this._projectTree.rootProject, ancestors));
    }

    createProjectNode(project, ancestors) {
        const hasChildren = project.subprojects.length > 0;

        // Create a container for the project node
        const node = document.createElement('div');
        node.className = 'project-node';
        node.classList.toggle('expanded', this._expandedProjects.has(project) || ancestors.includes(project));

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
                    this._expandedProjects.add(project);
                } else {
                    this._expandedProjects.delete(project);
                }
            });
        } else {
            // Keeps leaf names aligned with their siblings that have chevrons
            chevron.classList.add('placeholder');
        }

        const projectName = document.createElement('span');
        projectName.className = 'project-name';
        projectName.addEventListener('click', () => {
            this._projectTree.selectedProject = project;
            // eventBus.publish('project-selected', project, this);
            eventBus.publish('project-tree-changed', this._projectTree, this);
        });
        if (this._projectTree.selectedProject === project) {
            projectName.classList.add('selected');
        }
        projectName.textContent = project.name;

        row.append(chevron, projectName);
        node.append(row);

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

