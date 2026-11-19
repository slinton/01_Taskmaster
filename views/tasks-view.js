//
// TasksView displays all tasks for the selected project
//
import { Project } from '../models/project.js';
import { Task } from '../models/task.js';
import { eventBus } from '../services/event-bus.js';


export class TasksView {
    constructor(containerId = 'tasks-view') {
        // Task view element
        this.container = document.querySelector(`#${containerId}`);
        this.container.tabIndex = 0; // Make the container focusable for key events
        this.container.addEventListener('keydown', (event) => {
            this.onKeyDown(event);
        });

        // Task data
        this.project = null;
        this.selectedTask = null;
        this.selectedDiv = null;

        // Event bus for handling project and task events
        eventBus.subscribe('project-selected', (project, _subscriber) => {
            this.project = project;
            this.render();
        });
        eventBus.subscribe('project-edited', (project, _subscriber) => {
            if (this.project && this.project === project) {
                this.render();
            }
        });
        eventBus.subscribe('task-edited', (task, _subscriber) => {
            this.render();
        });
        eventBus.subscribe('project-tree-changed', (projectTree, _subscriber) => {
            this.project = projectTree.selectedProject;
            this.render();
        });
    }

    // Handle key down events for task navigation and reordering
    onKeyDown(event) {
        if (!this.project || !this.selectedTask) return;
        const currentIndex = this.project.tasks.indexOf(this.selectedTask);
        if (event.key === 'ArrowUp' && currentIndex > 0) {
            this.handleArrowKey(event, currentIndex, currentIndex - 1);
        } else if (event.key === 'ArrowDown' && currentIndex < this.project.tasks.length - 1) {
            this.handleArrowKey(event, currentIndex, currentIndex + 1);
        }
    }

    // Handle arrow key navigation and reordering of tasks
    handleArrowKey(event, currentIndex, newIndex) {
        event.preventDefault();
        // Swap order of tasks if Alt key is pressed
        if (event.altKey) {
            //console.log('Alt key pressed with ArrowUp');
            const tasks = this.project.tasks;
            [tasks[currentIndex], tasks[newIndex]] = [tasks[newIndex], tasks[currentIndex]];
            eventBus.publish('project-edited', this.project, this);
        }
        // Move selection
        else {
            this.selectedTask = this.project.tasks[newIndex];
            this.render();
        }
        this.container.focus({ preventScroll: true });
    }

    // Input to create a new task
    createTaskInput() {
        // DEBUG

        const newTaskInput = document.createElement('input');
        newTaskInput.type = 'text';
        newTaskInput.placeholder = 'Add a new task';
        newTaskInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && newTaskInput.value.trim() !== '') {
                const newTask = new Task(newTaskInput.value.trim());
                this.project.tasks.push(newTask);
                newTaskInput.value = '';
                eventBus.publish('project-edited', this.project, this);
            }
        });
        return newTaskInput;
    }

    // Create a div element for a single task
    createTaskCheckbox(task, project, context) {
        const taskCheckbox = document.createElement('input');
        taskCheckbox.type = 'checkbox';
        taskCheckbox.checked = task.completed;
        taskCheckbox.addEventListener('change', () => {
            task.completed = taskCheckbox.checked;
            eventBus.publish('task-edited', task, this);
        });
        return taskCheckbox;
    }

    // Create the input field for the task name
    createTaskNameInput(task, project, context) {
        const taskNameInput = document.createElement('input');
        taskNameInput.type = 'text';
        taskNameInput.value = task.name;
        taskNameInput.addEventListener('blur', () => {
            task.name = taskNameInput.value;
            eventBus.publish('project-edited', project, context);
        });
        taskNameInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                taskNameInput.blur();
            }
        });
        return taskNameInput;
    }

    // Create the delete button for a task
    createDeleteButton(task, project, context) {
        // Delete button with icon
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'icon-button delete-button';
        deleteButton.setAttribute('aria-label', 'Delete task');
        deleteButton.setAttribute('title', 'Delete task');
        deleteButton.addEventListener('click', () => {
            const index = project.tasks.indexOf(task);
            if (index > -1) {
                project.tasks.splice(index, 1);
                eventBus.publish('project-edited', project, context);
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
    createTaskDiv(task, project, context) {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'task';
        if (context.selectedTask === task) {
            taskDiv.classList.add('selected');
            context.selectedDiv = taskDiv;
        }
        // Select the task when clicked
        taskDiv.addEventListener('click', () => {
            context.selectedTask = task;
            if (context.selectedDiv) {
                context.selectedDiv.classList.remove('selected');
            }
            context.selectedDiv = taskDiv;
            taskDiv.classList.toggle('selected', true);
        });
        return taskDiv;
    }

    // Create the list of tasks for the current project
    createTaskList() {
        // List of tasks
        const itemsList = document.createElement('div');
        itemsList.className = 'items-list';
        this.container.appendChild(itemsList);

        this.project.tasks.forEach(task => {

            // Task container
            const taskDiv = this.createTaskDiv(task, this.project, this);

            // Checkbox for task completion
            const taskCheckbox = this.createTaskCheckbox(task, this.project, this);
            taskDiv.appendChild(taskCheckbox);

            // Input field for task name
            const taskNameInput = this.createTaskNameInput(task, this.project, this);
            taskDiv.appendChild(taskNameInput);

            // Delete buttonn
            const deleteButton = this.createDeleteButton(task, this.project, this);
            taskDiv.appendChild(deleteButton);

            itemsList.appendChild(taskDiv);
        });

        return itemsList;
    }

    // Render the tasks view
    render() {
        console.log(`TasksView: Rendering`);
        this.container.replaceChildren();

        // Header
        const header = document.createElement('h2');
        header.textContent = 'Tasks';
        this.container.appendChild(header);

        // Empty project
        if (!this.project) {
            const noProjectMessage = document.createElement('p');
            noProjectMessage.textContent = 'No project selected';
            this.container.appendChild(noProjectMessage);
            return;
        }

        // New task input
        const newTaskInput = this.createTaskInput();
        this.container.appendChild(newTaskInput);

        // List of tasks
        const itemsList = this.createTaskList();
        this.container.appendChild(itemsList);
    }
}