/**
 * AD13 — One class and its student list. Opened from the AD12 class list
 * (route param classId) or straight from the Academics menu, where a class
 * picker sheet appears first.
 */
import { ApiError } from '../api/ApiError';

export class ClassWorkspacePresenter {
  constructor(structureModel) {
    this.model = structureModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'loading', // loading | content | error | picking
      cls: null,
      students: [],
      subjects: [],
      classOptions: [],
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

  /** No class chosen yet — load the options for the picker sheet. */
  async pickClass() {
    this._setState({ status: 'picking', errorText: null });
    try {
      const page = await this.model.classes();
      this._setState({ classOptions: page.items, status: 'picking' });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText:
          error instanceof ApiError ? error.message : 'Could not load the class list.',
      });
    }
  }

  async load(classId, { showLoading } = {}) {
    if (showLoading !== false) this._setState({ status: 'loading', errorText: null });
    try {
      const workspace = await this.model.classWorkspace(classId);
      this._setState({
        status: 'content',
        cls: workspace.class,
        students: workspace.students,
        subjects: workspace.subjects,
        errorText: null,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load the class.',
      });
    }
  }

  onRetry() {
    return this.load(this.state.cls ? this.state.cls.classLabel : null);
  }
}

export default ClassWorkspacePresenter;
