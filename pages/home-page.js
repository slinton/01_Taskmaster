//
// View for overall project properties
//
import { Toolbar } from "../views/toolbar.js";
import { ProjectTreeView } from "../views/project-tree-view.js";
import { ProjectPropertiesView } from "../views/project-properties-view.js";
import { SubprojectsView } from "../views/subprojects-view.js";
import { TasksView } from "../views/tasks-view.js";
import { MessageView } from "../views/message-view.js";

export class HomePage {
    constructor(containerId = 'home-page') {
        this._projectTree = null;
        this._container = document.querySelector(`#${containerId}`);

        this._toolbar = new Toolbar('toolbar');
        this._projectTreeView = new ProjectTreeView('project-tree-view');
        this._projectPropertiesView = new ProjectPropertiesView('project-properties-view');
        this._subprojectsView = new SubprojectsView('subprojects-view');
        this._tasksView = new TasksView('tasks-view');
        this._messageView = new MessageView('message-view');
    }
}