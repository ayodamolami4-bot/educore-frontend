/** Observable Presenter state; contains no React UI code. */
export class Store {
    constructor(state) {
        this.state = state;
        this.listeners = new Set();
        this.active = true;
        this.getSnapshot = () => this.state;
        this.subscribe = (listener) => {
            this.listeners.add(listener);
            return () => this.listeners.delete(listener);
        };
    }
    patch(next) {
        if (!this.active)
            return;
        this.state = { ...this.state, ...next };
        for (const listener of this.listeners)
            listener();
    }
    dispose() {
        this.active = false;
        this.listeners.clear();
    }
}
