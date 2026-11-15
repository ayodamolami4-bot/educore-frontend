/**
 * AD09 — One teacher: contact details, account status, form-class
 * responsibility and the subjects they teach.
 */
import { ApiError } from '../api/ApiError';

export class TeacherProfilePresenter {
  constructor(teacherModel) {
    this.model = teacherModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this._teacherId = null;
    this.initialState = {
      status: 'loading', // loading | content | error
      teacher: null,
      notice: null,
      errorText: null,
      busy: false, // status change in flight
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

  async load(teacherId) {
    this._teacherId = teacherId;
    this._setState({ status: 'loading', errorText: null });
    try {
      const teacher = await this.model.byId(teacherId);
      if (!teacher) {
        this._setState({
          status: 'error',
          errorText: 'This teacher could not be found — the link may be stale.',
        });
        return;
      }
      this._setState({ status: 'content', teacher });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load this teacher.',
      });
    }
  }

  onRetry() {
    return this.load(this._teacherId);
  }

  /** Change the teacher's status (Active / On Leave / Inactive) — the same
      control the office has for students and admins. The list, timetable
      and form-class duties all read the fresh status afterwards. */
  async changeStatus(next, reason) {
    if (!this._teacherId || this.state.busy) return;
    if (!['Active', 'Inactive'].includes(next)) {
      this._setState({ errorText: 'Choose Active or Inactive.' });
      return;
    }
    if (!reason || reason.trim().length < 5) {
      this._setState({ errorText: 'Enter an access-change reason of at least five characters.' });
      return;
    }
    this._setState({ busy: true, notice: null, errorText: null });
    try {
      await this.model.changeAccess(
        this._teacherId,
        { role: 'TEACHER', active: next === 'Active', reason: reason.trim() },
        this.state.teacher?.version,
      );
      this._setState({
        busy: false,
        notice: `Teacher access change accepted. The school now records this staff member as ${next}; identity provisioning is processed separately.`,
      });
      await this.load(this._teacherId);
    } catch (error) {
      this._setState({
        busy: false,
        errorText: error instanceof ApiError ? error.message : 'The access change was not accepted.',
      });
    }
  }
}

export default TeacherProfilePresenter;
