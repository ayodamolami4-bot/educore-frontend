/**
 * AD21 — Set fees and issue bills. List the plans, create a plan for a
 * class, then issue its bills (one invoice per ACTIVE student in the class).
 */
import { ApiError } from '../api/ApiError';

export class FeePlansPresenter {
  constructor(feePlanModel) {
    this.model = feePlanModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'loading', // loading | content | error
      plans: [],
      notice: null,
      errorText: null,
      busyId: null, // plan currently being issued
      savingPlan: false, // new-plan form submission
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
      const page = await this.model.list();
      this._setState({ status: 'content', plans: page.items, errorText: null });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load the fee plans.',
      });
    }
  }

  onRetry() {
    return this.load();
  }

  /**
   * Create one Draft plan per selected class from the form fields (the View
   * owns the inputs). Duplicate class+name is refused by the API per class,
   * so a multi-class create can partly succeed — the notice says what happened.
   */
  async createPlan(fields) {
    if (this.state.savingPlan) return;
    const classes = Array.isArray(fields.classes) ? fields.classes : [];
    if (classes.length === 0) {
      this._setState({ notice: null, errorText: 'Pick at least one class for the plan.' });
      return;
    }
    if (!fields.title || !fields.title.trim()) {
      this._setState({ notice: null, errorText: 'Name the plan, e.g. First Term tuition.' });
      return;
    }
    if (!fields.amount || fields.amount <= 0) {
      this._setState({ notice: null, errorText: 'Enter the amount in naira.' });
      return;
    }
    this._setState({ savingPlan: true, notice: null, errorText: null });
    const created = [];
    let lastError = null;
    for (const classLabel of classes) {
      try {
        await this.model.create({ classLabel, title: fields.title, amount: fields.amount });
        created.push(classLabel);
      } catch (error) {
        lastError = error instanceof ApiError ? error.message : 'The plan was not saved.';
      }
    }
    if (created.length === 0) {
      this._setState({ savingPlan: false, notice: null, errorText: lastError });
      return;
    }
    const skipped = classes.length - created.length;
    this._setState({
      savingPlan: false,
      notice:
        `Draft plan created for ${created.length} class${created.length === 1 ? '' : 'es'}` +
        (skipped > 0 ? ` — ${skipped} skipped (already had this plan)` : '') +
        '. Issue it when ready.',
    });
    await this.load({ showLoading: false });
  }

  /** Issue the bills for one plan: one invoice per ACTIVE student in the class. */
  async issuePlan(plan) {
    if (this.state.busyId) return;
    this._setState({ busyId: plan.id, notice: null, errorText: null });
    try {
      const result = await this.model.issue(plan.id);
      this._setState({
        busyId: null,
        notice: `Bills issued to ${result.issued} student${
          result.issued === 1 ? '' : 's'
        } — see Student invoices.`,
      });
      await this.load({ showLoading: false });
    } catch (error) {
      this._setState({
        busyId: null,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'The bills were not issued.',
      });
    }
  }
}

export default FeePlansPresenter;
