/**
 * AD31 — Complaints list. Guardians reach the school by phone, email or in
 * person; the office logs every case here and moves it through
 * New → In review → Resolved → Closed on the detail page (AD32).
 */
import { ApiError } from '../api/ApiError';

const COMPLAINT_STATUSES = ['New', 'In review', 'Resolved', 'Closed'];

export class ComplaintsListPresenter {
  constructor(complaintsModel) {
    this.model = complaintsModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'loading', // loading | content | empty | error
      complaints: [],
      total: 0,
      errorText: null,
      filters: { status: 'all', search: '' },
      statuses: COMPLAINT_STATUSES,
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

  async load() {
    this._setState({ status: 'loading', errorText: null });
    try {
      const f = this.state.filters;
      const result = await this.model.list({
        status: f.status === 'all' ? undefined : f.status,
        q: f.search || undefined,
        page: 1,
      });
      this._setState({
        status: result.items.length === 0 ? 'empty' : 'content',
        complaints: result.items,
        total: result.total,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load the complaints.',
      });
    }
  }

  onRetry() {
    return this.load();
  }

  onSearchChange(text) {
    this._setState({ filters: { ...this.state.filters, search: text } });
    return this.load();
  }

  onFilterChange(key, value) {
    this._setState({ filters: { ...this.state.filters, [key]: value } });
    return this.load();
  }

  onOpenCase(complaint) {
    if (this._navigation) {
      this._navigation.navigate('ComplaintDetail', { caseId: complaint.id });
    }
  }
}

export default ComplaintsListPresenter;
