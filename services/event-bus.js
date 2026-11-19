export class EventBus {
    #listeners = {};

    subscribe(event, callback) {
        if (!this.#listeners[event]) {
            this.#listeners[event] = [];
        }
        this.#listeners[event].push(callback);
    }

    publish(event, data, publisher = null) {
        if (this.#listeners[event]) {
            console.log(`Event publishing: ${event}`, data);
            this.#listeners[event].forEach(callback => callback(data, publisher));
        }
    }
}

export const eventBus = new EventBus();