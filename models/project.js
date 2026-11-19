import { Task } from "./task.js";

export class Project {
    constructor(
        name, parent = null, id = crypto.randomUUID()) {
        this._name = name;
        this._parent = parent;
        this._id = id;
        this._subprojects = [];
        this._tasks = [];
    }

    get name() {
        return this._name;
    }

    set name(name) {
        this._name = name;
    }

    set parent(parent) {
        this._parent = parent;
    }

    get parent() {
        return this._parent;
    }

    get id() {
        return this._id;
    }

    get tasks() {
        return this._tasks;
    }

    get subprojects() {
        return this._subprojects;
    }

    toJSON() {
        const { _parent, ...rest } = this;
        return rest;
    }

    // static fromJSON(data, parent = null) {
    //     if (typeof data === "string") data = JSON.parse(data);
    //     const { _subprojects = [], _tasks = [], ...fields } = data;
    //     const project = new Project(fields._name, parent);
    //     Object.assign(project, fields);
    //     project._subprojects = _subprojects.map(
    //         child => Project.fromJSON(child, project)
    //     );
    //     project._tasks = _tasks.map(task => Task.fromJSON(task));
    //     return project;
    // }

    static fromJSONString(data, parent = null) {
        const { _subprojects = [], _tasks = [], ...fields } = data;
        const project = new Project(fields._name, parent);
        Object.assign(project, fields);
        project._subprojects = _subprojects.map(
            child => Project.fromJSONString(child, project)
        );
        project._tasks = _tasks.map(task => Task.fromJSON(task));
        return project;
    }

    addSubproject(project) {
        if (!(project instanceof Project)) {
            throw new Error("Subproject must be an instance of Project");
        }
        project.parent = this;
        this._subprojects.push(project);
    }

    addTask(task) {
        if (!(task instanceof Task)) {
            throw new Error("Task must be an instance of Task");
        }
        this._tasks.push(task);
    }

    parentId() {
        return this._parent ? this._parent.id : null;
    }

    getAncestors() {
        const ancestors = [];
        let current = this;
        while (current) {
            ancestors.push(current);
            current = current._parent;
        }
        return ancestors;
    }
}   