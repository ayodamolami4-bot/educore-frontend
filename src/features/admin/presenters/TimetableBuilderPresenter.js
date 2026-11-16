/**
 * AD14 — Build a term timetable from active teaching assignments.
 * The backend stores one versioned plan per term and lessons by assignment ID.
 * A class is simply the focused view of its lessons inside that term plan.
 */
import { ApiError } from '../api/ApiError';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const minuteLabel = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
};
const minuteOf = (value) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value ?? ''));
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};
const todayInLagos = () => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date()).map((item) => [item.type, item.value]));
  return parts.year + '-' + parts.month + '-' + parts.day;
};
const classLabel = (item) =>
  [item?.level, item?.arm].filter(Boolean).join(' ') || item?.classLabel || 'Class';

function lessonView(lesson, index) {
  const day = DAYS[Number(lesson.weekday) - 1] ?? 'Monday';
  const start = minuteLabel(lesson.startMinute);
  const end = minuteLabel(lesson.endMinute);
  return {
    ...lesson,
    day,
    weekday: Number(lesson.weekday),
    period: index + 1,
    start,
    end,
    durationMinutes: Number(lesson.endMinute) - Number(lesson.startMinute),
    time: start + ' – ' + end,
    subject: lesson.subjectName ?? 'Assigned subject',
    teacherName: lesson.teacherName ?? 'Assigned teacher',
    activity: null,
  };
}

export class TimetableBuilderPresenter {
  constructor(timetableModel, structureModel, calendarModel) {
    this.model = timetableModel;
    this.structureModel = structureModel;
    this.calendar = calendarModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'picking',
      classOptions: [],
      selectedClass: null,
      draft: null,
      assignments: [],
      notice: null,
      errorText: null,
      saving: false,
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

  async pickClass() {
    this._setState({ status: 'picking', errorText: null, notice: null });
    try {
      const page = await this.structureModel.classes();
      const options = (page.items ?? []).map((item) => ({
        ...item,
        classLabel: classLabel(item),
        label: classLabel(item),
      }));
      this._setState({ classOptions: options, status: 'picking' });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not load the class list.',
      });
    }
  }

  async openForClass(classId) {
    this._setState({ status: 'loading', notice: null, errorText: null, draft: null });
    try {
      let classes = this.state.classOptions;
      if (!classes.length) {
        const page = await this.structureModel.classes();
        classes = (page.items ?? []).map((item) => ({
          ...item,
          classLabel: classLabel(item),
          label: classLabel(item),
        }));
      }
      const selectedClass = classes.find((item) => item.id === classId);
      if (!selectedClass) throw new Error('The selected class is no longer available.');

      const today = todayInLagos();
      const termsPage = await this.calendar.terms(selectedClass.sessionId);
      const terms = termsPage.items ?? [];
      const term =
        terms.find((item) => item.startsOn <= today && item.endsOn >= today) ??
        terms.find((item) => item.startsOn > today) ??
        terms.slice().sort((a, b) => String(b.endsOn).localeCompare(String(a.endsOn)))[0];
      if (!term) {
        throw new Error('There is no academic term for this class session. Create the term in School Calendar before building its timetable.');
      }

      const planPage = await this.model.drafts(term.id);
      const termPlans = planPage.items ?? [];
      const existing = termPlans.find((item) => item.status === 'DRAFT');
      const published = termPlans.find((item) => item.status === 'PUBLISHED');
      let plan;
      if (existing) {
        plan = existing;
      } else {
        const effectiveFrom = today >= term.startsOn && today <= term.endsOn
          ? today
          : term.startsOn;
        plan = await this.model.createDraft({
          termId: term.id,
          effectiveFrom,
          sourcePlanId: published?.id ?? null,
        });
      }

      const [review, assignmentPage] = await Promise.all([
        this.model.draftById(plan.id),
        this.model.assignmentCandidates({ classId: selectedClass.id }),
      ]);
      const assignments = (assignmentPage.items ?? []).map((assignment) => ({
        ...assignment,
        label: [
          assignment.subjectName ?? 'Subject',
          assignment.teacherName ?? 'Teacher',
        ].join(' · '),
      }));
      const classLessons = (review.lessons ?? [])
        .filter((lesson) => String(lesson.classId) === String(selectedClass.id))
        .sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute)
        .map((lesson, index, all) => {
          const dayIndex = all.filter((item) => item.weekday === lesson.weekday && item.startMinute < lesson.startMinute).length;
          return lessonView(lesson, dayIndex);
        });
      const weeklyTargets = (review.weeklyTargets ?? []).filter(
        (target) => String(target.classId) === String(selectedClass.id),
      );
      const draft = {
        id: review.id,
        termId: term.id,
        termLabel: 'Term ' + term.number,
        sessionLabel: selectedClass.sessionName ?? '',
        classId: selectedClass.id,
        classLabel: selectedClass.classLabel,
        effectiveFrom: review.effectiveFrom ?? plan.effectiveFrom,
        status: review.status,
        version: review.version,
        slots: classLessons,
        weeklyTargets,
        conflicts: review.conflicts ?? [],
        readyToPublish: Boolean(review.readyToPublish),
      };

      this._setState({
        status: 'content',
        classOptions: classes,
        selectedClass,
        draft,
        assignments,
        notice: existing
          ? 'Opened the existing draft for this academic term.'
          : published
            ? 'Created a new draft revision seeded from the currently published term timetable.'
            : 'Created a new draft for this academic term.',
        errorText: null,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not open the term timetable.',
      });
    }
  }

  async refresh() {
    const draft = this.state.draft;
    if (!draft) return;
    this._setState({ saving: true, errorText: null });
    try {
      const review = await this.model.draftById(draft.id);
      const assignments = this.state.assignments;
      const classLessons = (review.lessons ?? [])
        .filter((lesson) => String(lesson.classId) === String(draft.classId))
        .sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute)
        .map((lesson, index, all) => lessonView(
          lesson,
          all.filter((item) => item.weekday === lesson.weekday && item.startMinute < lesson.startMinute).length,
        ));
      this._setState({
        saving: false,
        assignments,
        draft: {
          ...draft,
          status: review.status,
          version: review.version,
          effectiveFrom: review.effectiveFrom,
          slots: classLessons,
          weeklyTargets: (review.weeklyTargets ?? []).filter(
            (target) => String(target.classId) === String(draft.classId),
          ),
          conflicts: review.conflicts ?? [],
          readyToPublish: Boolean(review.readyToPublish),
        },
      });
    } catch (error) {
      this._setState({
        saving: false,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not refresh the term timetable.',
      });
    }
  }

  async saveLesson(fields) {
    const draft = this.state.draft;
    if (!draft || this.state.saving) return false;
    const assignment = this.state.assignments.find(
      (item) => String(item.id) === String(fields.assignmentId),
    );
    if (!assignment) {
      this._setState({ errorText: 'Choose an active teaching assignment for this class.' });
      return false;
    }
    const weekday = DAYS.indexOf(fields.day) + 1;
    const startMinute = minuteOf(fields.start);
    const durationMinutes = Number(fields.durationMinutes);
    if (weekday < 1 || startMinute === null) {
      this._setState({ errorText: 'Choose a weekday and a valid start time such as 08:30.' });
      return false;
    }
    if (![30, 60].includes(durationMinutes)) {
      this._setState({ errorText: 'A lesson must be 30 or 60 minutes.' });
      return false;
    }
    if (startMinute < 480 || startMinute + durationMinutes > 780 ||
        startMinute % 30 !== 0 ||
        (startMinute < 720 && startMinute + durationMinutes > 690) ||
        (weekday === 5 && startMinute + durationMinutes > 720) ||
        (weekday === 3 && startMinute < 510 && Boolean(this.state.selectedClass?.wednesdayPt))) {
      this._setState({
        errorText: 'Use a 30/60 minute slot between 08:00 and 13:00. Avoid the 11:30 break and Friday sports period.',
      });
      return false;
    }
    const body = {
      assignmentId: assignment.id,
      weekday,
      start: fields.start,
      durationMinutes,
      room: String(fields.room ?? '').trim(),
    };
    this._setState({ saving: true, errorText: null, notice: null });
    try {
      if (fields.lessonId) {
        await this.model.updateLesson(draft.id, fields.lessonId, body, draft.version);
      } else {
        await this.model.addLesson(draft.id, body, draft.version);
      }
      await this.refresh();
      this._setState({
        notice: fields.lessonId
          ? 'The lesson was updated. The whole term plan version has been refreshed.'
          : 'The lesson was added to the term plan.',
      });
      return true;
    } catch (error) {
      this._setState({
        saving: false,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The lesson was not saved.',
      });
      return false;
    }
  }

  async removeSlot(lessonId) {
    const draft = this.state.draft;
    if (!draft || this.state.saving || !lessonId) return false;
    this._setState({ saving: true, errorText: null, notice: null });
    try {
      await this.model.removeLesson(draft.id, lessonId, draft.version);
      await this.refresh();
      this._setState({ notice: 'The lesson was removed from the term plan.' });
      return true;
    } catch (error) {
      this._setState({
        saving: false,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The lesson was not removed.',
      });
      return false;
    }
  }

  onRetry() {
    return this.state.selectedClass
      ? this.openForClass(this.state.selectedClass.id)
      : this.pickClass();
  }
}

export default TimetableBuilderPresenter;
