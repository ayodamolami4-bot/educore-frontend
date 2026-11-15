/**
 * AD22 — Student invoices. Same list pattern as StudentListPresenter with
 * finance-specific filters; balances and statuses come from the backend.
 */
import { ApiError } from '../api/ApiError';

const SEARCH_DEBOUNCE_MS = 350;

export class InvoiceListPresenter {
  constructor(financeModel) {
    this.model = financeModel;
    this._render = null;
    this._alive = false;
    this._searchTimer = null;
    this._requestSeq = 0;
    this.initialState = {
      status: 'loading', // loading | content | empty | error
      invoices: [],
      total: 0,
      page: 1,
      pages: 1,
      loadingMore: false,
      errorText: null,
      filters: { search: '', status: 'all', session: '2026/2027' },
    };
    this.state = this.initialState;
  }

  attach(render, navigation) {
    this._render = render;
    this._navigation = navigation;
    this._alive = true;
  }

  detach() {
    this._alive = false;
    if (this._searchTimer) clearTimeout(this._searchTimer);
  }

  _setState(patch) {
    if (!this._alive || !this._render) return;
    this.state = { ...this.state, ...patch };
    this._render(this.state);
  }

  async load() {
    await this._fetch({ showLoading: true });
  }

  onPullToRefresh() {
    return this._fetch({ showLoading: true });
  }

  onSearchChange(text) {
    this._setState({ filters: { ...this.state.filters, search: text } });
    if (this._searchTimer) clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this._fetch({ showLoading: true }), SEARCH_DEBOUNCE_MS);
  }

  onFilterChange(key, value) {
    this._setState({ filters: { ...this.state.filters, [key]: value } });
    this._fetch({ showLoading: true });
  }

  onEndReached() {
    if (this.state.loadingMore || this.state.page >= this.state.pages) return;
    this._fetch({ showLoading: false, append: true, page: this.state.page + 1 });
  }

  onOpenInvoice(invoice) {
    if (this._navigation) this._navigation.navigate('InvoiceDetail', { invoiceId: invoice.id });
  }

  async _fetch({ showLoading, append = false, page = 1 }) {
    const seq = ++this._requestSeq;
    if (showLoading) {
      this._setState(append ? {} : { status: 'loading', errorText: null });
    } else {
      this._setState({ loadingMore: true });
    }
    try {
      const f = this.state.filters;
      const result = await this.model.invoices({
        q: f.search || undefined,
        status: f.status === 'all' ? undefined : f.status,
        session: f.session,
        page,
      });
      if (seq !== this._requestSeq || !this._alive) return;
      const invoices = append ? [...this.state.invoices, ...result.items] : result.items;
      this._setState({
        status: invoices.length === 0 ? 'empty' : 'content',
        invoices,
        total: result.total,
        page: result.page,
        pages: result.pages,
        loadingMore: false,
        errorText: null,
      });
    } catch (error) {
      if (seq !== this._requestSeq || !this._alive) return;
      this._setState({
        status: this.state.invoices.length > 0 ? 'content' : 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load invoices.',
        loadingMore: false,
      });
    }
  }
}

export default InvoiceListPresenter;
