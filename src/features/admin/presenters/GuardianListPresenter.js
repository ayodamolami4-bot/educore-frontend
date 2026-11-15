/**
 * AD05 — Parents and guardians list. Search by name, phone, email or a
 * child's name, filter by account status, and open a guardian's profile.
 */
import { ApiError } from '../api/ApiError';

export class GuardianListPresenter {
  constructor(guardianModel) {
    this.model = guardianModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'loading', // loading | content | error
      rows: [],
      query: { q: '', status: 'all' },
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
      const page = await this.model.list(this.state.query);
      this._setState({ status: 'content', rows: page.items, errorText: null });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load the guardians.',
      });
    }
  }

  onRetry() {
    return this.load();
  }

  onSearch(text) {
    this._setState({ query: { ...this.state.query, q: text } });
    return this.load({ showLoading: false });
  }

  onFilterStatus(status) {
    this._setState({ query: { ...this.state.query, status } });
    return this.load({ showLoading: false });
  }

  onOpenGuardian(guardian) {
    if (this._navigation && guardian) {
      this._navigation.navigate('GuardianProfile', { guardianId: guardian.id });
    }
  }
}

export default GuardianListPresenter;
