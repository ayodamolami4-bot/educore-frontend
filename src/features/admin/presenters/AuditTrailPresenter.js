/**
 * AD34 — School change history. Available service streams are determined by
 * the signed-in role; filters only request streams the backend authorises.
 */
import { ApiError } from '../api/ApiError';

export class AuditTrailPresenter {
  constructor(auditModel) {
    this.model = auditModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    const domains = this.model.permittedDomains();
    this.categories = ['All', ...domains.map((domain) =>
      domain.charAt(0).toUpperCase() + domain.slice(1)
    )];
    this.initialState = {
      status: 'loading',
      rows: [],
      category: 'All',
      categories: this.categories,
      notice: null,
      errorText: null,
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
  }

  _setState(patch) {
    if (!this._alive || !this._render) return;
    this.state = { ...this.state, ...patch };
    this._render(this.state);
  }

  async load({ showLoading } = {}) {
    if (showLoading !== false) this._setState({ status: 'loading', errorText: null });
    try {
      const domain = this.state.category === 'All'
        ? undefined
        : this.state.category.toLowerCase();
      const page = await this.model.list({ domain });
      this._setState({ status: 'content', rows: page.items, errorText: null });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not load the change history.',
      });
    }
  }

  onRetry() {
    return this.load();
  }

  onFilterCategory(category) {
    if (!this.categories.includes(category)) return;
    this._setState({ category });
    return this.load({ showLoading: false });
  }
}

export default AuditTrailPresenter;
