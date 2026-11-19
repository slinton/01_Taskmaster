
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

    toJSON() {
        return {
            _rootProject: this._rootProject,
            _selectedProjectId: this._selectedProject?._id ?? null,
        };
    }

    // static fromJSON(data) {
    //     if (typeof data === "string") data = JSON.parse(data);
    //     const root = Project.fromJSON(data._rootProject);
    //     const tree = new ProjectTree(root);
    //     tree._selectedProject = tree._findById(data._selectedProjectId) ?? root;
    //     return tree;
    // }

    static fromJSONString(json) {
        const data = typeof json === "string" ? JSON.parse(json) : json;
        const root = Project.fromJSONString(data._rootProject);
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