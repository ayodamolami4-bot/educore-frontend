/**
 * AD34 — School change history (Presenter). One list, filterable by
 * category; every entry says who did it, when, and exactly what changed.
 */
import { ApiError } from '../api/ApiError';

export const AUDIT_CATEGORIES = ['All', 'Staff', 'Records', 'Academics', 'Finance'];

export class AuditTrailPresenter {
  constructor(auditModel) {
    this.model = auditModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'loading', // loading | content | error
      rows: [],
      category: 'All',
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
      const page = await this.model.list(
        this.state.category === 'All' ? {} : { category: this.state.category },
      );
      this._setState({ status: 'content', rows: page.items, errorText: null });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load the change history.',
      });
    }
  }

  onRetry() {
    return this.load();
  }

  onFilterCategory(category) {
    this._setState({ category });
    return this.load({ showLoading: false });
  }
}

export default AuditTrailPresenter;
