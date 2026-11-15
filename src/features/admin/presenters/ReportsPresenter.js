/**
 * AD20 — Reports catalogue (Presenter). The catalogue is the class report
 * batches; opening a batch (when it has a sample card) loads one learner's
 * report card. Exports are acknowledged server-side and built on-device.
 */
import { ApiError } from '../api/ApiError';

export class ReportsPresenter {
  constructor(reportsModel) {
    this.model = reportsModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'loading', // loading | content | error
      batches: [],
      report: null, // the opened learner report card
      openBatch: null,
      notice: null,
      errorText: null,
      working: false,
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
      const page = await this.model.catalogue();
      this._setState({ status: 'content', batches: page.items, errorText: null });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load the reports catalogue.',
      });
    }
  }

  onRetry() {
    return this.load();
  }

  async openReport(batch) {
    if (!batch.sampleReportId) {
      this._setState({ notice: 'Draft batches have no report cards yet — publish the batch first.' });
      return;
    }
    this._setState({ working: true, notice: null, errorText: null });
    try {
      const result = await this.model.learnerReport(batch.sampleStudentId, batch.sampleReportId);
      this._setState({ working: false, report: result.report, openBatch: batch });
    } catch (error) {
      this._setState({
        working: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'Could not open the report card.',
      });
    }
  }

  closeReport() {
    this._setState({ report: null, openBatch: null });
  }

  /** The REAL csv content, built from the data on screen: the open report
      card, or a catalogue summary when no card is open. */
  buildCsv() {
    const report = this.state.report;
    if (report) {
      const lines = [
        'Subject,CA,Exam,Total,Grade,Remark',
        ...report.subjects.map((s) =>
          [s.subject, s.caScore, s.examScore, s.total, s.grade, s.remark].join(','),
        ),
        '',
        `Student,${report.studentName}`,
        `Class,${report.classLabel}`,
        `Term,${report.termLabel}`,
        `Average,${report.average}`,
        `Position,${report.position}`,
      ];
      const fileName = `${report.classLabel}-${report.studentName}-report-card.csv`.replace(/\s+/g, '-');
      return { fileName, csv: lines.join('\n') };
    }
    const lines = [
      'Class,Term,Status,Students,Published',
      ...this.state.batches.map((b) =>
        [b.classLabel, b.termLabel, b.status, b.studentCount, b.publishedAt || ''].join(','),
      ),
    ];
    return { fileName: 'report-catalogue.csv', csv: lines.join('\n') };
  }

  async runExport(batch) {
    if (this.state.working) return;
    this._setState({ working: true, notice: null, errorText: null });
    try {
      const result = await this.model.export({
        type: 'class-report-cards',
        classLabel: batch.classLabel,
        termLabel: batch.termLabel,
      });
      this._setState({
        working: false,
        notice:
          `Export ready — ${result.rowCount} rows for ${batch.classLabel}. The CSV file is on the ` +
          'clipboard and in the share sheet: Save to Files, email it, or send it on WhatsApp.',
      });
    } catch (error) {
      this._setState({
        working: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'The export did not start.',
      });
    }
  }
}

export default ReportsPresenter;
