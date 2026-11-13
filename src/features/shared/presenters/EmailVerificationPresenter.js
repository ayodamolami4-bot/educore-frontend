import { Store } from '../../../core/Store.js';
import { errorMessage } from '../../../api/errors.js';

export class EmailVerificationPresenter extends Store {
  resendKey;
  constructor(model, uuid) {
    super({ busy: false, error: '', notice: '', verified: false });
    this.model = model;
    this.uuid = uuid;
  }
  async confirm(token) {
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
  async resend(requestId) {
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
