/**
 * StudentReadPresenters — the read-only student screens. Each presenter loads
 * one endpoint and holds the result; none of these screens mutate data, so
 * each is a small load/render pair. Grouped in one file to keep the student
 * feature tidy (the assignment and reports flows are larger and live apart).
 *
 *   StudentAttendancePresenter  — ST11 (attendance)
 *   StudentNoticesPresenter     — ST12 (notices list + detail)
 *   StudentProfilePresenter     — ST13 (profile + external-results + historical)
 *   StudentLearningPresenter    — ST03 (learning materials + detail)
 *   StudentTimetablePresenter   — ST04 (timetable + calendar)
 */
import { ApiError } from '../../admin/api/ApiError';

function makePresenter(loadKey) {
  return class {
    constructor(studentModel) {
      this.model = studentModel;
      this._render = null;
      this._alive = false;
      this.initialState = {
        status: 'loading',
        data: null, // the main payload
        detail: null, // the opened row (notices/materials detail)
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
    async load(studentId) {
      this._setState({ status: 'loading', errorText: null });
      try {
        const data = await this.model[loadKey](studentId);
        this._setState({ status: 'content', data });
      } catch (error) {
        this._setState({
          status: 'error',
          errorText: error instanceof ApiError ? error.message : 'Could not load this page.',
        });
      }
    }
    onRetry(studentId) {
      return this.load(studentId);
    }
  };
}

export const StudentAttendancePresenter = makePresenter('attendance');

export class StudentNoticesPresenter {
  constructor(studentModel) {
    this.model = studentModel;
    this._render = null;
    this._alive = false;
    this.initialState = {
      status: 'loading',
      items: [],
      notice: null,
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
      const page = await this.model.notices({ page: 1 });
      this._setState({ status: 'content', items: page.items || [] });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load notices.',
      });
    }
  }
  async open(noticeId) {
    this._setState({ status: 'loading', errorText: null, notice: null });
    try {
      const notice = await this.model.noticeById(noticeId);
      this._setState({ status: 'content', notice });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not open this notice.',
      });
    }
  }
  closeNotice() {
    this._setState({ notice: null });
  }
  onRetry() {
    return this.load();
  }
}

export class StudentProfilePresenter {
  constructor(studentModel) {
    this.model = studentModel;
    this._render = null;
    this._alive = false;
    this.initialState = {
      status: 'loading',
      profile: null,
      externalResults: [],
      historicalReports: [],
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
  /** ST13 — profile + academic history + external results + historical
      attachments, fetched in parallel so the page loads in one round trip. */
  async load(studentId) {
    this._setState({ status: 'loading', errorText: null });
    try {
      const [profile, externalResults, historicalReports] = await Promise.all([
        this.model.profile(studentId),
        this.model.externalResults(studentId),
        this.model.historicalReports(studentId),
      ]);
      this._setState({
        status: 'content',
        profile,
        externalResults,
        historicalReports,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load your profile.',
      });
    }
  }
  onRetry(studentId) {
    return this.load(studentId);
  }
}

export class StudentLearningPresenter {
  constructor(studentModel) {
    this.model = studentModel;
    this._render = null;
    this._alive = false;
    this.initialState = {
      status: 'loading',
      items: [],
      material: null,
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
  /** ST03 — the learning materials for this student's class. */
  async load(studentId) {
    this._setState({ status: 'loading', errorText: null });
    try {
      const page = await this.model.learning(studentId, { page: 1 });
      this._setState({ status: 'content', items: page.items || [] });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText:
          error instanceof ApiError ? error.message : 'Could not load your learning materials.',
      });
    }
  }
  async open(materialId) {
    this._setState({ status: 'loading', errorText: null, material: null });
    try {
      const material = await this.model.materialById(materialId);
      this._setState({ status: 'content', material });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not open this material.',
      });
    }
  }
  closeMaterial() {
    this._setState({ material: null });
  }
  onRetry(studentId) {
    return this.load(studentId);
  }
}

export class StudentTimetablePresenter {
  constructor(studentModel) {
    this.model = studentModel;
    this._render = null;
    this._alive = false;
    this.initialState = {
      status: 'loading',
      timetable: null,
      calendar: null,
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
  /** ST04 — timetable + calendar fetched in parallel. */
  async load(studentId) {
    this._setState({ status: 'loading', errorText: null });
    try {
      const [timetable, calendar] = await Promise.all([
        this.model.timetable(studentId),
        this.model.calendar(),
      ]);
      this._setState({ status: 'content', timetable, calendar });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load your timetable.',
      });
    }
  }
  onRetry(studentId) {
    return this.load(studentId);
  }
}
