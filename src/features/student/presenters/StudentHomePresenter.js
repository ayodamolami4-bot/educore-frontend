/**
 * StudentHomePresenter — ST01 (home) + ST02 (my class/subjects). The home
 * screen reads the learner overview (name, class, subjects, open assignments,
 * latest report) and renders a quick dashboard. The class page lists the
 * subjects. Both pages use the same endpoint so the home screen can deep-link
 * into the class page without a second fetch.
 */
import { ApiError } from '../../admin/api/ApiError';

export class StudentHomePresenter {
  constructor(studentModel) {
    this.model = studentModel;
    this._render = null;
    this._alive = false;
    this.initialState = {
      status: 'loading', // loading | content | error
      overview: null,
      errorText: null,
    };
    this.state = this.initialState;
  }

  attach(render) {
    this._render = render;
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

  async load(studentId) {
    this._setState({ status: 'loading', errorText: null });
    try {
      const overview = await this.model.overview(studentId);
      this._setState({ status: 'content', overview });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load your home page.',
      });
    }
  }

  onRetry(studentId) {
    return this.load(studentId);
  }
}

export default StudentHomePresenter;
