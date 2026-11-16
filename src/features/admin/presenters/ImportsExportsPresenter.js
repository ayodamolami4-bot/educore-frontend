/**
 * AD33 — Academic CSV imports use the backend's reviewed batch workflow:
 * template → preview/validate → relationships and duplicate review → confirm.
 * Export remains a local CSV of the authorised list endpoint data.
 */
import { ApiError } from '../api/ApiError';
import { toCsv, shareOrCopyCsv } from '../api/csv';

const itemsOf = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

function studentExportRow(student) {
  const enrolments = itemsOf(student.enrolments);
  const current = enrolments.find((item) => !item.endsOn) ?? enrolments[0] ?? {};
  return {
    id: student.id,
    admissionNumber: student.admissionNumber ?? '',
    fullName: student.fullName ?? '',
    class: [current.level, current.arm].filter(Boolean).join(' ') || current.classLabel || '',
    status: student.status ?? '',
  };
}

const STUDENT_EXPORT_COLUMNS = [
  { key: 'id', header: 'id' },
  { key: 'admissionNumber', header: 'admissionNumber' },
  { key: 'fullName', header: 'fullName' },
  { key: 'class', header: 'currentClass' },
  { key: 'status', header: 'status' },
];

const TEACHER_EXPORT_COLUMNS = [
  { key: 'id', header: 'id' },
  { key: 'staffNumber', header: 'staffNumber' },
  { key: 'name', header: 'fullName' },
  { key: 'phone', header: 'phone' },
  { key: 'email', header: 'email' },
  { key: 'status', header: 'status' },
];

export class ImportsExportsPresenter {
  constructor(dataTransferModel, studentModel, teacherModel, calendarModel) {
    this.model = dataTransferModel;
    this.students = studentModel;
    this.teachers = teacherModel;
    this.calendar = calendarModel;
    this._render = null;
    this._alive = false;
    this.initialState = {
      kind: 'STUDENTS',
      status: 'loading',
      template: null,
      sessions: [],
      sessionId: '',
      batches: [],
      pasted: '',
      preview: null,
      previewing: false,
      confirming: false,
      exporting: false,
      notice: null,
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

  async load() {
    this._setState({ status: 'loading', errorText: null });
    try {
      const [template, sessionOptions, batchPage] = await Promise.all([
        this.model.template(this.state.kind),
        this.calendar.sessionOptions(),
        this.model.batches(),
      ]);
      const sessions = itemsOf(sessionOptions.sessions);
      const sessionId = sessionOptions.activeSessionId ??
        sessions.find((session) => session.active)?.id ??
        sessions[0]?.id ??
        '';
      this._setState({
        status: 'content',
        template,
        sessions,
        sessionId: this.state.sessionId || sessionId,
        batches: batchPage.items,
        errorText: null,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not load the import tools.',
      });
    }
  }

  async setKind(kind) {
    const selected = String(kind ?? '').toUpperCase();
    if (!['STUDENTS', 'TEACHERS'].includes(selected)) return;
    this._setState({
      kind: selected,
      template: null,
      pasted: '',
      preview: null,
      notice: null,
      errorText: null,
      status: 'loading',
    });
    try {
      const template = await this.model.template(selected);
      this._setState({ template, status: 'content' });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not load the selected import template.',
      });
    }
  }

  setSession(sessionId) {
    this._setState({ sessionId, preview: null, notice: null });
  }

  setPasted(pasted) {
    this._setState({ pasted, preview: null, notice: null, errorText: null });
  }

  async preview() {
    if (this.state.previewing || !this.state.template) return false;
    if (!this.state.sessionId) {
      this._setState({ errorText: 'Choose the academic session for this import.' });
      return false;
    }
    const csv = String(this.state.pasted ?? '').trim();
    if (!csv) {
      this._setState({ errorText: 'Paste a CSV with the exact template column names and at least one data row.' });
      return false;
    }
    this._setState({ previewing: true, errorText: null, notice: null, preview: null });
    try {
      const result = await this.model.createPreview({
        kind: this.state.kind,
        sessionId: this.state.sessionId,
        csv,
        columnMapping: null,
      });
      this._setState({
        preview: result,
        notice: 'The backend has validated the submitted rows. Review every row before confirming the import.',
      });
      return true;
    } catch (error) {
      this._setState({
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The import preview could not be created.',
      });
      return false;
    } finally {
      if (this._alive) this._setState({ previewing: false });
    }
  }

  async refreshPreview() {
    const id = this.state.preview?.id;
    if (!id) return;
    try {
      const preview = await this.model.batchById(id);
      this._setState({ preview, errorText: null });
    } catch (error) {
      this._setState({
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not refresh the import status.',
      });
    }
  }

  async confirm({ relationshipsVerified, duplicatesReviewed, reason }) {
    const preview = this.state.preview;
    if (!preview?.id || this.state.confirming) return false;
    if (!relationshipsVerified || !duplicatesReviewed) {
      this._setState({ errorText: 'Confirm both guardian/account relationship verification and duplicate review.' });
      return false;
    }
    if (String(reason ?? '').trim().length < 10) {
      this._setState({ errorText: 'Enter an import approval reason of at least ten characters.' });
      return false;
    }
    if (!Number.isSafeInteger(preview.version) || preview.version < 1) {
      this._setState({ errorText: 'The import preview version is missing. Refresh the preview before confirming.' });
      return false;
    }
    const rows = itemsOf(preview.rows);
    if (!rows.length || rows.some((row) => row.state !== 'READY')) {
      this._setState({ errorText: 'Every row must be READY before confirmation. Fix the CSV and create a new preview for rows with errors.' });
      return false;
    }

    this._setState({ confirming: true, errorText: null, notice: null });
    try {
      const result = await this.model.confirmBatch(preview.id, {
        relationshipsVerified: true,
        duplicatesReviewed: true,
        reason,
      }, preview.version);
      const fresh = await this.model.batchById(preview.id);
      this._setState({
        confirming: false,
        preview: fresh,
        notice: result.state === 'QUEUED'
          ? 'Import accepted and queued. Refresh the batch to see processing results.'
          : 'Import confirmation accepted. Refresh the batch to see processing results.',
      });
      return true;
    } catch (error) {
      this._setState({
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The import could not be confirmed.',
      });
      return false;
    } finally {
      if (this._alive) this._setState({ confirming: false });
    }
  }

  async onExport() {
    if (this.state.exporting) return;
    this._setState({ exporting: true, exportNotice: null, errorText: null });
    try {
      if (this.state.kind === 'STUDENTS') {
        const records = await this.students.listAll();
        const rows = records.map(studentExportRow);
        if (!rows.length) {
          this._setState({ exportNotice: 'There are no student records to export.' });
          return;
        }
        const csv = toCsv(rows, STUDENT_EXPORT_COLUMNS);
        const notice = await shareOrCopyCsv('educore-students.csv', csv);
        this._setState({ exportNotice: notice + ' (' + rows.length + ' students)' });
      } else {
        const rows = await this.teachers.listAll();
        if (!rows.length) {
          this._setState({ exportNotice: 'There are no teacher records to export.' });
          return;
        }
        const csv = toCsv(rows, TEACHER_EXPORT_COLUMNS);
        const notice = await shareOrCopyCsv('educore-teachers.csv', csv);
        this._setState({ exportNotice: notice + ' (' + rows.length + ' teachers)' });
      }
    } catch (error) {
      this._setState({
        exportNotice: null,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The export failed.',
      });
    } finally {
      if (this._alive) this._setState({ exporting: false });
    }
  }

  async onRetry() {
    return this.load();
  }
}

export default ImportsExportsPresenter;
