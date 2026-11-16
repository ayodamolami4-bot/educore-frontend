/**
 * AD21 — Fee plans use immutable issue previews. A plan is created as a
 * draft; only a Principal can publish it, then a reviewed roster batch is
 * confirmed to issue the resulting invoices.
 */
import { ApiError } from '../api/ApiError';

export class FeePlansPresenter {
  constructor(feePlanModel, role) {
    this.model = feePlanModel;
    this.role = role ?? '';
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'loading',
      plans: [],
      notice: null,
      errorText: null,
      busyId: null,
      savingPlan: false,
      previewBatch: null,
      confirmingBatch: false,
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
      this._setState({
        status: 'content',
        plans: page.items,
        errorText: null,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not load the fee plans.',
      });
    }
  }

  onRetry() {
    return this.load();
  }

  async createPlan(fields) {
    if (this.state.savingPlan) return false;
    const classIds = Array.isArray(fields.classIds) ? [...new Set(fields.classIds.filter(Boolean))] : [];
    if (!fields.termId) {
      this._setState({ notice: null, errorText: 'Choose the academic term this fee plan belongs to.' });
      return false;
    }
    if (classIds.length === 0) {
      this._setState({ notice: null, errorText: 'Pick at least one current class.' });
      return false;
    }
    if (!String(fields.title ?? '').trim() || String(fields.title).trim().length < 3) {
      this._setState({ notice: null, errorText: 'Enter a fee-plan name with at least three characters.' });
      return false;
    }
    const amountMinor = Number(fields.amountMinor);
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      this._setState({ notice: null, errorText: 'Enter a valid amount in kobo.' });
      return false;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fields.dueOn ?? ''))) {
      this._setState({ notice: null, errorText: 'Enter the due date in YYYY-MM-DD format.' });
      return false;
    }

    this._setState({ savingPlan: true, notice: null, errorText: null });
    try {
      await this.model.create({
        termId: fields.termId,
        name: String(fields.title).trim(),
        classIds,
        lines: [{
          description: String(fields.title).trim(),
          amountMinor,
          quantity: 1,
        }],
        dueOn: fields.dueOn,
        partialAllowed: Boolean(fields.partialAllowed),
      });
      this._setState({
        savingPlan: false,
        notice: 'Draft fee plan created. A Principal must publish it before invoices can be issued.',
      });
      await this.load({ showLoading: false });
      return true;
    } catch (error) {
      this._setState({
        savingPlan: false,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The fee plan was not saved.',
      });
      return false;
    }
  }

  async issuePlan(plan) {
    if (this.state.busyId || !plan?.id) return;
    if (plan.state === 'DRAFT' || plan.status === 'Draft') {
      if (this.role !== 'PRINCIPAL') {
        this._setState({ errorText: 'This draft needs publication by a Principal before the issue preview can be prepared.' });
        return;
      }
      this._setState({ busyId: plan.id, notice: null, errorText: null });
      try {
        await this.model.publish(plan.id, plan.version);
      } catch (error) {
        this._setState({
          busyId: null,
          errorText: error instanceof ApiError ? error.message : error?.message ?? 'The fee plan could not be published.',
        });
        return;
      }
    } else {
      this._setState({ busyId: plan.id, notice: null, errorText: null });
    }

    try {
      const detail = await this.model.byId(plan.id);
      if (detail.state !== 'PUBLISHED') {
        throw new Error('The fee plan is not published. Ask a Principal to publish it first.');
      }
      const preview = await this.model.issuePreview(plan.id, { classIds: detail.classIds });
      this._setState({
        busyId: null,
        previewBatch: {
          ...preview,
          issuedCount: (preview.rows ?? []).filter((row) => row.action === 'ISSUE').length,
          alreadyIssuedCount: (preview.rows ?? []).filter((row) => row.action === 'ALREADY_ISSUED').length,
          planName: detail.name,
        },
        notice: 'Review the exact student roster before confirming invoice creation.',
        errorText: null,
      });
      await this.load({ showLoading: false });
    } catch (error) {
      this._setState({
        busyId: null,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The invoice preview could not be prepared.',
      });
    }
  }

  async confirmPreview() {
    const batch = this.state.previewBatch;
    if (!batch?.id || this.state.confirmingBatch) return false;
    if (!Number.isSafeInteger(batch.version) || batch.version < 1) {
      this._setState({ errorText: 'The issue preview is missing its version. Refresh the plan and prepare a new preview.' });
      return false;
    }
    this._setState({ confirmingBatch: true, errorText: null, notice: null });
    try {
      await this.model.confirmIssue(batch.id, batch.version);
      const issued = batch.issuedCount ?? 0;
      this._setState({
        confirmingBatch: false,
        previewBatch: null,
        notice: 'Invoice batch confirmed. ' + issued + ' new invoice' + (issued === 1 ? '' : 's') + ' issued; previously issued students were skipped.',
      });
      await this.load({ showLoading: false });
      return true;
    } catch (error) {
      this._setState({
        confirmingBatch: false,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The invoice batch could not be confirmed.',
      });
      return false;
    }
  }

  clearPreview() {
    if (this.state.confirmingBatch) return;
    this._setState({ previewBatch: null, notice: null, errorText: null });
  }
}

export default FeePlansPresenter;
