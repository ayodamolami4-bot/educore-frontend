/**
 * AD27 — Approve prepared promotion batches.
 * The backend rechecks published report signatures and session completion
 * atomically when the Principal confirms the batch.
 */
import { ApiError } from '../api/ApiError';
import { previewView } from './PromotionPreviewPresenter';

const itemsOf = (value) =>
  Array.isArray(value?.items) ? value.items : Array.isArray(value) ? value : [];

export class PromotionApprovePresenter {
  constructor(promotionModel, structureModel, calendarModel) {
    this.model = promotionModel;
    this.structureModel = structureModel;
    this.calendarModel = calendarModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'loading',
      previews: [],
      preview: null,
      classes: [],
      sessions: [],
      busy: false,
      notice: null,
      errorText: null,
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

  _view(raw) {
    return previewView(raw, this.state.classes, this.state.sessions);
  }

  async load({ showLoading } = {}) {
    if (showLoading !== false) this._setState({ status: 'loading', errorText: null });
    try {
      const [page, classesPayload, sessionOptions] = await Promise.all([
        this.model.previews(),
        this.structureModel.classes(),
        this.calendarModel.sessionOptions(),
      ]);
      const classes = itemsOf(classesPayload).map((item) => ({
        ...item,
        classLabel: [item.level, item.arm].filter(Boolean).join(' ') || 'School class',
      }));
      const sessions = itemsOf(sessionOptions.sessions);
      this._setState({ classes, sessions });
      const rawPreviews = itemsOf(page);
      const details = await Promise.all(
        rawPreviews.map((item) => this.model.previewById(item.id)),
      );
      this._setState({
        status: 'content',
        previews: details.map((item) => this._view(item)),
        errorText: null,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not load promotion previews.',
      });
    }
  }

  onRetry() {
    return this.load();
  }

  async open(previewId) {
    this._setState({ busy: true, notice: null, errorText: null });
    try {
      const result = await this.model.previewById(previewId);
      this._setState({ busy: false, preview: this._view(result) });
    } catch (error) {
      this._setState({
        busy: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not open the preview.',
      });
    }
  }

  backToList() {
    this._setState({ preview: null, notice: null, errorText: null });
    return this.load({ showLoading: false });
  }

  validate() {
    const preview = this.state.preview;
    if (!preview || this.state.busy) return;
    this._setState({ busy: true, notice: null, errorText: null });
    try {
      this.model.validate(preview);
      this._setState({
        busy: false,
        notice: 'Every student has an explicit outcome and audit reason. Final confirmation will recheck the published report evidence and source session on the server.',
      });
    } catch (error) {
      this._setState({
        busy: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The preview is not ready for confirmation.',
      });
    }
  }

  async confirm() {
    const preview = this.state.preview;
    if (!preview || this.state.busy) return;
    this._setState({ busy: true, notice: null, errorText: null });
    try {
      this.model.validate(preview);
      const result = await this.model.confirm(preview);
      const updated = this._view(result);
      this._setState({
        busy: false,
        preview: updated,
        notice: `${updated.classLabel} is confirmed. The backend has applied the saved student outcomes and frozen this batch.`,
      });
      await this.load({ showLoading: false });
      this._setState({ status: 'content', preview: updated });
    } catch (error) {
      this._setState({
        busy: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The preview was not confirmed.',
      });
    }
  }
}

export default PromotionApprovePresenter;
