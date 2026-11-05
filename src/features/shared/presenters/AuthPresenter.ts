import { Store } from '../../../core/Store';
import type { SessionStore } from '../../../core/SessionStore';
import type { SharedModel } from '../models/SharedModel';
import type { PasswordFlow, PasswordSaved } from '../../../api/contracts';
import { errorMessage, localError } from '../../../api/errors';
import { newPassword, required, passwordValue } from '../../../utils/validation';

export interface AuthValues {
  identifier: string;
  password: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
  currentPassword: string;
}
interface AuthState {
  values: AuthValues;
  busy: boolean;
  error: string;
  notice: string;
  saved: PasswordSaved | null;
}
const emptyValues: AuthValues = {
  identifier: '',
  password: '',
  code: '',
  newPassword: '',
  confirmPassword: '',
  currentPassword: '',
};

export class AuthPresenter extends Store<AuthState> {
  constructor(
    private model: SharedModel,
    private session: SessionStore,
    private installationId: string,
  ) {
    super({ values: { ...emptyValues }, busy: false, error: '', notice: '', saved: null });
  }
  field(name: keyof AuthValues, value: string): void {
    this.patch({ values: { ...this.state.values, [name]: value }, error: '' });
  }
  demo(): void {
    this.patch({
      values: {
        ...this.state.values,
        identifier: 'EC-DEMO-001',
        password: 'EduCore learning demo 2026!',
      },
      error: '',
    });
  }
  private async run<T>(action: () => Promise<T>): Promise<T | undefined> {
    if (this.state.busy) return;
    this.patch({ busy: true, error: '', notice: '' });
    try {
      return await action();
    } catch (error) {
      this.patch({ error: errorMessage(error) });
    } finally {
      this.patch({ busy: false });
    }
  }
  async signIn(): Promise<void> {
    await this.run(async () => {
      const { identifier, password } = this.state.values;
      await this.session.signIn(
        required(identifier, 'your EduCore ID or verified email'),
        passwordValue(password),
        this.installationId,
      );
      this.patch({ values: { ...emptyValues } });
    });
  }
  activation(token?: string): Promise<PasswordFlow | undefined> {
    return this.run(() =>
      this.model.activation(
        token
          ? { invitationToken: token }
          : {
              loginId: required(this.state.values.identifier, 'the login ID on your slip'),
              activationCode: required(this.state.values.code, 'your one-time activation code'),
            },
      ),
    );
  }
  async requestEmailRecovery(): Promise<void> {
    await this.run(async () => {
      const result = await this.model.emailRecovery(
        required(this.state.values.identifier, 'your EduCore ID or verified email'),
      );
      this.patch({ notice: result.message });
    });
  }
  savedCodeRecovery(): Promise<PasswordFlow | undefined> {
    return this.run(() =>
      this.model.savedCodeRecovery(
        required(this.state.values.identifier, 'your EduCore ID'),
        required(this.state.values.code, 'your saved personal recovery code'),
      ),
    );
  }
  reviewEmailRecovery(token: string): Promise<PasswordFlow | undefined> {
    return this.run(() => this.model.reviewEmailRecovery(token));
  }
  async savePassword(flow?: PasswordFlow, change = false): Promise<void> {
    await this.run(async () => {
      const values = this.state.values;
      const password = newPassword(values.newPassword, values.confirmPassword);
      if (!change && (!flow || Date.parse(flow.expiresAt) <= Date.now()))
        throw localError('This password link expired. Request a new link or use account recovery.');
      const saved = change
        ? await this.model.changePassword(
            passwordValue(values.currentPassword, 'your current password'),
            password,
          )
        : await this.model.savePassword(flow!.flowToken, password);
      this.patch({
        saved,
        values: { ...emptyValues },
        notice: 'Your password has been saved. Use it for your next sign-in.',
      });
    });
  }
  clearSecret(): void {
    this.patch({ saved: null, values: { ...emptyValues } });
  }
}
