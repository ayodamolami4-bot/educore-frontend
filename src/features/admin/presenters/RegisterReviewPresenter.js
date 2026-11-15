/**
 * AD17 — View or correct a class register. Pick a class, see today's
 * registers, open a submitted one, and fix a student's status (absent →
 * present etc.). The register's counts recompute after every correction.
 */
import { ApiError } from '../api/ApiError';

export class RegisterReviewPresenter {
  constructor(attendanceModel, structureModel) {
    this.model = attendanceModel;
    this.structureModel = structureModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'picking', // picking | loading | content | error
      classOptions: [],
      registers: [],
      register: null,
      entries: [],
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
    this._setState({ status: 'picking', errorText: null });
    try {
      const page = await this.structureModel.classes();
      this._setState({ classOptions: page.items });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load the class list.',
      });
    }
  }

  async openClass(classLabel) {
    this._setState({ status: 'loading', notice: null, errorText: null });
    try {
      const page = await this.model.registers();
      this._setState({
        status: 'content',
        registers: page.items.filter((r) => r.classLabel === classLabel),
        register: null,
        entries: [],
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load the registers.',
      });
    }
  }

  async openRegister(registerId) {
    this._setState({ status: 'loading', notice: null, errorText: null });
    try {
      const result = await this.model.registerById(registerId);
      this._setState({ status: 'content', register: result.register, entries: result.entries });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not open the register.',
      });
    }
  }

  backToRegisters() {
    this._setState({ register: null, entries: [], notice: null, errorText: null });
  }

  /** A missing register can't be corrected — surface why as a popup. */
  refuseMissing() {
    this._setState({
      errorText: 'That register was never submitted — the teacher has to submit it before you can correct it.',
    });
  }

  /** Correct one student's status; the API recomputes the register counts. */
  async correct(studentId, status) {
    const register = this.state.register;
    if (!register || this.state.saving) return;
    this._setState({ saving: true, notice: null, errorText: null });
    try {
      const result = await this.model.correctRegister(register.id, { studentId, status });
      const fresh = await this.model.registerById(register.id);
      this._setState({
        saving: false,
        register: fresh.register,
        entries: fresh.entries,
        notice: `${result.entry.studentName} is now ${status} — the register shows ${fresh.register.absentCount} absent, ${fresh.register.lateCount} late.`,
      });
    } catch (error) {
      this._setState({
        saving: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'The correction was not saved.',
      });
    }
  }

  onRetry() {
    return this.state.register
      ? this.openRegister(this.state.register.id)
      : this.state.registers.length
        ? Promise.resolve()
        : this.pickClass();
  }
}

export default RegisterReviewPresenter;
