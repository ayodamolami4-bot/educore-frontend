import { Store } from '../../../core/Store';
import { errorMessage } from '../../../api/errors';
import { normalisePhone, passwordValue, validEmail } from '../../../utils/validation';
export class SettingsPresenter extends Store {
  model;
  session;
  constructor(model, session) {
    const account = session.getSnapshot().account;
    super({
      phone: account?.phone ?? '',
      email: '',
      currentPassword: '',
      busy: false,
      loading: true,
      error: '',
      notice: '',
      preferences: null,
      sessions: [],
      recoveryCode: '',
      emailRequest: null,
      version: account?.version ?? 1,
    });
    this.model = model;
    this.session = session;
  }
  field(name, value) {
    this.patch({ [name]: value, error: '' });
  }
  async load() {
    this.patch({ loading: true, error: '' });
    try {
      const [account, preferences, sessions] = await Promise.all([
        this.model.account(),
        this.model.preferences(),
        this.model.sessions(),
      ]);
      this.session.updateAccount(account);
      this.patch({
        phone: account.phone ?? '',
        version: account.version,
        preferences,
        sessions: sessions.items,
        emailRequest: account.pendingEmailMasked ? this.state.emailRequest : null,
        notice: '',
      });
    } catch (error) {
      this.patch({ error: errorMessage(error) });
    } finally {
      this.patch({ loading: false });
    }
  }
  async run(action) {
    if (this.state.busy) return;
    this.patch({ busy: true, error: '', notice: '' });
    try {
      await action();
    } catch (error) {
      this.patch({ error: errorMessage(error) });
    } finally {
      this.patch({ busy: false, currentPassword: '' });
    }
  }
  async savePhone() {
    await this.run(async () => {
      const result = await this.model.savePhone(
        normalisePhone(this.state.phone),
        this.state.version,
      );
      this.session.updateAccount(result);
      this.patch({
        version: result.version,
        phone: result.phone ?? '',
        notice:
          'Contact phone updated. Your school’s official records are managed by the school office.',
      });
    });
  }
  async setPreference(key, value) {
    await this.run(async () => {
      const current = this.state.preferences;
      if (!current) return;
      const result = await this.model.savePreferences({
        pushEnabled: key === 'pushEnabled' ? value : current.pushEnabled,
        emailOptionalEnabled: key === 'emailOptionalEnabled' ? value : current.emailOptionalEnabled,
        categories: current.categories,
      });
      this.patch({
        preferences: result,
        notice: 'Notification preferences saved. In-app notifications remain available.',
      });
    });
  }
  async requestEmailChange() {
    await this.run(async () => {
      const email = validEmail(this.state.email);
      const proof = await this.model.reauthenticate(
        passwordValue(this.state.currentPassword, 'your current password to verify this change'),
      );
      const result = await this.model.changeEmail(email, proof.recentAuthToken);
      this.patch({
        emailRequest: result,
        email: '',
        notice:
          'Verification requested. Your current verified email stays active until the new address is verified.',
      });
    });
  }
  async rotateRecovery() {
    await this.run(async () => {
      const proof = await this.model.reauthenticate(
        passwordValue(this.state.currentPassword, 'your current password'),
      );
      const result = await this.model.rotateRecovery(proof.recentAuthToken);
      this.patch({
        recoveryCode: result.recoveryCode,
        notice: 'Your previous saved recovery code is no longer valid.',
      });
    });
  }
  async revokeOtherSessions() {
    await this.run(async () => {
      const proof = await this.model.reauthenticate(
        passwordValue(this.state.currentPassword, 'your current password'),
      );
      await this.model.revokeOtherSessions(proof.recentAuthToken);
      this.patch({
        sessions: this.state.sessions.filter((s) => s.current),
        notice: 'Other sessions have been signed out.',
      });
    });
  }
  clearRecoveryCode() {
    this.patch({ recoveryCode: '' });
  }
  notice(value) {
    this.patch({ notice: value });
  }
}
