//
// History service for managing undo and redo operations on the project tree.
//
import { eventBus } from '../services/event-bus.js';
import { ProjectTree } from '../models/project-tree.js';

export class History {
    // static #instance = null;

    constructor() {
        // if (History.#instance) {
        //     return History.#instance;
        // }
        this.projectTree = null
        this.stack = [];
        this.index = -1; // index of current state

        eventBus.subscribe('project-tree-changed', (projectTree, subscriber) => {
            if (this === subscriber) return;
            this.projectTree = projectTree;
            this.push();
        });
        eventBus.subscribe('project-edited', (_project, _subscriber) => {
            this.push();
        });
        eventBus.subscribe('task-edited', (_task, _subscriber) => {
            this.push();
        });

    }

    push() {
        if (this.projectTree) {
            // Remove any redo states beyond the current index
            this.stack = this.stack.slice(0, this.index + 1);
            const state = JSON.stringify(this.projectTree ?? null);

            // Skip if nothing changed since the current state
            if (this.index >= 0 &&
                JSON.stringify(state) === JSON.stringify(this.stack[this.index])) {
                console.log(`****History: No changes detected! index = ${this.index}`);
                eventBus.publish('error', 'No changes detected in history push.');
                this.printStack();
                return; // exit early if no changes detected
            }

            this.stack.push(state);
            this.index++;
            eventBus.publish('history-changed', this.index, this);
        }
        else {
            console.log(`****History: No project tree available to push.`);
        }
    }

    canUndo() {
        return this.index > 0;
    }

    canRedo() {
        return this.index < this.stack.length - 1;
    }

    undo() {
        if (this.index > 0) {
            this.index--; // move back to previous state
            const state = this.stack[this.index]; // last saved state
            this.projectTree = ProjectTree.fromJSONString(state);
            eventBus.publish('project-tree-changed', this.projectTree, this);
            eventBus.publish('history-changed', this.index, this);
        }
        else {
            console.log(`****History: Cannot undo, already at the earliest state.`);
        }
    }

    redo() {
        if (this.index < this.stack.length - 1) {
            this.index++; // move forward to the next state
            const state = this.stack[this.index];
            this.projectTree = ProjectTree.fromJSONString(state);
            eventBus.publish('project-tree-changed', this.projectTree, this);
            eventBus.publish('history-changed', this.index, this);
        }
        else {
            console.log(`****History: Cannot redo, already at the latest state.`);
        }
    }

    printStack() {
        console.log(`\n\n*****History: Printing stack *****`);
        console.log(`History: Stack size: ${this.stack.length}. Current index: ${this.index}`);
        this.stack.forEach((state, index) => {
            console.log(`History: Stack[${index}]:`, state);
        });
        console.log('History size:', this.stack.length);
    }
}

export const history = new History();