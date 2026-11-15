/**
 * AD11 — School calendar Presenter.
 * Reads actual academic sessions, terms, published examination events and
 * the daily schedule. Only creates sessions/terms through implemented routes.
 */
import { ApiError } from '../api/ApiError';

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export class CalendarPresenter {
  constructor(calendarModel) {
    this.model = calendarModel;
    this._render = null;
    this._alive = false;
    this.initialState = {
      status: 'loading',
      calendar: null,
      sessions: [],
      terms: [],
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

  async load(notice = null) {
    this._setState({ status: 'loading', errorText: null, notice });
    try {
      const snapshot = await this.model.snapshot();
      this._setState({
        status: 'content',
        calendar: snapshot,
        sessions: snapshot.sessions,
        terms: snapshot.terms,
        errorText: null,
        notice,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load the school calendar.',
      });
    }
  }

  onRetry() {
    return this.load();
  }

  async addSession(fields) {
    if (this.state.saving) return false;
    const name = String(fields.name ?? '').trim();
    const startsOn = String(fields.startsOn ?? '').trim();
    const endsOn = String(fields.endsOn ?? '').trim();
    if (name.length < 4 || name.length > 40) {
      this._setState({ errorText: 'Enter an academic session name (4–40 characters).' });
      return false;
    }
    if (!validDate(startsOn) || !validDate(endsOn) || startsOn >= endsOn) {
      this._setState({ errorText: 'Enter valid session dates; the start must precede the end.' });
      return false;
    }
    this._setState({ saving: true, errorText: null, notice: null });
    try {
      await this.model.createSession({ name, startsOn, endsOn });
      await this.load(`${name} created.`);
      return true;
    } catch (error) {
      this._setState({
        saving: false,
        errorText: error instanceof ApiError ? error.message : 'The academic session was not created.',
      });
      return false;
    }
  }

  async addTerm(fields) {
    if (this.state.saving) return false;
    const session = this.state.sessions.find((item) => item.id === fields.sessionId);
    const number = Number(fields.number);
    const startsOn = String(fields.startsOn ?? '').trim();
    const endsOn = String(fields.endsOn ?? '').trim();
    if (!session) {
      this._setState({ errorText: 'Choose an existing academic session.' });
      return false;
    }
    if (!Number.isInteger(number) || number < 1 || number > 3) {
      this._setState({ errorText: 'Choose Term 1, 2 or 3.' });
      return false;
    }
    if (!validDate(startsOn) || !validDate(endsOn) || startsOn >= endsOn ||
      startsOn < session.startsOn || endsOn > session.endsOn) {
      this._setState({ errorText: 'Term dates must be valid and fall within the selected academic session.' });
      return false;
    }
    if (session.terms.some((term) => Number(term.number) === number)) {
      this._setState({ errorText: `Term ${number} already exists in ${session.name}.` });
      return false;
    }
    this._setState({ saving: true, errorText: null, notice: null });
    try {
      await this.model.createTerm({ sessionId: session.id, number, startsOn, endsOn });
      await this.load(`Term ${number} added to ${session.name}.`);
      return true;
    } catch (error) {
      this._setState({
        saving: false,
        errorText: error instanceof ApiError ? error.message : 'The term was not created.',
      });
      return false;
    }
  }
}

export default CalendarPresenter;
