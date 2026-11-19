//
// View for displaying messages
//
import { eventBus } from "../services/event-bus.js";

export class MessageView {
    constructor(containerId = "message-view") {
        this.container = document.getElementById(containerId);
        eventBus.subscribe('message', (message, _subscriber) => {
            this.showMessage(message);
        });
    }

    showMessage(message) {
        const msg = message;
        this.container.textContent = msg;
    }
}