/**
 * AD32 — One complaint. Public replies and private office notes are entries
 * in the same backend record, with role-safe visibility. Every mutation uses
 * the complaint version and reloads the accepted record.
 */
import { ApiError } from '../api/ApiError';

export class ComplaintDetailPresenter {
  constructor(complaintsModel) {
    this.model = complaintsModel;
    this._render = null;
    this._alive = false;
    this._caseId = null;
    this.initialState = {
      status: 'loading',
      complaint: null,
      replies: [],
      notes: [],
      errorText: null,
      saving: null,
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
      const complaint = await this.model.byId(caseId);
      this._setState({
        status: 'content',
        complaint,
        replies: complaint.replies ?? [],
        notes: complaint.notes ?? [],
        errorText: null,
      });
      return complaint;
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not load this complaint.',
      });
      return null;
    }
  }

  onRetry() {
    return this.load(this._caseId);
  }

  async onReply(text) {
    const trimmed = String(text ?? '').trim();
    const complaint = this.state.complaint;
    if (!trimmed || this.state.saving || !complaint) return false;
    if (['Resolved', 'Closed'].includes(complaint.status)) {
      this._setState({ errorText: 'A resolved or closed case cannot receive a public reply. Request a review through the permitted case workflow.' });
      return false;
    }
    this._setState({ saving: 'reply', errorText: null });
    try {
      await this.model.addReply(this._caseId, { body: trimmed }, complaint.version);
      await this.load(this._caseId);
      return true;
    } catch (error) {
      this._setState({
        saving: null,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The reply could not be sent.',
      });
      return false;
    } finally {
      if (this._alive) this._setState({ saving: null });
    }
  }

  async onAddNote(text) {
    const trimmed = String(text ?? '').trim();
    const complaint = this.state.complaint;
    if (!trimmed || this.state.saving || !complaint) return false;
    this._setState({ saving: 'note', errorText: null });
    try {
      await this.model.addInternalNote(this._caseId, { body: trimmed }, complaint.version);
      await this.load(this._caseId);
      return true;
    } catch (error) {
      this._setState({
        saving: null,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The note could not be saved.',
      });
      return false;
    } finally {
      if (this._alive) this._setState({ saving: null });
    }
  }

  async onStateAction(action, reason) {
    const complaint = this.state.complaint;
    if (this.state.saving || !complaint) return false;
    const trimmed = String(reason ?? '').trim();
    if (trimmed.length < 5) {
      this._setState({ errorText: 'Enter a reason of at least five characters for the case history.' });
      return false;
    }
    if (action === 'close' && complaint.status !== 'Resolved') {
      this._setState({ errorText: 'Resolve the case before closing it.' });
      return false;
    }
    if (complaint.status === 'Closed') {
      this._setState({ errorText: 'Closed cases cannot be reopened or changed.' });
      return false;
    }

    this._setState({ saving: action, errorText: null });
    try {
      await this.model.stateAction(this._caseId, { action, reason: trimmed }, complaint.version);
      await this.load(this._caseId);
      return true;
    } catch (error) {
      this._setState({
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The case could not be updated.',
      });
      return false;
    } finally {
      if (this._alive) this._setState({ saving: null });
    }
  }
}

export default ComplaintDetailPresenter;
