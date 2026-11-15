import { Store } from '../../../core/Store';
import { errorMessage } from '../../../api/errors';
export class ContextPresenter extends Store {
  session;
  constructor(session) {
    super({ selected: session.getSnapshot().context, busy: false, error: '' });
    this.session = session;
  }
  choose(context) {
    this.patch({ selected: context, error: '' });
  }
  async refresh() {
    this.patch({ busy: true, error: '' });
    try {
      await this.session.reloadContexts();
    } catch (error) {
      this.patch({ error: errorMessage(error) });
    } finally {
      this.patch({ busy: false });
    }
  }
  async continue() {
    if (this.state.busy) return;
    if (!this.state.selected) {
      this.patch({ error: 'Choose an available school and role.' });
      return;
    }
    this.patch({ busy: true, error: '' });
    try {
      await this.session.selectContext(this.state.selected);
    } catch (error) {
      this.patch({ error: errorMessage(error) });
    } finally {
      this.patch({ busy: false });
    }
  }
}
