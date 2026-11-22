
import { Project } from './project.js';

export class ProjectTree {
    constructor(rootProject) {
        this._rootProject = rootProject;
        this._selectedProject = rootProject;
    }

    get rootProject() {
        return this._rootProject;
    }

    set selectedProject(project) {
        this._selectedProject = project;
    }

    get selectedProject() {
        return this._selectedProject;
    }

    // Convert the ProjectTree instance to a plain object suitable for JSON serialization
    toJSON() {
        return {
            _rootProject: this._rootProject,
            _selectedProjectId: this._selectedProject?._id ?? null,
        };
    }

    // Convert form a plain object to a ProjectTree instance
    static fromObject(data) {
        const root = Project.fromObject(data._rootProject);
        const tree = new ProjectTree(root);
        tree._selectedProject = tree._findById(data._selectedProjectId) ?? root;
        return tree;
    }

    // Search the tree for the project with this id
    _findById(id, project = this.rootProject) {
        if (project.id === id) return project;
        for (const child of project._subprojects) {
            const found = this._findById(id, child);
            if (found) return found;
        }
        return null;
    }
}