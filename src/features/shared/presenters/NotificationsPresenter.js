import { Store } from '../../../core/Store';
import { errorMessage } from '../../../api/errors';
export class NotificationsPresenter extends Store {
  model;
  schoolId;
  generation = 0;
  constructor(model, schoolId) {
    super({ items: [], loading: false, more: false, cursor: null, error: '', unread: false });
    this.model = model;
    this.schoolId = schoolId;
  }
  async load(append = false) {
    if (append && (this.state.loading || !this.state.more)) return;
    const generation = ++this.generation;
    this.patch({
      loading: true,
      error: '',
      ...(!append ? { items: [], cursor: null, more: false } : {}),
    });
    try {
      const result = await this.model.notifications({
        schoolId: this.schoolId,
        category: this.state.category,
        unread: this.state.unread || undefined,
        cursor: append ? (this.state.cursor ?? undefined) : undefined,
      });
      if (generation !== this.generation) return;
      const merged = append ? [...this.state.items, ...result.items] : result.items;
      this.patch({
        items: [...new Map(merged.map((n) => [n.id, n])).values()],
        cursor: result.nextCursor,
        more: result.hasMore,
      });
    } catch (error) {
      if (generation === this.generation) this.patch({ error: errorMessage(error) });
    } finally {
      if (generation === this.generation) this.patch({ loading: false });
    }
  }
  async filter(category, unread = false) {
    this.patch({ category, unread });
    await this.load();
  }
  async markRead(item) {
    try {
      await this.model.markRead(item.id);
      this.patch({
        items: this.state.items
          .map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n))
          .filter((n) => !this.state.unread || !n.readAt),
      });
    } catch (error) {
      this.patch({ error: errorMessage(error) });
    }
  }
}
