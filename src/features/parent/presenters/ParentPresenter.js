import { errorMessage } from '../../../api/errors.js';
import { Store } from '../../../core/Store.js';

export class ParentPresenter extends Store {
  constructor(model, session) {
    super({ home: null, busy: false, error: '' });
    this.model = model;
    this.session = session;
  }

  async loadHome() {
    if (this.state.busy) return;
    this.patch({ busy: true, error: '' });
    try {
      this.patch({ home: await this.model.home() });
    } catch (error) {
      this.patch({ error: errorMessage(error) });
    } finally {
      this.patch({ busy: false });
    }
  }

  async chooseChild(context) {
    if (this.state.busy || context?.role !== 'PARENT' || !context.childId) return;
    this.patch({ busy: true, error: '' });
    try {
      await this.session.reloadContexts();
      await this.session.selectContext(context);
    } catch (error) {
      this.patch({ error: errorMessage(error) });
    } finally {
      this.patch({ busy: false });
    }
  }
}
