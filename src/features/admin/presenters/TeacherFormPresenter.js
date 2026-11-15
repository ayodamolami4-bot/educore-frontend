/**
 * AD08 — Register or edit a teacher (Presenter). Create queues the account
 * provisioning workflow; edits patch the profile and route subject changes
 * through the assignment-changes endpoint so subject records stay in sync.
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
      status: 'loading', // loading | editing | error
      mode: 'create', // create | edit
      teacherId: null,
      teacher: null,
      subjects: [], // every subject name, for the picker
      classOptions: [],
      staffNumberPreview: null, // the number the next new teacher gets
      notice: null,
      errorText: null,
      provisioning: null,
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
      const [subjectsPage, classesPage, teacherResult, nextStaffNumber] = await Promise.all([
        this.structureModel.subjects(),
        this.structureModel.classes(),
        teacherId ? this.model.byId(teacherId) : Promise.resolve(null),
        teacherId ? Promise.resolve(null) : this.model.nextStaffNumber().catch(() => null),
      ]);
      const teacher = teacherResult ? teacherResult.teacher || teacherResult : null;
      this._setState({
        status: 'editing',
        mode: teacherId ? 'edit' : 'create',
        teacherId: teacherId || null,
        teacher,
        subjects: subjectsPage.items.map((s) => s.name),
        classOptions: classesPage.items,
        // Create mode shows the number the server will assign, read-only.
        staffNumberPreview: teacherId ? null : (nextStaffNumber && nextStaffNumber.next) || null,
        provisioning: teacher ? teacher.provisioning || null : null,
        errorText: null,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText:
          error instanceof ApiError ? error.message : 'Could not load the teacher form.',
      });
    }
  }

  onRetry() {
    return this.start(this.state.teacherId);
  }

  /** Save the form: create (with provisioning) or edit (profile + subjects). */
  async saveTeacher(fields, initialSubjects) {
    if (this.state.saving) return false;
    if (!fields.fullName || !fields.fullName.trim()) {
      this._setState({ notice: null, errorText: "Enter the teacher's full name." });
      return false;
    }
    const emailProblem = emailError(fields.email);
    if (emailProblem) {
      this._setState({ notice: null, errorText: emailProblem });
      return false;
    }
    // ONE phone format everywhere: the raw typing is validated first (so
    // junk like "call me" is still refused), then stored as +234 + 10 digits.
    const phoneProblem = phoneError(fields.phone);
    if (phoneProblem) {
      this._setState({ notice: null, errorText: phoneProblem });
      return false;
    }
    const phone = canonicalPhone(fields.phone);
    this._setState({ saving: true, notice: null, errorText: null });
    try {
      if (this.state.mode === 'create') {
        const result = await this.model.create({
          fullName: fields.fullName,
          staffNumber: fields.staffNumber,
          phone,
          email: fields.email,
          subjects: fields.subjects,
          formClass: fields.formClass,
        });
        this._setState({
          saving: false,
          teacherId: result.teacher.id,
          teacher: result.teacher,
          provisioning: result.provisioning || { status: 'Queued' },
          notice:
            `${result.teacher.fullName} registered — subjects and form class saved.` +
            (result.provisioning && result.provisioning.status === 'Queued'
              ? ' Their staff account provisioning has started — tap Retry if it stays queued.'
              : ''),
        });
        return true;
      }
      const saved = await this.model.update(this.state.teacherId, {
        fullName: fields.fullName,
        staffNumber: fields.staffNumber,
        phone,
        email: fields.email,
        formClass: fields.formClass,
      });
      const subjectsChanged =
        JSON.stringify([...(fields.subjects || [])].sort()) !==
        JSON.stringify([...(initialSubjects || [])].sort());
      if (subjectsChanged) {
        await this.model.changeAssignments({
          teacherId: this.state.teacherId,
          subjects: fields.subjects,
        });
      }
      this._setState({
        saving: false,
        teacher: saved.teacher,
        notice:
          'Teacher updated.' +
          (subjectsChanged ? ' Their subjects now follow them into the timetable.' : ''),
      });
      return true;
    } catch (error) {
      this._setState({
        saving: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'The teacher was not saved.',
      });
      return false;
    }
  }

  async retryProvisioning() {
    if (!this.state.teacherId || this.state.saving) return;
    this._setState({ saving: true, errorText: null });
    try {
      const result = await this.model.retryProvisioning(this.state.teacherId);
      this._setState({
        saving: false,
        provisioning: result.provisioning,
        notice: result.provisioning.detail || 'Provisioning completed.',
      });
    } catch (error) {
      this._setState({
        saving: false,
        errorText: error instanceof ApiError ? error.message : 'Provisioning did not complete.',
      });
    }
  }
}

export default TeacherFormPresenter;
