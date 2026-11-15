/**
 * AD32 — One complaint. Shows the case, its replies to the guardian and the
 * internal notes, and the state-machine buttons (start review, resolve,
 * close). Every action posts through the Model and reloads the case.
 */
import { ApiError } from '../api/ApiError';

export class ComplaintDetailPresenter {
  constructor(complaintsModel) {
    this.model = complaintsModel;
    this._render = null;
    this._alive = false;
    this._caseId = null;
    this.initialState = {
      status: 'loading', // loading | content | error
      complaint: null,
      replies: [],
      notes: [],
      errorText: null,
      saving: null, // which action is mid-flight
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

  async load(caseId) {
    this._caseId = caseId;
    this._setState({ status: 'loading', errorText: null });
    try {
      const [complaint, replies, notes] = await Promise.all([
        this.model.byId(caseId),
        this.model.replies(caseId),
        this.model.internalNotes(caseId),
      ]);
      this._setState({
        status: 'content',
        complaint,
        replies: (replies && replies.items) || [],
        notes: (notes && notes.items) || [],
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load this complaint.',
      });
    }
  }

  onRetry() {
    return this.load(this._caseId);
  }

  /** Reply goes to the guardian (Parent app inbox). */
  async onReply(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed || this.state.saving) return;
    this._setState({ saving: 'reply', errorText: null });
    try {
      await this.model.addReply(this._caseId, { text: trimmed });
      const replies = await this.model.replies(this._caseId);
      this._setState({ saving: null, replies: (replies && replies.items) || [] });
    } catch (error) {
      this._setState({
        saving: null,
        errorText: error instanceof ApiError ? error.message : 'The reply could not be sent.',
      });
    }
  }

  /** Internal notes stay inside the office — guardians never see them. */
  async onAddNote(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed || this.state.saving) return;
    this._setState({ saving: 'note', errorText: null });
    try {
      await this.model.addInternalNote(this._caseId, { text: trimmed });
      const notes = await this.model.internalNotes(this._caseId);
      this._setState({ saving: null, notes: (notes && notes.items) || [] });
    } catch (error) {
      this._setState({
        saving: null,
        errorText: error instanceof ApiError ? error.message : 'The note could not be saved.',
      });
    }
  }

  /** State machine moves — the backend validates the transitions. */
  async onStateAction(action) {
    if (this.state.saving) return;
    this._setState({ saving: action, errorText: null });
    try {
      await this.model.stateAction(this._caseId, { action });
      await this.load(this._caseId);
    } catch (error) {
      this._setState({
        errorText: error instanceof ApiError ? error.message : 'The case could not be updated.',
      });
    } finally {
      if (this._alive) this._setState({ saving: null });
    }
  }
}

export default ComplaintDetailPresenter;
