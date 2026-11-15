/**
 * AD11 — School calendar. One screen for the term window, the key dates
 * families ask about, and today's schedule (the same slots the home shows).
 * The office can ADD to all three: key dates, today's activities, and the
 * next session (the CURRENT session stays automatic and locked).
 */
import { ApiError } from '../api/ApiError';

export class CalendarPresenter {
  constructor(calendarModel) {
    this.model = calendarModel;
    this._render = null;
    this._alive = false;
    this.initialState = {
      status: 'loading', // loading | content | error
      calendar: null,
      sessions: [],
      saving: false,
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

  async load() {
    this._setState({ status: 'loading', errorText: null });
    try {
      const [calendar, sessions] = await Promise.all([this.model.calendar(), this.model.sessions()]);
      this._setState({
        status: 'content',
        calendar: calendar || {},
        sessions: (sessions && sessions.items) || [],
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load the calendar.',
      });
    }
  }

  onRetry() {
    return this.load();
  }

  /** Add a key date. Returns true when it saved so the view can clear the form. */
  async addKeyDate(fields) {
    if (this.state.saving) return false;
    this._setState({ saving: true, notice: null, errorText: null });
    try {
      const result = await this.model.addKeyDate(fields);
      this._setState({
        saving: false,
        calendar: result.calendar,
        notice: `${fields.title} added to the key dates.`,
      });
      return true;
    } catch (error) {
      this._setState({
        saving: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'The key date was not saved.',
      });
      return false;
    }
  }

  /** Add an activity to "Today at school". */
  async addTodayItem(fields) {
    if (this.state.saving) return false;
    this._setState({ saving: true, notice: null, errorText: null });
    try {
      const result = await this.model.addTodayItem(fields);
      this._setState({
        saving: false,
        calendar: result.calendar,
        notice: `${fields.subject} added to today's schedule.`,
      });
      return true;
    } catch (error) {
      this._setState({
        saving: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'The activity was not saved.',
      });
      return false;
    }
  }

  /** Plan the next session — the label is computed from the newest entry, so
      the office just taps Add ("2027/2028"). The CURRENT session stays
      automatic and cannot be changed here or in the settings. */
  async addNextSession() {
    if (this.state.saving) return false;
    const newest = Math.max(...this.state.sessions.map((s) => Number(s.label.split('/')[0])));
    const label = `${newest + 1}/${newest + 2}`;
    this._setState({ saving: true, notice: null, errorText: null });
    try {
      const result = await this.model.createSession({ label });
      this._setState({
        saving: false,
        sessions: result.sessions || this.state.sessions,
        notice: `${label} planned — set its term dates when the ministry releases them.`,
      });
      return true;
    } catch (error) {
      this._setState({
        saving: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'The session was not added.',
      });
      return false;
    }
  }
}

export default CalendarPresenter;
