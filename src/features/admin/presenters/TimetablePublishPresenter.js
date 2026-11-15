/**
 * AD15 — Review and publish the timetable. The drafts list first; tapping a
 * draft shows the whole week read-only, with validate + publish actions.
 * Publishing is confirmed in a dialog and guarded by the API.
 */
import { ApiError } from '../api/ApiError';

export class TimetablePublishPresenter {
  constructor(timetableModel) {
    this.model = timetableModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'loading', // loading | content | error
      drafts: [],
      draft: null, // set when one draft is open for review
      notice: null,
      errorText: null,
      busy: false,
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
      const page = await this.model.drafts();
      this._setState({ status: 'content', drafts: page.items, errorText: null });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load the drafts.',
      });
    }
  }

  onRetry() {
    return this.load();
  }

  async open(draftId) {
    this._setState({ status: 'loading', notice: null, errorText: null });
    try {
      const result = await this.model.draftById(draftId);
      this._setState({ status: 'content', draft: result.draft, errorText: null });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not open the draft.',
      });
    }
  }

  backToList() {
    this._setState({ draft: null, notice: null, errorText: null });
    return this.load({ showLoading: false });
  }

  /** Clash + completeness check; the API answers with the first clash if any. */
  async validate() {
    const draft = this.state.draft;
    if (!draft || this.state.busy) return;
    this._setState({ busy: true, notice: null, errorText: null });
    try {
      await this.model.validateDraft(draft.id);
      this._setState({ busy: false, notice: 'No clashes — the timetable is ready to publish.' });
    } catch (error) {
      this._setState({
        busy: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'The check did not run.',
      });
    }
  }

  async publish() {
    const draft = this.state.draft;
    if (!draft || this.state.busy) return;
    this._setState({ busy: true, notice: null, errorText: null });
    try {
      const result = await this.model.publishDraft(draft.id);
      this._setState({
        busy: false,
        draft: result.draft,
        notice: 'Published — teachers and families can see this timetable now.',
      });
      await this.load({ showLoading: false });
    } catch (error) {
      this._setState({
        busy: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'The timetable was not published.',
      });
    }
  }
}

export default TimetablePublishPresenter;
