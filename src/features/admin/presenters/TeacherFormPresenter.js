/**
 * AD08 — Register a teacher or edit the existing staff record.
 * Creation uses SchoolService.TeacherInput: level eligibility, subject IDs
 * and dated class assignments are explicit. Editing uses StaffEdit only.
 */
import { ApiError } from '../api/ApiError';
import { emailError, phoneError } from '../api/validation.js';
import { canonicalPhone } from '../utils/validators';

export class TeacherFormPresenter {
  constructor(teacherModel, structureModel) {
    this.model = teacherModel;
    this.structureModel = structureModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'loading',
      mode: 'create',
      teacherId: null,
      teacher: null,
      subjects: [],
      classOptions: [],
      assignmentOptions: [],
      provisioning: null,
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

  async start(teacherId) {
    this._setState({ status: 'loading', errorText: null });
    try {
      const [subjectsPage, classesPage, teacher, provisioning] = await Promise.all([
        this.structureModel.subjects(),
        this.structureModel.classes(),
        teacherId ? this.model.byId(teacherId) : Promise.resolve(null),
        teacherId ? this.model.provisioning(teacherId).catch(() => null) : Promise.resolve(null),
      ]);
      const subjects = (subjectsPage.items ?? []).map((item) => ({
        id: item.id,
        name: item.name,
      }));
      const classOptions = (classesPage.items ?? []).map((item) => ({
        id: item.id,
        level: item.level,
        sessionId: item.sessionId,
        label: [item.level, item.arm].filter(Boolean).join(' '),
      }));
      const assignmentOptions = classOptions.flatMap((classItem) =>
        subjects.map((subject) => ({
          id: `${classItem.id}:${subject.id}`,
          classId: classItem.id,
          subjectId: subject.id,
          level: classItem.level,
          label: `${classItem.label} · ${subject.name}`,
        })),
      );
      this._setState({
        status: 'editing',
        mode: teacherId ? 'edit' : 'create',
        teacherId: teacherId || null,
        teacher,
        subjects,
        classOptions,
        assignmentOptions,
        provisioning,
        errorText: null,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load the teacher form.',
      });
    }
  }

  onRetry() {
    return this.start(this.state.teacherId);
  }

  async saveTeacher(fields) {
    if (this.state.saving) return false;
    if (!fields.fullName?.trim()) {
      this._setState({ notice: null, errorText: "Enter the teacher's full name." });
      return false;
    }
    const emailProblem = emailError(fields.email);
    if (emailProblem) {
      this._setState({ notice: null, errorText: emailProblem });
      return false;
    }
    const phoneProblem = phoneError(fields.phone);
    if (phoneProblem) {
      this._setState({ notice: null, errorText: phoneProblem });
      return false;
    }
    this._setState({ saving: true, notice: null, errorText: null });
    const phone = canonicalPhone(fields.phone);
    try {
      if (this.state.mode === 'create') {
        const selectedAssignments = this.state.assignmentOptions.filter((item) =>
          (fields.assignmentIds ?? []).includes(item.id),
        );
        const subjectIds = [...new Set(selectedAssignments.map((item) => item.subjectId))];
        const eligibleLevels = [...new Set(selectedAssignments.map((item) => item.level))];
        const periods = Number(fields.weeklyPeriods);
        if (!selectedAssignments.length || !subjectIds.length || !eligibleLevels.length) {
          throw new Error('Choose at least one real class-and-subject assignment.');
        }
        if (!Number.isInteger(periods) || periods < 1 || periods > 10) {
          throw new Error('Weekly periods must be a whole number from 1 to 10.');
        }
        const body = {
          fullName: fields.fullName.trim(),
          phone,
          email: fields.email?.trim() || null,
          existingLoginId: null,
          relationshipVerified: false,
          eligibleLevels,
          subjectIds,
          assignments: selectedAssignments.map((item) => ({
            classId: item.classId,
            subjectId: item.subjectId,
            department: null,
            weeklyPeriods: periods,
          })),
        };
        const created = await this.model.create(body);
        const [teacher, provisioning] = await Promise.all([
          this.model.byId(created.id),
          this.model.provisioning(created.id).catch(() => null),
        ]);
        this._setState({
          saving: false,
          teacherId: created.id,
          teacher,
          provisioning,
          notice: `${teacher.fullName} registered. ${created.onboardingEventId ? 'Staff account provisioning has been queued.' : 'The staff record was saved.'}`,
        });
        return true;
      }

      const teacher = this.state.teacher;
      const saved = await this.model.update(
        this.state.teacherId,
        {
          fullName: fields.fullName.trim(),
          phone,
          email: fields.email?.trim() || null,
          staffNumber: teacher.staffNumber,
          joinedOn: teacher.joinedOn ?? null,
          reason: fields.reason?.trim() ?? '',
        },
        teacher.version,
      );
      this._setState({
        saving: false,
        teacher: saved,
        notice: 'Teacher staff record updated. Teaching assignments remain unchanged.',
      });
      return true;
    } catch (error) {
      this._setState({
        saving: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : error.message || 'The teacher was not saved.',
      });
      return false;
    }
  }

  async retryProvisioning(reason) {
    if (!this.state.teacherId || this.state.saving) return;
    if (!reason || reason.trim().length < 5) {
      this._setState({ errorText: 'Enter a retry reason of at least five characters.' });
      return;
    }
    const event = this.state.provisioning?.items?.find((item) =>
      ['FAILED', 'RETRYING'].includes(item.state),
    );
    if (!event) {
      this._setState({ errorText: 'There is no failed provisioning event to retry.' });
      return;
    }
    this._setState({ saving: true, errorText: null, notice: null });
    try {
      await this.model.retryProvisioning(
        this.state.teacherId,
        event.eventId,
        event.version,
        reason.trim(),
      );
      const provisioning = await this.model.provisioning(this.state.teacherId);
      this._setState({
        saving: false,
        provisioning,
        notice: 'Provisioning retry accepted. The background delivery worker will process it.',
      });
    } catch (error) {
      this._setState({
        saving: false,
        errorText: error instanceof ApiError ? error.message : 'Provisioning retry was not accepted.',
      });
    }
  }
}

export default TeacherFormPresenter;
