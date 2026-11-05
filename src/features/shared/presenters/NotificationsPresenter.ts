import { Store } from '../../../core/Store';
import type { SharedModel } from '../models/SharedModel';
import type { NotificationCategory, NotificationItem } from '../../../api/contracts';
import { errorMessage } from '../../../api/errors';

interface NotificationsState {
  items: NotificationItem[];
  loading: boolean;
  more: boolean;
  cursor: string | null;
  error: string;
  category?: NotificationCategory;
  unread: boolean;
}
export class NotificationsPresenter extends Store<NotificationsState> {
  private generation = 0;
  constructor(
    private model: SharedModel,
    private schoolId: string,
  ) {
    super({ items: [], loading: false, more: false, cursor: null, error: '', unread: false });
  }
  async load(append = false): Promise<void> {
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
  async filter(category?: NotificationCategory, unread = false): Promise<void> {
    this.patch({ category, unread });
    await this.load();
  }
  async markRead(item: NotificationItem): Promise<void> {
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
