/** Observable Presenter state; contains no React UI code. */
export class Store<T> {
  private listeners = new Set<() => void>();
  protected active = true;
  constructor(protected state: T) {}
  getSnapshot = (): T => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  protected patch(next: Partial<T>): void {
    if (!this.active) return;
    this.state = { ...this.state, ...next };
    for (const listener of this.listeners) listener();
  }
  dispose(): void {
    this.active = false;
    this.listeners.clear();
  }
}
