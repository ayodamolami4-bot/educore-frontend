/**
 * AD02 — Student list. THE reference MVP presenter.
 *
 * The flow the lecturer described, file by file:
 *   1. VIEW (views/screens/StudentListView.js) passes the search text to
 *      onSearchChange() below.
 *   2. PRESENTER (this file) shows a loading state and asks the MODEL for
 *      matching students.
 *   3. MODEL (models/StudentModel.js) calls the Java API and returns results.
 *   4. PRESENTER updates the screen state; the VIEW displays the students.
 *
 * The View never calls fetch and never formats data. The Model never touches
 * React. This file is the only place that decides WHAT the screen shows.
 */
import { ApiError } from '../api/ApiError';
import { toCsv, shareOrCopyCsv } from '../api/csv';

const SEARCH_DEBOUNCE_MS = 350;

// Export columns cover the whole demo record; the live Java API returns the
// same fields for GET /students (guardian + DOB included).
const EXPORT_COLUMNS = [
  { key: 'admissionNumber', header: 'admissionNumber' },
  { key: 'fullName', header: 'fullName' },
  { key: 'classLabel', header: 'class' },
  { key: 'department', header: 'department' },
  { key: 'gender', header: 'gender' },
  { key: 'dateOfBirth', header: 'dateOfBirth' },
  { key: 'status', header: 'status' },
  { key: 'guardianName', header: 'guardianName' },
  { key: 'guardianPhone', header: 'guardianPhone' },
  { key: 'guardianEmail', header: 'guardianEmail' },
];

export class StudentListPresenter {
  constructor(studentModel) {
    this.model = studentModel;
    this._render = null;
    this._alive = false;
    this._searchTimer = null;
    this._requestSeq = 0; // ignore stale responses when searches overlap
    this.initialState = {
      status: 'loading', // loading | content | empty | error
      students: [],
      total: 0,
      page: 1,
      pages: 1,
      loadingMore: false,
      errorText: null,
      filters: {
        search: '',
        session: '2026/2027',
        classId: 'all',
        department: 'all',
        status: 'all', // show withdrawn/graduated too — the badge tells them apart
      },
      exporting: false,
      exportNotice: null,
    };
    this.state = this.initialState;
  }

  /** Called once by the View on mount. */
  attach(render, navigation) {
    this._render = render;
    this._navigation = navigation;
    this._alive = true;
  }

  /** Called once by the View on unmount — stops all pending updates. */
  detach() {
    this._alive = false;
    if (this._searchTimer) clearTimeout(this._searchTimer);
  }

  _setState(patch) {
    if (!this._alive || !this._render) return;
    this.state = { ...this.state, ...patch };
    this._render(this.state);
  }

  async load() {
    await this._fetchStudents({ showLoading: true });
  }

  onPullToRefresh() {
    return this._fetchStudents({ showLoading: true });
  }

  /** Step 1 of the flow: the View hands over the search text. */
  onSearchChange(text) {
    this._setState({ filters: { ...this.state.filters, search: text } });

    if (this._searchTimer) clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => {
      // Step 2 begins: show loading, ask the Model for matches.
      this._fetchStudents({ showLoading: true });
    }, SEARCH_DEBOUNCE_MS);
  }

  onFilterChange(key, value) {
    this._setState({ filters: { ...this.state.filters, [key]: value } });
    this._fetchStudents({ showLoading: true });
  }

  onEndReached() {
    if (this.state.loadingMore || this.state.page >= this.state.pages) return;
    this._fetchStudents({ showLoading: false, append: true, page: this.state.page + 1 });
  }

  /** Steps 2–4 of the flow: Model call → state update → View renders. */
  async _fetchStudents({ showLoading, append = false, page = 1 }) {
    const seq = ++this._requestSeq;
    if (showLoading) {
      this._setState(append ? {} : { status: 'loading', errorText: null });
    } else {
      this._setState({ loadingMore: true });
    }

    try {
      const f = this.state.filters;
      const result = await this.model.list({
        q: f.search || undefined,
        session: f.session,
        classId: f.classId === 'all' ? undefined : f.classId,
        department: f.department === 'all' ? undefined : f.department,
        status: f.status,
        page,
      });
      if (seq !== this._requestSeq || !this._alive) return; // a newer search won

      const students = append ? [...this.state.students, ...result.items] : result.items;
      const status = students.length === 0 ? 'empty' : 'content';
      this._setState({
        status,
        students,
        total: result.total,
        page: result.page,
        pages: result.pages,
        loadingMore: false,
        errorText: null,
      });
    } catch (error) {
      if (seq !== this._requestSeq || !this._alive) return;
      const errorText =
        error instanceof ApiError ? error.message : 'Could not load students. Pull to retry.';
      this._setState({
        status: this.state.students.length > 0 ? 'content' : 'error',
        errorText,
        loadingMore: false,
      });
    }
  }

  /** View forwards row taps; the Presenter owns routing, not the View. */
  onOpenStudent(student) {
    if (this._navigation) {
      this._navigation.navigate('StudentProfile', { studentId: student.id });
    }
  }

  onEnrolStudent() {
    if (this._navigation) this._navigation.navigate('StudentForm');
  }

  /**
   * Export the CURRENT filtered list as CSV and hand it to the share sheet.
   * Uses the raw student rows (guardian, DOB…) rather than the display cards.
   */
  async onExport() {
    this._setState({ exporting: true, exportNotice: null });
    try {
      const f = this.state.filters;
      const page = await this.model.listFull({
        q: f.search || undefined,
        session: f.session,
        classId: f.classId === 'all' ? undefined : f.classId,
        department: f.department === 'all' ? undefined : f.department,
        status: f.status === 'all' ? undefined : f.status,
        page: 1,
      });
      const rows = page.items || [];
      if (rows.length === 0) {
        this._setState({
          exportNotice: 'Nothing to export — the current filters match no students.',
        });
        return;
      }
      const csv = toCsv(rows, EXPORT_COLUMNS);
      const notice = await shareOrCopyCsv('students.csv', csv);
      this._setState({ exportNotice: `${notice} (${rows.length} students)` });
    } catch {
      this._setState({ exportNotice: 'The export failed — try again in a moment.' });
    } finally {
      if (this._alive) this._setState({ exporting: false });
    }
  }
}

export default StudentListPresenter;
