import { Task } from "./task.js";

export const ProjectState = Object.freeze({
    NOT_STARTED: 'Not Started',
    ACTIVE: 'Active',
    PAUSED: 'Paused',
    COMPLETED: 'Completed',
    ARCHIVED: 'Archived',
    IDEA: 'Idea'
});

export class Project {
    constructor(
        name, parent = null, id = crypto.randomUUID()) {
        this._name = name;
        this._parent = parent;
        this._id = id;
        this._subprojects = [];
        this._tasks = [];
        this._state = ProjectState.NOT_STARTED;
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

    get state() {
        return this._state;
    }

    set state(state) {
        this._state = state;
    }

    // Convert the Project instance to a plain object suitable for JSON serialization
    toJSON() {
        const { _parent, ...rest } = this;
        return rest;
    }

    // Convert from a plain object to a Project instance, including its subprojects and tasks
    static fromObject(data, parent = null) {
        const { _subprojects = [], _tasks = [], ...fields } = data;
        const project = new Project(fields._name, parent);
        Object.assign(project, fields);
        project._subprojects = _subprojects.map(
            child => Project.fromObject(child, project)
        );
        project._tasks = _tasks.map(task => Task.fromObject(task));
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

    hasImmediateTasks() {
        return this._tasks.length > 0;
    }

    // Get count of tasks in this project and its descendants
    getTaskCount(filter = () => true) {
        let count = this._tasks.filter(filter).length;
        for (const subproject of this._subprojects) {
            count += subproject.getTaskCount(filter);
        }
        return count;
    }

    getCompletionDescription() {
        const total = this.getTaskCount();
        const complete = this.getTaskCount(task => task.completed);
        return `${complete} of ${total} tasks complete`;
    }

    getAllSubprojects(filter = () => true) {
        const subprojects = [];
        for (const subproject of this._subprojects) {
            if (!filter(subproject)) continue;
            subprojects.push(subproject);
            subprojects.push(...subproject.getAllSubprojects(filter));
        }
        return subprojects;
    }

    getAllTasks(filter = () => true) {
        const tasks = [];
        for (const task of this._tasks) {
            if (filter(task)) {
                tasks.push(task);
            }
        }
        for (const subproject of this._subprojects) {
            tasks.push(...subproject.getAllTasks(filter));
        }
        return tasks;
    }

    checkCompletedStatus() {
        const completed = this.getTaskCount() > 0 && this.getTaskCount(task => !task.completed) === 0;
        this.state = completed ? ProjectState.COMPLETED : ProjectState.ACTIVE;
    }

    static createDummyProject(i = 0, depth = 3) {
        const project = i == 0 ? new Project('Home') : new Project(`Project ${i}`);
        try {
            project.addTask(new Task(`Task ${i}1`));
            project.addTask(new Task(`Task ${i}2`));
            if (depth > 1) {
                project.addSubproject(this.createDummyProject(2*i + 1, depth - 1));
                project.addSubproject(this.createDummyProject(2*i + 2, depth - 1));
            }
        } catch (error) {
            console.error(error);
            this._messageView.showMessage(error);
            return;
        }
        return project;
    }

    sortTasksByUncompleted() {
        const uncompletedTasks = this._tasks.filter(task => !task.completed);
        const completedTasks = this._tasks.filter(task => task.completed);
        this._tasks = [...uncompletedTasks, ...completedTasks];
    }

    sortSubprojectsByUncompleted() {
        const uncompletedSubprojects = this._subprojects.filter(subproject => subproject.state !== ProjectState.COMPLETED);
        const completedSubprojects = this._subprojects.filter(subproject => subproject.state === ProjectState.COMPLETED);
        this._subprojects = [...uncompletedSubprojects, ...completedSubprojects];
    }
}   