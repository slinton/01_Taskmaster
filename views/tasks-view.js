//
// TasksView displays all tasks for the selected project
//
import { Project } from '../models/project.js';
import { Task } from '../models/task.js';
import { eventBus } from '../services/event-bus.js';


export class TasksView {
    constructor(containerId = 'tasks-view') {
        // Task view element
        this._container = document.querySelector(`#${containerId}`);
        this._container.tabIndex = 0; // Make the container focusable for key events
        this._container.addEventListener('keydown', (event) => {
            this.onKeyDown(event);
        });

        // Task data
        this._projectTree = null;
        this._project = null;
        this._selectedTask = null;
        this._selectedDiv = null;

        eventBus.subscribe('project-tree-changed', (projectTree, _publisher) => {
            if (!projectTree) return;
            this._projectTree = projectTree;
            this._project = projectTree.selectedProject;
            this.render();
        });
    }

    // Handle key down events for task navigation and reordering
    onKeyDown(event) {
        if (!this._project || !this._selectedTask) return;
        const currentIndex = this._project.tasks.indexOf(this._selectedTask);
        if (event.key === 'ArrowUp' && currentIndex > 0) {
            this.handleArrowKey(event, currentIndex, currentIndex - 1);
        } else if (event.key === 'ArrowDown' && currentIndex < this._project.tasks.length - 1) {
            this.handleArrowKey(event, currentIndex, currentIndex + 1);
        }
    }

    // Handle arrow key navigation and reordering of tasks
    handleArrowKey(event, currentIndex, newIndex) {
        event.preventDefault();
        // Swap order of tasks if Alt key is pressed
        if (event.altKey) {
            const tasks = this._project.tasks;
            [tasks[currentIndex], tasks[newIndex]] = [tasks[newIndex], tasks[currentIndex]];
            eventBus.publish('project-tree-changed', this._projectTree, this);
        }
        // Move selection
        else {
            this._selectedTask = this._project.tasks[newIndex];
            this.render();
        }
        this._container.focus({ preventScroll: true });
    }

    // Input to create a new task
    createTaskInput() {
        const newTaskInput = document.createElement('input');
        newTaskInput.type = 'text';
        newTaskInput.placeholder = 'Add a new task';
        newTaskInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && newTaskInput.value.trim() !== '') {
                const newTask = new Task(newTaskInput.value.trim());
                this._project.addTask(newTask);
                this._project.sortTasksByUncompleted();
                this._project.checkCompletedStatus();
                newTaskInput.value = '';
                eventBus.publish('project-tree-changed', this._projectTree, this);
                newTaskInput.focus();
            }
            else if (event.key === 'Escape') {
                console.log('Escape pressed, clearing input');
                newTaskInput.value = '';
            }
        });
        newTaskInput.addEventListener('blur', () => {
            newTaskInput.value = '';
        });
        return newTaskInput;
    }

    // Create a div element for a single task
    createTaskCheckbox(task) {
        const taskCheckbox = document.createElement('input');
        taskCheckbox.type = 'checkbox';
        taskCheckbox.checked = task.completed;
        taskCheckbox.addEventListener('change', () => {
            task.completed = taskCheckbox.checked;
            this._project.sortTasksByUncompleted();
            this._project.checkCompletedStatus();
            console.log(`Task "${task.name}" completion changed to ${task.completed}`);
            eventBus.publish('project-tree-changed', this._projectTree, this);
        });
        return taskCheckbox;
    }

    // Create the input field for the task name
    createTaskNameInput(task) {
        const taskNameInput = document.createElement('input');
        taskNameInput.type = 'text';
        taskNameInput.value = task.name;
        taskNameInput.addEventListener('blur', () => {
            task.name = taskNameInput.value;
            eventBus.publish('project-tree-changed', this._projectTree, this);
        });
        taskNameInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                taskNameInput.blur();
            }
        });
        return taskNameInput;
    }

    // Create the delete button for a task
    createDeleteButton(task) {
        // Delete button with icon
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'icon-button delete-button';
        deleteButton.setAttribute('aria-label', 'Delete task');
        deleteButton.setAttribute('title', 'Delete task');
        deleteButton.addEventListener('click', () => {
            const index = this._project.tasks.indexOf(task);
            if (index > -1) {
                this._project.tasks.splice(index, 1);
                this._project.checkCompletedStatus();
                eventBus.publish('project-tree-changed', this._projectTree, this);
            }
        });
        const deleteIcon = document.createElement('span');
        deleteIcon.className = 'material-symbols-outlined danger';
        deleteIcon.setAttribute('aria-hidden', 'true');
        deleteIcon.textContent = 'delete';
        deleteButton.appendChild(deleteIcon);
        return deleteButton;
    }

    // Create a div element for a single task
    createTaskDiv(task) {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'task';
        if (this._selectedTask === task) {
            taskDiv.classList.add('selected');
            this._selectedDiv = taskDiv;
        }
        // Select the task when clicked
        taskDiv.addEventListener('click', () => {
            this._selectedTask = task;
            if (this._selectedDiv) {
                this._selectedDiv.classList.remove('selected');
            }
            this._selectedDiv = taskDiv;
            taskDiv.classList.toggle('selected', true);
            taskNameInput.select();
        });

        // Checkbox for task completion
        const taskCheckbox = this.createTaskCheckbox(task);
        taskDiv.appendChild(taskCheckbox);

        // Input field for task name
        const taskNameInput = this.createTaskNameInput(task);
        taskDiv.appendChild(taskNameInput);

        // Delete buttonn
        const deleteButton = this.createDeleteButton(task);
        taskDiv.appendChild(deleteButton);

        return taskDiv;
    }

    // Create the list of tasks for the current project
    createTaskList() {
        const itemsList = document.createElement('div');
        itemsList.className = 'items-list';
        this._container.appendChild(itemsList);

        this._project.tasks.forEach(task => {
            const taskDiv = this.createTaskDiv(task);
            itemsList.appendChild(taskDiv);
        });
        return itemsList;
    }

    // Render the tasks view
    render() {
        console.log(`TasksView: Rendering`);
        this._container.replaceChildren();

        // Header
        const header = document.createElement('h2');
        header.textContent = 'Tasks';
        this._container.appendChild(header);

        // Empty project
        if (!this._project) {
            const noProjectMessage = document.createElement('p');
            noProjectMessage.textContent = 'No project selected';
            this._container.appendChild(noProjectMessage);
            return;
        }

        // New task input
        const newTaskInput = this.createTaskInput();
        this._container.appendChild(newTaskInput);
        newTaskInput.focus();

        // List of tasks
        const itemsList = this.createTaskList();
        this._container.appendChild(itemsList);
    }
}