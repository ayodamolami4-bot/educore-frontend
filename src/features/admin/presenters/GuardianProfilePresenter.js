/**
 * AD06 — One guardian: contact details, the state of their Parent app
 * account, and the children linked to them. Tapping a child opens that
 * student's profile.
 */
import { ApiError } from '../api/ApiError';

export class GuardianProfilePresenter {
  constructor(guardianModel) {
    this.model = guardianModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this._guardianId = null;
    this.initialState = {
      status: 'loading', // loading | content | error
      guardian: null,
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

  async load(guardianId) {
    this._guardianId = guardianId;
    this._setState({ status: 'loading', errorText: null });
    try {
      const guardian = await this.model.byId(guardianId);
      if (!guardian) {
        this._setState({
          status: 'error',
          errorText: 'This guardian could not be found — the link may be stale.',
        });
        return;
      }
      this._setState({ status: 'content', guardian });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load this guardian.',
      });
    }
  }

  onRetry() {
    return this.load(this._guardianId);
  }

  onOpenChild(child) {
    if (this._navigation && child) {
      this._navigation.navigate('StudentProfile', { studentId: child.studentId });
    }
  }
}

export default GuardianProfilePresenter;
