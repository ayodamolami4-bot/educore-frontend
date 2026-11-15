/**
 * AD14 — Build the weekly timetable. One draft per class: 5 days × 6 periods,
 * tap an empty period to pick the subject and the teacher. The draft is saved
 * after every fill; "Send for review" checks it is complete first.
 */
import { ApiError } from '../api/ApiError';
import { timeError, minutesOf } from '../api/validation.js';

const BASE_TIMES = [
  '08:00 – 08:40', '08:45 – 09:25', '09:30 – 10:10',
  '10:40 – 11:20', '11:25 – 12:05', '12:10 – 12:50',
];
// Extra periods 7–10: up to 10 periods per day (raised from 8). The first two
// extras are activity-friendly lunch/afternoon slots; 9 and 10 cover a full
// afternoon. periodTime falls back to 'TBD' past this list, so the office can
// still type a custom time via the time editor for any period number.
const EXTRA_TIMES = {
  7: '12:55 – 13:35',
  8: '13:40 – 14:20',
  9: '14:25 – 15:05',
  10: '15:10 – 15:50',
};

/** The maximum number of periods a day may hold. */
export const MAX_PERIODS_PER_DAY = 10;

/** Six fixed teaching periods, then up to four activity/teaching slots. */
function periodTime(period) {
  return BASE_TIMES[period - 1] || EXTRA_TIMES[period] || 'TBD';
}

export class TimetableBuilderPresenter {
  constructor(timetableModel, structureModel) {
    this.model = timetableModel;
    this.structureModel = structureModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'picking', // picking | loading | content | error
      draft: null,
      classOptions: [],
      subjects: [], // subjects taught in the draft's class
      teachers: [], // active teachers for the slot picker
      notice: null,
      errorText: null,
      saving: false,
      sendingReview: false,
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

  /** No class chosen yet — load the options for the picker sheet. */
  async pickClass() {
    this._setState({ status: 'picking', errorText: null });
    try {
      const page = await this.structureModel.classes();
      this._setState({ classOptions: page.items, status: 'picking' });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load the class list.',
      });
    }
  }

  /** Open the class's in-progress draft, or start one. When the class only
      has a PUBLISHED timetable, the new draft is seeded with the published
      week's slots so re-opening looks like EDITING the published timetable
      (the office expects to see the periods they just published, not a blank
      week). The published record stays untouched until the new draft is
      re-published. */
  async openForClass(classLabel) {
    this._setState({ status: 'loading', notice: null, errorText: null });
    try {
      const page = await this.model.drafts();
      const existing = page.items.find((d) => d.classLabel === classLabel && d.status !== 'Published');
      let draft;
      if (existing) {
        draft = (await this.model.draftById(existing.id)).draft;
      } else {
        // No in-progress draft. If a PUBLISHED one exists, seed the new draft
        // with its slots so the fields are NOT empty on re-open.
        const published = page.items.find((d) => d.classLabel === classLabel && d.status === 'Published');
        const createBody = { classLabel };
        if (published) {
          createBody.seedSlots = published.slots;
        }
        draft = (await this.model.createDraft(createBody)).draft;
      }
      const [subjectsPage, teachersPage] = await Promise.all([
        this.structureModel.subjects(),
        this.model.assignmentCandidates(),
      ]);
      // NOTE: this must NOT be named `classLabel` — a same-named const in this
      // block shadows the parameter and puts `createDraft({ classLabel })`
      // above into the temporal dead zone (crashed every NEW class in v11–v14).
      const label = draft.classLabel;
      const inClass = (s) => s.classes.includes(label);
      this._setState({
        status: 'content',
        draft,
        // Only the class's OWN subjects are offerable — Physics never lands
        // on a JSS timetable because it is not on the picker at all.
        subjects: subjectsPage.items
          .filter((s) => s.classes.includes(label))
          .sort((a, b) => (inClass(b) ? 1 : 0) - (inClass(a) ? 1 : 0)),
        teachers: teachersPage.items,
        errorText: null,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not open the timetable.',
      });
    }
  }

  /** Fill one period and save the whole draft (small payloads, demo-friendly).
      Changing an activity period to a subject clears the activity field too,
      so the server's "either a subject or an activity, not both" rule passes. */
  async fillSlot(day, period, subject, teacherName) {
    const draft = this.state.draft;
    if (!draft || this.state.saving) return;
    const slots = draft.slots.map((s) =>
      s.day === day && s.period === period
        ? { ...s, subject, teacherName, activity: null }
        : s,
    );
    this._setState({ saving: true, errorText: null });
    try {
      const saved = await this.model.saveDraft(draft.id, { slots });
      this._setState({ saving: false, draft: saved.draft });
    } catch (error) {
      this._setState({
        saving: false,
        errorText: error instanceof ApiError ? error.message : 'The period was not saved.',
      });
    }
  }

  /** Point an empty period at an activity instead of a subject. */
  async fillActivity(day, period, activity) {
    const draft = this.state.draft;
    if (!draft || this.state.saving) return;
    const slots = draft.slots.map((s) =>
      s.day === day && s.period === period
        ? { ...s, subject: null, teacherName: null, activity }
        : s,
    );
    this._setState({ saving: true, errorText: null });
    try {
      const saved = await this.model.saveDraft(draft.id, { slots });
      this._setState({ saving: false, draft: saved.draft });
    } catch (error) {
      this._setState({
        saving: false,
        errorText: error instanceof ApiError ? error.message : 'The period was not saved.',
      });
    }
  }

  /** Set one period's time — two 24-hour HH:MM values, end strictly after
      start. Returns false (with errorText set) when the times are invalid. */
  async setTime(day, period, start, end) {
    const draft = this.state.draft;
    if (!draft || this.state.saving) return false;
    const startProblem = timeError(start);
    if (startProblem) {
      this._setState({ errorText: `Period ${period} start — ${startProblem}` });
      return false;
    }
    const endProblem = timeError(end);
    if (endProblem) {
      this._setState({ errorText: `Period ${period} end — ${endProblem}` });
      return false;
    }
    if (minutesOf(end) <= minutesOf(start)) {
      this._setState({
        errorText: `Period ${period}: the end must be after the start — e.g. 08:00 – 08:40, never the same time twice.`,
      });
      return false;
    }
    const label = `${start} – ${end}`;
    const slots = draft.slots.map((s) =>
      s.day === day && s.period === period ? { ...s, time: label, start, end } : s,
    );
    this._setState({ saving: true, errorText: null });
    try {
      const saved = await this.model.saveDraft(draft.id, { slots });
      this._setState({ saving: false, draft: saved.draft, notice: `Period time set — ${label}.` });
      return true;
    } catch (error) {
      this._setState({
        saving: false,
        errorText: error instanceof ApiError ? error.message : 'The time was not saved — check the times and try again.',
      });
      return false;
    }
  }

  /** Append a new period to a day: a subject with its teacher, or an activity. */
  async appendSlot(day, payload) {
    const draft = this.state.draft;
    if (!draft || this.state.saving) return;
    const nextPeriod = draft.slots.filter((s) => s.day === day).length + 1;
    if (nextPeriod > MAX_PERIODS_PER_DAY) return;
    const slots = [
      ...draft.slots,
      {
        day,
        period: nextPeriod,
        time: periodTime(nextPeriod),
        subject: null,
        teacherName: null,
        activity: null,
        ...payload,
      },
    ];
    this._setState({ saving: true, errorText: null });
    try {
      const saved = await this.model.saveDraft(draft.id, { slots });
      this._setState({ saving: false, draft: saved.draft });
    } catch (error) {
      this._setState({
        saving: false,
        errorText: error instanceof ApiError ? error.message : 'The period was not added.',
      });
    }
  }

  /** Remove a period from a day; that day renumbers, keeping each period's time. */
  async removeSlot(day, period) {
    const draft = this.state.draft;
    if (!draft || this.state.saving) return;
    const rest = draft.slots.filter((s) => s.day !== day);
    const dayRest = draft.slots
      .filter((s) => s.day === day && s.period !== period)
      .sort((a, b) => a.period - b.period)
      .map((s, i) => ({ ...s, period: i + 1 }));
    this._setState({ saving: true, errorText: null });
    try {
      const saved = await this.model.saveDraft(draft.id, { slots: [...rest, ...dayRest] });
      this._setState({ saving: false, draft: saved.draft });
    } catch (error) {
      this._setState({
        saving: false,
        errorText: error instanceof ApiError ? error.message : 'The period was not removed.',
      });
    }
  }

  async sendForReview() {
    const draft = this.state.draft;
    if (!draft || this.state.sendingReview) return;
    this._setState({ sendingReview: true, notice: null, errorText: null });
    try {
      const result = await this.model.requestReview(draft.id);
      this._setState({
        sendingReview: false,
        draft: result.draft,
        notice: 'Sent for review — publish it from "Review and publish the timetable".',
      });
    } catch (error) {
      this._setState({
        sendingReview: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'Could not send for review.',
      });
    }
  }

  onRetry() {
    return this.state.draft ? this.openForClass(this.state.draft.classLabel) : this.pickClass();
  }
}

export default TimetableBuilderPresenter;
