import { Store } from '../../../core/Store';
import type { SharedModel } from '../models/SharedModel';
import { errorMessage } from '../../../api/errors';
interface EmailState {
  busy: boolean;
  error: string;
  notice: string;
  verified: boolean;
}
export class EmailVerificationPresenter extends Store<EmailState> {
  private resendKey: string | undefined;
  constructor(
    private model: SharedModel,
    private uuid: () => string,
  ) {
    super({ busy: false, error: '', notice: '', verified: false });
  }
  async confirm(token: string): Promise<void> {
    if (this.state.busy) return;
    this.patch({ busy: true, error: '' });
    try {
      const result = await this.model.verifyEmail(token);
      this.patch({ verified: true, notice: result.message });
    } catch (error) {
      this.patch({ error: errorMessage(error) });
    } finally {
      this.patch({ busy: false });
    }
  }
  async resend(requestId: string): Promise<void> {
    if (this.state.busy) return;
    this.patch({ busy: true, error: '' });
    this.resendKey ??= this.uuid();
    try {
      await this.model.resendEmail(requestId, this.resendKey);
      this.resendKey = undefined;
      this.patch({
        notice:
          'A replacement verification link has been requested. Earlier unused links no longer work.',
      });
    } catch (error) {
      this.patch({ error: errorMessage(error) });
    } finally {
      this.patch({ busy: false });
    }
  }
}
