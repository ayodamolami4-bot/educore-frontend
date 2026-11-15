/** Observable Presenter state; contains no React UI code. */
export class Store {
  state;
  listeners = new Set();
  active = true;
  constructor(state) {
    this.state = state;
  }
  getSnapshot = () => this.state;
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  patch(next) {
    if (!this.active) return;
    this.state = { ...this.state, ...next };
    for (const listener of this.listeners) listener();
  }
  dispose() {
    this.active = false;
    this.listeners.clear();
  }
}
