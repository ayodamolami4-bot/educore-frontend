/**
 * AD01 — Admin home. Loads one dashboard payload and splits it into the three
 * sections of the design: attendance totals, "needs your attention", and
 * today's schedule. Counts open the matching lists (routing lives here).
 */
import { ApiError } from '../api/ApiError';

export class DashboardPresenter {
  constructor(dashboardModel) {
    this.model = dashboardModel;
    this._render = null;
    this._alive = false;
    this.initialState = {
      status: 'loading', // loading | content | error
      schoolName: '',
      staffName: '',
      dateLabel: '',
      attendance: null,
      attention: [],
      todaySchedule: [],
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
      const data = await this.model.load();
      this._setState({ status: 'content', ...data });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load the dashboard.',
      });
    }
  }

  onRetry() {
    return this.load();
  }

  /** Quiet refresh when the screen regains focus — the attendance tiles stay
      current after a register is corrected elsewhere, without a spinner. */
  async refresh() {
    try {
      const data = await this.model.load();
      if (!this._alive) return;
      this._setState({ status: 'content', ...data, errorText: null });
    } catch (_error) {
      // keep whatever is on screen; the next focus retries
    }
  }

  /** Each count on the home screen opens the list it came from. */
  onViewAttendance() {
    if (this._navigation) this._navigation.navigate('AttendanceOverview');
  }

  onOpenAttention(item) {
    if (!this._navigation) return;
    const routeByType = {
      results: 'ResultsReview',
      payment: 'PaymentsBoard',
      complaint: 'ComplaintsList',
    };
    this._navigation.navigate(routeByType[item.type] || 'AttendanceOverview');
  }

  onEnrolStudent() {
    if (this._navigation) this._navigation.navigate('StudentForm');
  }

  onViewCalendar() {
    if (this._navigation) this._navigation.navigate('Calendar');
  }

  /** "Today at school" rows open the calendar (AD11) for the full picture. */
  onOpenSchedule() {
    if (this._navigation) this._navigation.navigate('Calendar');
  }
}

export default DashboardPresenter;
