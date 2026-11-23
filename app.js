import { ProjectTree } from "./models/project-tree.js";
import { Project } from "./models/project.js";
import { Task } from "./models/task.js";
import { Toolbar } from "./views/toolbar.js";
import { ProjectTreeView } from "./views/project-tree-view.js";
import { ProjectPropertiesView } from "./views/project-properties-view.js";
import { SubprojectsView } from "./views/subprojects-view.js";
import { TasksView } from "./views/tasks-view.js";
import { MessageView } from "./views/message-view.js";
import { eventBus } from "./services/event-bus.js";
import { localStorageService } from "./services/local-storage-service.js";


class App {
    constructor() {
        // Create views
        this._toolbar = new Toolbar('toolbar');
        this._projectTreeView = new ProjectTreeView('project-tree-view');
        this._projectPropertiesView = new ProjectPropertiesView('project-properties-view');
        this._subprojectsView = new SubprojectsView('subprojects-view');
        this._tasksView = new TasksView('tasks-view');
        this._messageView = new MessageView('message-view');

        // Read tree from local storage if it exists
        const projectTree = localStorageService.read() ?? ProjectTree.createDefaultTree();
        eventBus.publish('project-tree-changed', projectTree, this);
    }

    createProject(i = 0, depth = 3) {
        const project = i == 0 ? new Project('Home') : new Project(`Project ${i}`);
        try {
            project.addTask(new Task(`Task ${i}1`));
            project.addTask(new Task(`Task ${i}2`));
            if (depth > 1) {
                project.addSubproject(this.createProject(2*i + 1, depth - 1));
                project.addSubproject(this.createProject(2*i + 2, depth - 1));
            }
        } catch (error) {
            console.error(error);
            this._messageView.showMessage(error);
            return;
        }
        return project;
    }

    start() {
    }
}

const app = new App();
app.start();