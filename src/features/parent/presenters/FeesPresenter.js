import { errorMessage } from '../../../api/errors.js';
import { Store } from '../../../core/Store.js';

const emptyPage = () => ({ items: [], cursor: null, more: false, loading: false, error: '' });

export class FeesPresenter extends Store {
  constructor(model) {
    super({ invoices: emptyPage(), payments: emptyPage(), terms: [], termError: '' });
    this.model = model;
  }

  async load(kind, append = false) {
    const page = this.state[kind];
    if (page.loading || (append && !page.more)) return;
    this.patch({ [kind]: { ...(append ? page : emptyPage()), loading: true } });
    try {
      const result = await this.model.fees(kind, append ? page.cursor : undefined);
      this.patch({
        [kind]: {
          items: append ? [...page.items, ...result.items] : result.items,
          cursor: result.nextCursor,
          more: result.hasMore,
          loading: false,
          error: '',
        },
      });
    } catch (error) {
      this.patch({
        [kind]: {
          ...(append ? page : emptyPage()),
          error: errorMessage(error),
        },
      });
    }
  }

  async loadTerms() {
    try {
      this.patch({ terms: await this.model.terms(), termError: '' });
    } catch {
      this.patch({ terms: [], termError: 'Term choices are temporarily unavailable.' });
    }
  }
}
