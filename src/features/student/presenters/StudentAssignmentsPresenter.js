/**
 * StudentAssignmentsPresenter — ST05 (list), ST06 (detail), ST07 (prepare/
 * submit), ST08 (submission/feedback). The list page reads the student's
 * assignments; the detail page shows the brief and the student's last
 * submission; the submit page records a new submission (the latest replaces
 * any prior, so the student always sees one current submission per
 * assignment).
 */
import { ApiError } from '../../admin/api/ApiError';

export class StudentAssignmentsPresenter {
  constructor(studentModel) {
    this.model = studentModel;
    this._render = null;
    this._alive = false;
    this.initialState = {
      status: 'loading', // loading | content | error
      items: [],
      detail: null, // the opened assignment (ST06)
      submission: null, // the last submission + feedback (ST08)
      draft: '', // the student's answer in the submit box (ST07)
      submitting: false,
      notice: null,
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

  /** ST05 — the student's assignments. */
  async load(studentId) {
    this._setState({ status: 'loading', errorText: null });
    try {
      const page = await this.model.assignments(studentId, { page: 1 });
      this._setState({ status: 'content', items: page.items || [] });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load your assignments.',
      });
    }
  }

  /** ST06/ST08 — open one assignment + its last submission. */
  async open(studentId, assignmentId) {
    this._setState({ status: 'loading', errorText: null, detail: null, submission: null });
    try {
      const [assignment, sub] = await Promise.all([
        this.model.assignmentById(studentId, assignmentId),
        this.model.submissions(studentId, assignmentId),
      ]);
      const last = sub.items[0] || null;
      this._setState({
        status: 'content',
        detail: assignment,
        submission: last,
        // Pre-fill the draft with the last submission's content so a re-submit
        // is an edit, not a blank box.
        draft: last ? last.content || '' : '',
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not open this assignment.',
      });
    }
  }

  setDraft(text) {
    this._setState({ draft: text });
  }

  /** ST07 — submit the draft. The latest submission replaces any prior one. */
  async submit(studentId, assignmentId) {
    if (this.state.submitting) return;
    const draft = (this.state.draft || '').trim();
    if (!draft) {
      this._setState({ errorText: 'Add your answer before submitting.' });
      return;
    }
    this._setState({ submitting: true, errorText: null, notice: null });
    try {
      const submission = await this.model.submitAssignment(studentId, assignmentId, {
        content: draft,
      });
      // Refresh the assignment detail so the status flips to Submitted.
      const assignment = await this.model.assignmentById(studentId, assignmentId);
      this._setState({
        submitting: false,
        submission,
        detail: assignment,
        notice: 'Submitted — your teacher will see your answer.',
      });
    } catch (error) {
      this._setState({
        submitting: false,
        errorText: error instanceof ApiError ? error.message : 'The submission could not be sent.',
      });
    }
  }

  onRetry(studentId) {
    return this.load(studentId);
  }
}

export default StudentAssignmentsPresenter;
