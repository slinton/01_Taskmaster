//
// View for overall project properties
//
import { Toolbar } from "../views/toolbar.js";
import { ProjectTreeView } from "../views/project-tree-view.js";
import { ProjectPropertiesView } from "../views/project-properties-view.js";
import { SubprojectsView } from "../views/subprojects-view.js";
import { TasksView } from "../views/tasks-view.js";
import { MessageView } from "../views/message-view.js";
import { eventBus } from "../services/event-bus.js";

export class HomePage {
    constructor(containerId = 'home-page') {
        this._container = document.querySelector(`#${containerId}`);

        this._projectTreeView = new ProjectTreeView('project-tree-view');
        this._projectPropertiesView = new ProjectPropertiesView('project-properties-view');
        this._subprojectsView = new SubprojectsView('subprojects-view');
        this._tasksView = new TasksView('tasks-view');
        this._messageView = new MessageView('message-view');

        eventBus.subscribe('show-page', (pageId, _publisher) => {
            console.log(`Received show-page, id = ${pageId}`);
            console.log()
            if (this._container.id === pageId) {
                console.log('HomePage showing');
                this._container.classList.remove('hidden');
            }
            else {
                console.log('HomePage hiding');
                this._container.classList.add('hidden')
            }
        });
    }
}