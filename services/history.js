//
// History service for managing undo and redo operations on the project tree.
// Changes are saved locally and on local storage.
//
import { eventBus } from '../services/event-bus.js';
import { ProjectTree } from '../models/project-tree.js';

export class History {

    constructor() {
        this._projectTree = null
        this._stack = [];
        this._index = -1; // index of current state
       
        eventBus.subscribe('project-tree-changed', (projectTree, publisher) => {
            if (this === publisher) return;
            this._projectTree = projectTree;
            this.push();
        });
    }
      
    push() {
        if (this._projectTree) {
            // Remove any redo states beyond the current index
            this._stack = this._stack.slice(0, this._index + 1);
            const state = JSON.stringify(this._projectTree ?? null);

            // Skip if new state is unchanged
            if (this._index >= 0 &&
                JSON.stringify(state) === JSON.stringify(this._stack[this._index])) {
                console.log(`History:push No Changes; index = ${this._index}`);
                // this.printStack();
                return; 
            }

            this._stack.push(state);
            this._index++;
            console.log(`History:push; index = ${this._index}`);
            eventBus.publish('history-changed', this._index, this);
        }
        else {
            console.log(`****History: No project tree available to push.`);
        }
    }

    canUndo() {
        return this._index > 0;
    }

    canRedo() {
        return this._index < this._stack.length - 1;
    }

    undo() {
        if (this._index > 0) {
            this._index--; // move back to previous state
            const state = this._stack[this._index]; // last saved state
            this._projectTree = ProjectTree.fromObject(JSON.parse(state));
            eventBus.publish('project-tree-changed', this._projectTree, this);
            eventBus.publish('history-changed', this._index, this);
        }
        else {
            console.log(`****History: Cannot undo, already at the earliest state.`);
        }
    }

    redo() {
        if (this._index < this._stack.length - 1) {
            this._index++; // move forward to the next state
            const state = this._stack[this._index];
            this._projectTree = ProjectTree.fromObject(JSON.parse(state));
            eventBus.publish('project-tree-changed', this._projectTree, this);
            eventBus.publish('history-changed', this._index, this);
        }
        else {
            console.log(`****History: Cannot redo, already at the latest state.`);
        }
    }

    printStack() {
        console.log(`\n\n*****History: Printing stack *****`);
        console.log(`History: Stack size: ${this._stack.length}. Current index: ${this._index}`);
        this._stack.forEach((state, index) => {
            console.log(`History: Stack[${index}]:`, state);
        });
        console.log('History size:', this._stack.length);
    }
}

export const history = new History();