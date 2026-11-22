//
// View for displaying messages
//
import { eventBus } from "../services/event-bus.js";

export class MessageView {
    constructor(containerId = "message-view") {
        this._container = document.getElementById(containerId);
        eventBus.subscribe('message', (message, _publisher) => {
            this.showMessage(message);
        });
    }

    showMessage(message) {
        const msg = message;
        this._container.textContent = msg;
    }
}