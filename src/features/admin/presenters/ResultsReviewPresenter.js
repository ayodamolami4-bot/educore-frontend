/**
 * AD19 — Review assessment cycles, return individual subject sheets or the
 * complete class package, then publish the official report snapshots.
 */
import { ApiError } from '../api/ApiError';

function cycleLabel(cycle) {
  return [
    cycle.classLabel || 'Assigned class',
    cycle.termLabel || 'Assessment term',
    cycle.revision ? 'Revision ' + cycle.revision : '',
  ].filter(Boolean).join(' · ');
}

function instantOf(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date ?? '')) ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(time ?? ''))) {
    throw new Error('Use YYYY-MM-DD for the date and HH:MM for the time.');
  }
  const value = new Date(date + 'T' + time + ':00+01:00');
  if (Number.isNaN(value.getTime())) throw new Error('The correction deadline is invalid.');
  return value.toISOString();
}

export class ResultsReviewPresenter {
  constructor(resultsModel, role = '') {
    this.model = resultsModel;
    this.role = role;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'loading',
      cycles: [],
      selectedCycle: null,
      review: null,
      selectedSheet: null,
      busy: false,
      errorText: null,
      notice: null,
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
      const page = await this.model.cycles();
      this._setState({
        status: 'content',
        cycles: page.items.map((cycle) => ({ ...cycle, label: cycleLabel(cycle) })),
        selectedCycle: null,
        review: null,
        selectedSheet: null,
        errorText: null,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not load assessment cycles.',
      });
    }
  }

  onRetry() {
    return this.load();
  }

  async openCycle(cycle) {
    if (!cycle?.id) return;
    this._setState({ busy: true, errorText: null, notice: null });
    try {
      const review = await this.model.reviewCycle(cycle.id);
      this._setState({
        selectedCycle: cycle,
        review,
        selectedSheet: null,
        busy: false,
      });
    } catch (error) {
      this._setState({
        busy: false,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not open this assessment cycle.',
      });
    }
  }

  closeCycle() {
    this._setState({ selectedCycle: null, review: null, selectedSheet: null, notice: null, errorText: null });
  }

  selectSheet(sheet) {
    this._setState({ selectedSheet: sheet, errorText: null, notice: null });
  }

  async refresh() {
    if (!this.state.selectedCycle) return this.load();
    const cycle = this.state.selectedCycle;
    this._setState({ busy: true, errorText: null });
    try {
      const [review, page] = await Promise.all([
        this.model.reviewCycle(cycle.id),
        this.model.cycles(),
      ]);
      const current = page.items.find((item) => item.id === cycle.id) ?? cycle;
      this._setState({
        cycles: page.items.map((item) => ({ ...item, label: cycleLabel(item) })),
        selectedCycle: current,
        review,
        selectedSheet: this.state.selectedSheet
          ? review.sheets.find((sheet) => sheet.assignmentId === this.state.selectedSheet.assignmentId) ?? null
          : null,
        busy: false,
      });
    } catch (error) {
      this._setState({
        busy: false,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not refresh the cycle review.',
      });
    }
  }

  async returnSheet(reason) {
    const cycle = this.state.selectedCycle;
    const sheet = this.state.selectedSheet;
    const why = String(reason ?? '').trim();
    if (!cycle || !sheet || this.state.busy) return false;
    if (!['PRINCIPAL', 'SCHOOL_OFFICE'].includes(this.role)) {
      this._setState({ errorText: 'Your role cannot return a subject sheet.' });
      return false;
    }
    if (sheet.state !== 'SUBMITTED') {
      this._setState({ errorText: 'Only a submitted subject sheet can be returned.' });
      return false;
    }
    if (why.length < 5) {
      this._setState({ errorText: 'Enter a return reason of at least five characters.' });
      return false;
    }
    if (!Number.isSafeInteger(sheet.version) || sheet.version < 1) {
      this._setState({ errorText: 'The subject-sheet version is missing. Refresh the review.' });
      return false;
    }
    this._setState({ busy: true, errorText: null, notice: null });
    try {
      await this.model.returnSheet(cycle.id, sheet.assignmentId, why, sheet.version);
      await this.refresh();
      this._setState({ notice: 'The subject sheet was returned to its assigned teacher.' });
      return true;
    } catch (error) {
      this._setState({
        busy: false,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The subject sheet was not returned.',
      });
      return false;
    }
  }

  async returnReview(reason) {
    const cycle = this.state.selectedCycle;
    const review = this.state.review;
    const why = String(reason ?? '').trim();
    if (!cycle || !review || this.state.busy) return false;
    if (!['PRINCIPAL', 'SCHOOL_OFFICE'].includes(this.role)) {
      this._setState({ errorText: 'Your role cannot return the class package.' });
      return false;
    }
    if (review.state !== 'REVIEW') {
      this._setState({ errorText: 'Only a class package submitted for review can be returned.' });
      return false;
    }
    if (why.length < 5 || !Number.isSafeInteger(review.version) || review.version < 1) {
      this._setState({ errorText: 'Enter a return reason of at least five characters and refresh if the cycle version is missing.' });
      return false;
    }
    this._setState({ busy: true, errorText: null, notice: null });
    try {
      await this.model.returnReview(cycle.id, why, review.version);
      await this.refresh();
      this._setState({ notice: 'The class package was returned for correction.' });
      return true;
    } catch (error) {
      this._setState({
        busy: false,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The class package was not returned.',
      });
      return false;
    }
  }

  async publish(fields) {
    const cycle = this.state.selectedCycle;
    const review = this.state.review;
    if (!cycle || !review || this.state.busy) return false;
    if (this.role !== 'PRINCIPAL') {
      this._setState({ errorText: 'Only a Principal can publish report cards.' });
      return false;
    }
    if (review.state !== 'REVIEW' || !review.readyToPublish) {
      this._setState({ errorText: 'The cycle must be submitted for review and report completeness checks must pass before publishing.' });
      return false;
    }
    const remark = String(fields.principalRemark ?? '').trim();
    if (remark.length < 5) {
      this._setState({ errorText: 'Enter a Principal remark of at least five characters.' });
      return false;
    }
    if (!Number.isSafeInteger(review.version) || review.version < 1) {
      this._setState({ errorText: 'The cycle version is missing. Refresh the review.' });
      return false;
    }
    this._setState({ busy: true, errorText: null, notice: null });
    try {
      await this.model.publishCycle(cycle.id, {
        principalRemark: remark,
        nextResumptionOn: fields.nextResumptionOn,
      }, review.version);
      await this.refresh();
      this._setState({ notice: 'The Principal published the official report snapshots for this assessment cycle.' });
      return true;
    } catch (error) {
      this._setState({
        busy: false,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The report cards were not published.',
      });
      return false;
    }
  }

  async reopen(fields) {
    const cycle = this.state.selectedCycle;
    const review = this.state.review;
    if (!cycle || !review || this.state.busy) return false;
    if (this.role !== 'PRINCIPAL') {
      this._setState({ errorText: 'Only a Principal can reopen published results.' });
      return false;
    }
    const why = String(fields.reason ?? '').trim();
    if (why.length < 5 || !Number.isSafeInteger(review.version) || review.version < 1) {
      this._setState({ errorText: 'Enter a correction reason of at least five characters.' });
      return false;
    }
    try {
      const closesAt = instantOf(fields.closesOn, fields.closesTime);
      this._setState({ busy: true, errorText: null, notice: null });
      await this.model.reopenCycle(cycle.id, {
        assignmentId: this.state.selectedSheet?.assignmentId ?? null,
        reason: why,
        closesAt,
      }, review.version);
      await this.refresh();
      this._setState({ notice: 'A reasoned correction window has been opened.' });
      return true;
    } catch (error) {
      this._setState({
        busy: false,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The correction window was not opened.',
      });
      return false;
    }
  }
}

export default ResultsReviewPresenter;
