/**
 * AD26 — Preview promotion or completion (Presenter). A preview computes
 * who would promote / repeat / graduate from the official marks; the office
 * reviews it row by row, adjusts decisions and saves them. Validating and
 * confirming belong to AD27.
 */
import { ApiError } from '../api/ApiError';

export class PromotionPreviewPresenter {
  constructor(promotionModel, structureModel) {
    this.model = promotionModel;
    this.structureModel = structureModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'loading', // loading | content | error
      previews: [],
      classOptions: [],
      preview: null, // the opened preview with rows
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
      const [page, classesPage] = await Promise.all([
        this.model.previews(),
        this.structureModel.classes(),
      ]);
      this._setState({
        status: 'content',
        previews: page.items,
        classOptions: classesPage.items,
        errorText: null,
      });
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

  /** Compute a fresh preview for a class from the official marks. */
  async buildPreview(classLabel) {
    if (this.state.saving) return;
    this._setState({ saving: true, notice: null, errorText: null });
    try {
      const result = await this.model.createPreview({ classLabel });
      this._setState({
        saving: false,
        previews: result.existing ? this.state.previews : [...this.state.previews, result.preview],
        preview: result.preview,
        notice: result.existing
          ? `${classLabel} already has a preview — opened it for you.`
          : `${classLabel} preview computed — review each student, then save your decisions.`,
      });
    } catch (error) {
      this._setState({
        saving: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'The preview could not be computed.',
      });
    }
  }

  async open(previewId) {
    this._setState({ saving: true, notice: null, errorText: null });
    try {
      const result = await this.model.previewById(previewId);
      this._setState({ saving: false, preview: result.preview });
    } catch (error) {
      this._setState({
        saving: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'Could not open the preview.',
      });
    }
  }

  closePreview() {
    this._setState({ preview: null });
  }

  /** Local decision change — saved in one pass with saveDecisions(). */
  setDecision(studentId, decision) {
    const preview = this.state.preview;
    if (!preview || preview.status === 'Confirmed') return;
    const rows = preview.rows.map((r) =>
      String(r.studentId) === String(studentId) ? { ...r, decision } : r,
    );
    this._setState({
      preview: {
        ...preview,
        rows,
        summary: {
          promote: rows.filter((r) => r.decision === 'Promote').length,
          repeat: rows.filter((r) => r.decision === 'Repeat').length,
          graduate: rows.filter((r) => r.decision === 'Graduate').length,
        },
      },
    });
  }

  async saveDecisions() {
    const preview = this.state.preview;
    if (!preview || this.state.saving) return;
    this._setState({ saving: true, notice: null, errorText: null });
    try {
      const result = await this.model.saveDecisions(preview.id, {
        decisions: preview.rows.map((r) => ({ studentId: r.studentId, decision: r.decision })),
      });
      // What saving actually does: the class's outcomes are recorded. Students
      // only MOVE when AD27 confirms — JSS1 A/B/C then become JSS2, and so on.
      // The notice no longer suggests which class to compute next: the office
      // picks the next class themselves, and naming one was more distracting
      // than helpful.
      this._setState({
        saving: false,
        preview: result.preview,
        previews: this.state.previews.map((p) => (p.id === result.preview.id ? result.preview : p)),
        notice:
          `Decisions saved for ${result.preview.classLabel} — students move up (or repeat, or ` +
          `graduate) only when this preview is confirmed in "Approve promotion and graduation".`,
      });
    } catch (error) {
      this._setState({
        saving: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'The decisions were not saved.',
      });
    }
  }
}

export default PromotionPreviewPresenter;
