
export class Task {
    constructor(name, id = crypto.randomUUID()) {
        this._name = name;
        this._id = id;
        this._completed = false;
    }

    get name() {
        return this._name;
    }

    set name(value) {
        this._name = value;
    }

    get id() {
        return this._id;
    }

    get completed() {
        return this._completed;
    }

    set completed(value) {
        this._completed = value;
    }

    static fromJSON(data) {
        if (typeof data === "string") data = JSON.parse(data);
        const task = new Task(data._name, data._id);
        task._completed = data._completed ?? false;
        return task;
    }
}