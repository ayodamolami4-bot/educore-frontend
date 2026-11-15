/**
 * AD28 — School announcements. Demonstrates the design system's SAFE
 * SUBMISSION cycle in full: draft , saving , accepted | failed, inline
 * validation before submit, and no double submits while saving.
 * Publish/archive then update the list from the backend response.
 */
import { ApiError } from '../api/ApiError';

export class NoticesPresenter {
  constructor(noticesModel) {
    this.model = noticesModel;
    this._render = null;
    this._alive = false;
    this.initialState = {
      status: 'loading', // loading | content | empty | error
      notices: [],
      errorText: null,
      // Composer (create notice) safe-submission state machine:
      composer: {
        state: 'draft', // draft | saving | accepted | failed
        title: '',
        body: '',
        audience: 'ALL', // ALL | ROLE | CLASS
        errorText: null,
        validationErrors: {},
      },
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

  _setComposer(patch) {
    this._setState({ composer: { ...this.state.composer, ...patch } });
  }

  async load() {
    this._setState({ status: 'loading', errorText: null });
    try {
      const result = await this.model.list();
      this._setState({
        status: result.items.length === 0 ? 'empty' : 'content',
        notices: result.items,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load notices.',
      });
    }
  }

  onPullToRefresh() {
    return this.load();
  }

  //  Composer (create a notice)
  onComposerChange(field, value) {
    this._setComposer({ [field]: value });
  }

  /** Inline validation: first error wins; the View focuses that field. */
  validateComposer() {
    const errors = {};
    if (!this.state.composer.title.trim()) errors.title = 'Give the notice a title.';
    if (!this.state.composer.body.trim()) errors.body = 'Write the message families will read.';
    return errors;
  }

  async submitNotice() {
    const { composer } = this.state;
    if (composer.state === 'saving') return; // no repeated submit while saving

    const validationErrors = this.validateComposer();
    if (Object.keys(validationErrors).length > 0) {
      this._setComposer({ validationErrors });
      return;
    }

    this._setComposer({ state: 'saving', validationErrors: {}, errorText: null });
    try {
      await this.model.create({
        title: composer.title.trim(),
        body: composer.body.trim(),
        audience: composer.audience,
      });
      this._setComposer({ state: 'accepted' });
      await this.load(); // the accepted notice appears once the backend confirms
    } catch (error) {
      this._setComposer({
        state: 'failed',
        errorText: error instanceof ApiError ? error.message : 'The notice was not accepted.',
      });
    }
  }

  resetComposer() {
    this._setComposer({
      state: 'draft',
      title: '',
      body: '',
      audience: 'ALL',
      errorText: null,
      validationErrors: {},
    });
  }

  //  Row actions
  async publishNotice(notice) {
    await this._rowAction(() => this.model.publish(notice.id));
  }

  async archiveNotice(notice) {
    await this._rowAction(() => this.model.archive(notice.id));
  }

  async _rowAction(action) {
    try {
      await action();
      await this.load();
    } catch {
      // Keep the list as-is; the View shows the failure text from state.errorText.
      this._setState({ errorText: 'The action was not accepted. Try again.' });
    }
  }
}

export default NoticesPresenter;
