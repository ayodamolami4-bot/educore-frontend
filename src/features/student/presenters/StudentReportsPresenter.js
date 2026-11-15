/**
 * StudentReportsPresenter — ST09 (results list) + ST10 (report card). The
 * list page shows the student's published report cards; the detail page shows
 * one card's subjects, scores, average and position. ST10 also offers an
 * export (POST /exports) the student can request.
 */
import { ApiError } from '../../admin/api/ApiError';

export class StudentReportsPresenter {
  constructor(studentModel) {
    this.model = studentModel;
    this._render = null;
    this._alive = false;
    this.initialState = {
      status: 'loading',
      items: [],
      report: null, // the opened card (ST10)
      exporting: false,
      exportNotice: null,
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

  /** ST09 — the student's report cards. */
  async load(studentId) {
    this._setState({ status: 'loading', errorText: null });
    try {
      const page = await this.model.reports(studentId, { page: 1 });
      this._setState({ status: 'content', items: page.items || [] });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load your results.',
      });
    }
  }

  /** ST10 — open one report card. */
  async open(studentId, reportId) {
    this._setState({ status: 'loading', errorText: null, report: null });
    try {
      const report = await this.model.reportById(studentId, reportId);
      this._setState({ status: 'content', report });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not open this report card.',
      });
    }
  }

  /** ST10 — request a report-card export. */
  async exportReport(studentId, reportId) {
    if (this.state.exporting) return;
    this._setState({ exporting: true, exportNotice: null });
    try {
      await this.model.exportReport({ studentId, reportId, format: 'pdf' });
      this._setState({
        exporting: false,
        exportNotice: 'Export requested — check your downloads shortly.',
      });
    } catch (error) {
      this._setState({
        exporting: false,
        exportNotice:
          error instanceof ApiError ? error.message : 'The export could not be requested.',
      });
    }
  }

  closeReport() {
    this._setState({ report: null });
  }

  onRetry(studentId) {
    return this.load(studentId);
  }
}

export default StudentReportsPresenter;
