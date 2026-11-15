/**
 * AD19 — Review and publish results. Mark packages flow from teachers to the
 * admin; report batches are published here, which is what puts report cards
 * in the Student/Parent apps.
 */
import { ApiError } from '../api/ApiError';

export class ResultsReviewPresenter {
  constructor(resultsModel) {
    this.model = resultsModel;
    this._render = null;
    this._alive = false;
    this.initialState = {
      status: 'loading', // loading | content | error
      packages: [],
      batches: [],
      errorText: null,
      busyId: null, // row mid-action
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
      const [packages, batches] = await Promise.all([
        this.model.markPackages({ page: 1 }),
        this.model.reportBatches({ page: 1 }),
      ]);
      this._setState({
        status: 'content',
        packages: packages.items || [],
        batches: batches.items || [],
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load the results.',
      });
    }
  }

  /** Send a package back to its teacher with the reason (demo uses one). */
  async returnPackage(packageId, reason) {
    if (this.state.busyId) return;
    this._setState({ busyId: packageId, errorText: null });
    try {
      await this.model.returnPackage(packageId, { reason });
      await this.load();
    } catch (error) {
      this._setState({
        errorText:
          error instanceof ApiError ? error.message : 'The package could not be returned.',
      });
    } finally {
      if (this._alive) this._setState({ busyId: null });
    }
  }

  /** Admin signs off a submitted (or resubmitted) package — it is Approved and
      waits for its report batch to be published. Only the admin office does
      this; teachers only submit. */
  async approvePackage(packageId, note) {
    if (this.state.busyId) return;
    this._setState({ busyId: packageId, errorText: null });
    try {
      await this.model.approvePackage(packageId, { note });
      await this.load();
    } catch (error) {
      this._setState({
        errorText:
          error instanceof ApiError ? error.message : 'The package could not be approved.',
      });
    } finally {
      if (this._alive) this._setState({ busyId: null });
    }
  }

  /** Publish → report cards appear in the Student/Parent apps. */
  async publishBatch(batchId) {
    if (this.state.busyId) return;
    this._setState({ busyId: batchId, errorText: null });
    try {
      await this.model.publishBatch(batchId);
      await this.load();
    } catch (error) {
      this._setState({
        errorText: error instanceof ApiError ? error.message : 'The batch could not be published.',
      });
    } finally {
      if (this._alive) this._setState({ busyId: null });
    }
  }

  /** Draft / returned batches: the office re-checks them and sends for review. */
  async submitBatch(batchId) {
    if (this.state.busyId) return;
    this._setState({ busyId: batchId, errorText: null });
    try {
      await this.model.submitBatch(batchId);
      await this.load();
    } catch (error) {
      this._setState({
        errorText:
          error instanceof ApiError ? error.message : 'The batch could not be sent for review.',
      });
    } finally {
      if (this._alive) this._setState({ busyId: null });
    }
  }

  async reopenBatch(batchId) {
    if (this.state.busyId) return;
    this._setState({ busyId: batchId, errorText: null });
    try {
      await this.model.reopenBatch(batchId);
      await this.load();
    } catch (error) {
      this._setState({
        errorText: error instanceof ApiError ? error.message : 'The batch could not be reopened.',
      });
    } finally {
      if (this._alive) this._setState({ busyId: null });
    }
  }

  onRetry() {
    return this.load();
  }
}

export default ResultsReviewPresenter;
