/**
 * AD10 — School settings and admin access (Presenter). The school profile
 * and the admin memberships load in one pass; saving patches the settings,
 * membership edits go through their own endpoints.
 */
import { ApiError } from '../api/ApiError';
import { emailError, phoneError } from '../api/validation.js';
// The settings model is injected by the view (constructor) — no static model
// import here, so this presenter stays importable in node tests.

export class SettingsPresenter {
  constructor(settingsModel) {
    this.model = settingsModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this.initialState = {
      status: 'loading', // loading | content | error
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
      const [settingsResult, membershipsPage] = await Promise.all([
        this.model.get(),
        this.model.adminMemberships(),
      ]);
      this._setState({
        status: 'content',
        settings: settingsResult.settings,
        memberships: membershipsPage.items,
        errorText: null,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText:
          error instanceof ApiError ? error.message : 'Could not load the school settings.',
      });
    }
  }

  onRetry() {
    return this.load();
  }

  async saveSettings(fields) {
    if (this.state.saving) return false;
    if (!fields.schoolName || !fields.schoolName.trim()) {
      this._setState({ notice: null, errorText: 'The school needs a name.' });
      return false;
    }
    // Session: the CURRENT year pair only — it follows the device date and
    // nobody types it ("2029-2030" is refused, not just any two years).
    const session = String(fields.sessionLabel || '').replace(/\s+/g, '');
    const now = new Date();
    const currentSession = `${now.getFullYear()}-${now.getFullYear() + 1}`;
    if (session !== currentSession) {
      this._setState({
        notice: null,
        errorText: `The session follows the device date and cannot be changed — it is ${currentSession}.`,
      });
      return false;
    }
    if (!['First Term', 'Second Term', 'Third Term'].includes(fields.termLabel)) {
      this._setState({ notice: null, errorText: 'Pick First, Second or Third Term.' });
      return false;
    }
    if (fields.email) {
      const emailProblem = emailError(fields.email);
      if (emailProblem) {
        this._setState({ notice: null, errorText: emailProblem });
        return false;
      }
    }
    if (fields.phone) {
      const phoneProblem = phoneError(fields.phone);
      if (phoneProblem) {
        this._setState({ notice: null, errorText: phoneProblem });
        return false;
      }
    }
    if (fields.nextTermBegins && !/^\d{4}-\d{2}-\d{2}$/.test(fields.nextTermBegins.trim())) {
      this._setState({
        notice: null,
        errorText: 'Next term begins must be a date like 2027-01-11.',
      });
      return false;
    }
    this._setState({ saving: true, notice: null, errorText: null });
    try {
      const result = await this.model.update({ ...fields, sessionLabel: session });
      this._setState({
        saving: false,
        settings: result.settings,
        notice: 'School settings saved — the header on every screen follows the name.',
      });
      return true;
    } catch (error) {
      this._setState({
        saving: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'The settings were not saved.',
      });
      return false;
    }
  }

  async addMembership(fields) {
    if (this.state.saving) return false;
    if (!fields.fullName || !fields.fullName.trim()) {
      this._setState({ notice: null, errorText: "Enter the admin's full name." });
      return false;
    }
    const inviteEmail = emailError(fields.email) || (!fields.email ? 'Enter the email the invitation goes to.' : null);
    if (inviteEmail) {
      this._setState({ notice: null, errorText: inviteEmail });
      return false;
    }
    const adminPhone = phoneError(fields.phone);
    if (adminPhone) {
      this._setState({ notice: null, errorText: adminPhone });
      return false;
    }
    this._setState({ saving: true, notice: null, errorText: null });
    try {
      const result = await this.model.addAdminMembership(fields);
      this._setState({
        saving: false,
        memberships: [...this.state.memberships, result.membership],
        notice: `${result.membership.fullName} can now sign in as ${result.membership.role}. An invitation goes to their email.`,
      });
      return true;
    } catch (error) {
      this._setState({
        saving: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'The admin account was not created.',
      });
      return false;
    }
  }

  async changeMembership(membershipId, patch, label) {
    if (this.state.saving) return;
    this._setState({ saving: true, notice: null, errorText: null });
    try {
      const result = await this.model.updateAdminMembership(membershipId, patch);
      this._setState({
        saving: false,
        memberships: this.state.memberships.map((m) =>
          m.id === membershipId ? result.membership : m,
        ),
        notice: label || 'Admin access updated.',
      });
    } catch (error) {
      this._setState({
        saving: false,
        notice: null,
        errorText: error instanceof ApiError ? error.message : 'The change was not saved.',
      });
    }
  }
}

export default SettingsPresenter;
