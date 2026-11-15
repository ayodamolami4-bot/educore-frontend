/**
 * AD27 — Approve promotion and graduation (Presenter). Reviews the saved
 * previews, runs the final validation, and confirms — the step that actually
 * moves JSS1 A/B/C up to JSS2, keeps repeaters back, and marks graduates.
 * Confirming is final: the preview freezes and the change is audited.
 */
import { ApiError } from '../api/ApiError';
import { nextClassOf } from '../utils/validators';

export class PromotionApprovePresenter {
  constructor(promotionModel) {
    this.model = promotionModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'loading', // loading | content | error
      previews: [],
      preview: null, // the opened preview awaiting approval
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

  async load({ showLoading } = {}) {
    if (showLoading !== false) this._setState({ status: 'loading', errorText: null });
    try {
      const page = await this.model.previews();
      this._setState({ status: 'content', previews: page.items, errorText: null });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText:
          error instanceof ApiError ? error.message : 'Could not load the promotion previews.',
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
      this._setState({ busy: false, preview: result.preview });
    } catch (error) {
      this._setState({
        busy: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'Could not open the preview.',
      });
    }
  }

  backToList() {
    this._setState({ preview: null, notice: null, errorText: null });
    return this.load({ showLoading: false });
  }

  /** The final arithmetic/decision check before confirming. */
  async validate() {
    const preview = this.state.preview;
    if (!preview || this.state.busy) return;
    this._setState({ busy: true, notice: null, errorText: null });
    try {
      await this.model.validate(preview.id);
      this._setState({
        busy: false,
        notice: `${preview.classLabel}: every student has a decision — ready to confirm.`,
      });
    } catch (error) {
      this._setState({
        busy: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'The check did not run.',
      });
    }
  }

  /** THE step that moves students. Confirmed previews freeze for good. */
  async confirm() {
    const preview = this.state.preview;
    if (!preview || this.state.busy) return;
    this._setState({ busy: true, notice: null, errorText: null });
    try {
      const result = await this.model.confirm(preview.id);
      // The notice names WHERE each group went, e.g. "5 promoted to JSS2 A ·
      // 3 repeat in JSS1 A" — the summary alone left the office guessing.
      const cls = result.preview.classLabel;
      const dest = nextClassOf(cls);
      this._setState({
        busy: false,
        preview: result.preview,
        notice:
          `${cls} confirmed — ` +
          `${result.preview.summary.promote} promoted to ${dest}` +
          ` · ${result.preview.summary.repeat} repeat in ${cls}` +
          ` · ${result.preview.summary.graduate} graduate with their result slips.` +
          ' The students now show their new class everywhere.',
      });
      await this.load({ showLoading: false });
    } catch (error) {
      this._setState({
        busy: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'The preview was not confirmed.',
      });
    }
  }
}

export default PromotionApprovePresenter;
