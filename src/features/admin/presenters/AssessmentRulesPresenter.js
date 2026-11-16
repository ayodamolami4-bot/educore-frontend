/**
 * AD18 — The grading policy is adopted by the backend and is not editable.
 * The Principal approves that frozen policy on each assessment cycle and
 * opens the cycle's mark-entry window with an audited reason.
 */
import { ApiError } from '../api/ApiError';

function instantOf(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date ?? '')) ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(time ?? ''))) {
    throw new Error('Use a date in YYYY-MM-DD and a time in 24-hour HH:MM format.');
  }
  const value = new Date(date + 'T' + time + ':00+01:00');
  if (Number.isNaN(value.getTime())) throw new Error('The mark-entry date or time is invalid.');
  return value.toISOString();
}

export class AssessmentRulesPresenter {
  constructor(assessmentModel, role = '') {
    this.model = assessmentModel;
    this.role = role;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'loading',
      policy: null,
      configuration: '',
      approvalGuidance: '',
      cycles: [],
      selectedCycle: null,
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
      const [policyResponse, cycleResponse] = await Promise.all([
        this.model.policies(),
        this.model.cycles(),
      ]);
      const cycles = Array.isArray(cycleResponse?.items) ? cycleResponse.items : [];
      const selectedCycle = this.state.selectedCycle?.id
        ? await this.model.cycleById(this.state.selectedCycle.id)
        : null;
      this._setState({
        status: 'content',
        policy: policyResponse.policy ?? null,
        configuration: policyResponse.configuration ?? '',
        approvalGuidance: policyResponse.approval ?? '',
        cycles,
        selectedCycle,
        errorText: null,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not load the adopted grading policy and assessment cycles.',
      });
    }
  }

  onRetry() {
    return this.load();
  }

  async selectCycle(cycle) {
    if (!cycle?.id) return;
    this._setState({ saving: true, errorText: null, notice: null });
    try {
      const detail = await this.model.cycleById(cycle.id);
      this._setState({ selectedCycle: detail, saving: false });
    } catch (error) {
      this._setState({
        saving: false,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not open this assessment cycle.',
      });
    }
  }

  async approvePolicy(reason) {
    const cycle = this.state.selectedCycle;
    if (this.role !== 'PRINCIPAL') {
      this._setState({ errorText: 'Only a Principal can approve the adopted grading policy for an assessment cycle.' });
      return false;
    }
    if (!cycle || cycle.state !== 'DRAFT' || cycle.policyApprovedAt) {
      this._setState({ errorText: 'Only a draft cycle with an unapproved policy can be approved.' });
      return false;
    }
    const why = String(reason ?? '').trim();
    if (why.length < 5) {
      this._setState({ errorText: 'Enter an approval reason of at least five characters.' });
      return false;
    }
    const policyVersion = Number(this.state.policy?.version);
    if (!Number.isSafeInteger(policyVersion) || policyVersion < 1 ||
        !Number.isSafeInteger(cycle.version) || cycle.version < 1) {
      this._setState({ errorText: 'The policy or cycle version is missing. Refresh and try again.' });
      return false;
    }

    this._setState({ saving: true, errorText: null, notice: null });
    try {
      await this.model.approvePolicy(cycle.id, { policyVersion, reason: why }, cycle.version);
      this._setState({ saving: false, notice: 'The adopted grading policy has been approved for this cycle.' });
      await this.load();
      // load() re-reads the complete cycle, including the approval timestamp and new version.
      return true;
    } catch (error) {
      this._setState({
        saving: false,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The policy approval was not saved.',
      });
      return false;
    }
  }

  async openCycle(fields) {
    const cycle = this.state.selectedCycle;
    if (this.role !== 'PRINCIPAL') {
      this._setState({ errorText: 'Only a Principal can open an assessment cycle.' });
      return false;
    }
    if (!cycle || !['DRAFT', 'OPEN'].includes(cycle.state)) {
      this._setState({ errorText: 'Only a draft or open cycle can be updated. Published cycles require the correction workflow.' });
      return false;
    }
    if (!Number.isSafeInteger(cycle.version) || cycle.version < 1) {
      this._setState({ errorText: 'The cycle version is missing. Refresh before opening the window.' });
      return false;
    }

    const why = String(fields.reason ?? '').trim();
    if (why.length < 5) {
      this._setState({ errorText: 'Enter a reason of at least five characters.' });
      return false;
    }

    try {
      const opensAt = instantOf(fields.opensOn, fields.opensTime);
      const closesAt = instantOf(fields.closesOn, fields.closesTime);
      if (new Date(closesAt) <= new Date(opensAt)) {
        this._setState({ errorText: 'The closing time must be later than the opening time.' });
        return false;
      }
      this._setState({ saving: true, errorText: null, notice: null });
      await this.model.openCycle(cycle.id, { opensAt, closesAt, reason: why }, cycle.version);
      this._setState({ saving: false, notice: 'The mark-entry window is open. The policy approval is recorded on the cycle.' });
      await this.load();
      const current = this.state.cycles.find((item) => item.id === cycle.id);
      if (current) this._setState({ selectedCycle: current });
      return true;
    } catch (error) {
      this._setState({
        saving: false,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The assessment cycle could not be opened.',
      });
      return false;
    }
  }
}

export default AssessmentRulesPresenter;
