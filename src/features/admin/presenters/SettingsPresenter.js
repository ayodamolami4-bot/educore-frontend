/**
 * AD10 — School metadata and administrator access.
 * The presenter only exposes operations supported by the school API.
 */
import { ApiError } from '../api/ApiError';
import { emailError, phoneError } from '../api/validation.js';

const ADMIN_ROLES = ['PRINCIPAL', 'SCHOOL_OFFICE', 'ACCOUNTS'];

export class SettingsPresenter {
  constructor(settingsModel) {
    this.model = settingsModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'loading',
      settings: null,
      memberships: [],
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

  async load() {
    this._setState({ status: 'loading', errorText: null });
    try {
      const [settings, membershipsPage] = await Promise.all([
        this.model.get(),
        this.model.adminMemberships(),
      ]);
      this._setState({
        status: 'content',
        settings,
        memberships: membershipsPage.items,
        errorText: null,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not load school metadata and staff access.',
      });
    }
  }

  onRetry() {
    return this.load();
  }

  async addMembership(fields) {
    if (this.state.saving) return false;
    if (!String(fields.fullName ?? '').trim()) {
      this._setState({ notice: null, errorText: "Enter the administrator's full name." });
      return false;
    }
    if (!String(fields.phone ?? '').trim()) {
      this._setState({ notice: null, errorText: 'Enter a phone number for the staff account.' });
      return false;
    }
    const phoneProblem = phoneError(fields.phone);
    if (phoneProblem) {
      this._setState({ notice: null, errorText: phoneProblem });
      return false;
    }
    if (fields.email) {
      const emailProblem = emailError(fields.email);
      if (emailProblem) {
        this._setState({ notice: null, errorText: emailProblem });
        return false;
      }
    }
    if (!ADMIN_ROLES.includes(String(fields.role ?? '').toUpperCase())) {
      this._setState({ notice: null, errorText: 'Choose Principal, School Office or Accounts.' });
      return false;
    }

    this._setState({ saving: true, notice: null, errorText: null });
    try {
      const created = await this.model.addAdminMembership(fields);
      const directory = await this.model.adminMemberships();
      const record = directory.items.find((item) => item.id === created.id);
      this._setState({
        saving: false,
        memberships: directory.items,
        notice: record
          ? `${record.fullName} was registered. Account provisioning is ${record.accessStatus.toLowerCase()}; issue the activation slip after provisioning completes.`
          : 'The staff record was created. Refresh the directory to check account provisioning.',
        errorText: null,
      });
      return true;
    } catch (error) {
      this._setState({
        saving: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The staff record could not be created.',
      });
      return false;
    }
  }

  async changeMembership(membershipId, patch, label) {
    if (this.state.saving) return false;
    const membership = this.state.memberships.find((item) => item.id === membershipId);
    if (!membership) {
      this._setState({ errorText: 'Refresh the staff directory before changing access.' });
      return false;
    }
    const reason = String(label ?? patch.reason ?? '').trim();
    if (reason.length < 5) {
      this._setState({ errorText: 'Enter a reason of at least five characters for the access history.' });
      return false;
    }
    this._setState({ saving: true, notice: null, errorText: null });
    try {
      await this.model.updateAdminMembership(membership, { ...patch, reason });
      const directory = await this.model.adminMemberships();
      this._setState({
        saving: false,
        memberships: directory.items,
        notice: label || 'Staff access updated.',
        errorText: null,
      });
      return true;
    } catch (error) {
      this._setState({
        saving: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The staff access change was not saved.',
      });
      return false;
    }
  }

  async issueActivationSlip(membershipId) {
    if (this.state.saving) return null;
    this._setState({ saving: true, notice: null, errorText: null });
    try {
      const slip = await this.model.issueAdminActivationSlip(membershipId);
      this._setState({
        saving: false,
        notice: 'A private, one-time activation slip was generated. Hand it directly to the staff member.',
        errorText: null,
      });
      return slip;
    } catch (error) {
      this._setState({
        saving: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The activation slip could not be issued.',
      });
      return null;
    }
  }
}

export default SettingsPresenter;
