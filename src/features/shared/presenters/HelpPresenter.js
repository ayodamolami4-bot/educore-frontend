import { Store } from '../../../core/Store.js';
import { errorMessage } from '../../../api/errors.js';
export class HelpPresenter extends Store {
  constructor(model) {
    super({ loading: true, error: '', help: null });
    this.model = model;
  }
  async load(schoolCode) {
    this.patch({ loading: true, error: '' });
    try {
      this.patch({ help: await this.model.help(schoolCode) });
    } catch (error) {
      this.patch({ error: errorMessage(error) });
    } finally {
      this.patch({ loading: false });
    }
  }
}
