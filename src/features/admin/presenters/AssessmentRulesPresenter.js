/**
 * AD18 — Set exams and grading rules. One active policy per term: the CA vs
 * exam split, the pass mark, and the score each grade starts at. The server
 * checks the arithmetic; lock freezes the policy for the term.
 */
import { ApiError } from '../api/ApiError';
import { gradingArithmeticError } from '../utils/validators';

export class AssessmentRulesPresenter {
  constructor(assessmentModel) {
    this.model = assessmentModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'loading', // loading | content | error
      policy: null,
      notice: null,
      errorText: null,
      saving: false,
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
      const page = await this.model.policies();
      this._setState({ status: 'content', policy: page.items[0] || null });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load the grading rules.',
      });
    }
  }

  onRetry() {
    return this.load();
  }

  /**
   * Save the policy. The POST acts as an update while the policy is unlocked
   * — the server validates the arithmetic (weights sum to 100, grade bands
   * descend) and answers with a clear error otherwise.
   */
  async save(fields) {
    const policy = this.state.policy;
    if (!policy || this.state.saving) return;
    this._setState({ saving: true, notice: null, errorText: null });
    try {
      const result = await this.model.createPolicy(fields);
      this._setState({
        saving: false,
        policy: result.policy,
        notice: 'Grading rules saved — every report card now uses them.',
      });
    } catch (error) {
      this._setState({
        saving: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'The rules were not saved.',
      });
    }
  }

  /**
   * Lock for the term. Lock used to send only the policy id, so whatever
   * was TYPED on screen was silently ignored and a wrong set of numbers
   * still "locked" (with the old saved values). Now the on-screen values
   * run the SAME arithmetic check as save first: a wrong policy is refused
   * with its reason and nothing is locked, a changed-but-valid policy is
   * saved and then locked in one press.
   */
  async lock(fields) {
    const policy = this.state.policy;
    if (!policy || this.state.saving) return;
    const candidate = {
      caWeight: fields && fields.caWeight !== undefined ? fields.caWeight : policy.caWeight,
      examWeight: fields && fields.examWeight !== undefined ? fields.examWeight : policy.examWeight,
      passMark: fields && fields.passMark !== undefined ? fields.passMark : policy.passMark,
      grades: fields && fields.grades !== undefined ? fields.grades : policy.grades,
    };
    const problem = gradingArithmeticError(candidate);
    if (problem) {
      // Keep the typed values on screen so the admin can fix exactly the
      // number the message names. The saved policy stays unlocked.
      this._setState({ errorText: `${problem} Fix the rules before locking.` });
      return;
    }
    this._setState({ saving: true, notice: null, errorText: null });
    try {
      await this.model.createPolicy(candidate); // persists any edits made since the last save
      const result = await this.model.lockPolicy(policy.id);
      this._setState({
        saving: false,
        policy: result.policy,
        notice: 'Grading rules locked — nothing can change while marks are being entered.',
      });
    } catch (error) {
      this._setState({
        saving: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'The rules were not locked.',
      });
    }
  }

  /** The admin can unlock again — the change lands in the audit trail. */
  async unlock() {
    const policy = this.state.policy;
    if (!policy || this.state.saving) return;
    this._setState({ saving: true, notice: null, errorText: null });
    try {
      const result = await this.model.unlockPolicy(policy.id);
      this._setState({
        saving: false,
        policy: result.policy,
        notice: 'Grading rules unlocked — edit them, then lock again before marks entry.',
      });
    } catch (error) {
      this._setState({
        saving: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'The rules were not unlocked.',
      });
    }
  }
}

export default AssessmentRulesPresenter;
