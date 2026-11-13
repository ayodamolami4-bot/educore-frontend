import { errorMessage } from '../../../api/errors.js';
import { Store } from '../../../core/Store.js';

export class PaymentPresenter extends Store {
  constructor(model, { invoiceId, paymentId, intentId }) {
    super({
      detail: null,
      payment: null,
      intent: null,
      refunds: [],
      refundError: '',
      busy: false,
      error: '',
    });
    this.model = model;
    this.invoiceId = invoiceId;
    this.paymentId = paymentId;
    this.intentId = intentId;
  }

  async load({ verify = false, signal } = {}) {
    if (this.state.busy) return;
    this.patch({ busy: true, error: '' });
    try {
      const result = this.intentId
        ? await this.model.paymentStatus(this.invoiceId, this.intentId, verify)
        : this.paymentId
          ? await this.model.payment(this.paymentId, this.invoiceId, signal)
          : { detail: await this.model.invoice(this.invoiceId) };
      if (signal?.aborted) return;
      this.patch(result);
      if (this.intentId || this.paymentId) {
        try {
          const refunds = await this.model.refunds(result.detail.invoice.id);
          if (!signal?.aborted) this.patch({ refunds, refundError: '' });
        } catch {
          if (!signal?.aborted)
            this.patch({
              refunds: [],
              refundError: 'Refund information is temporarily unavailable.',
            });
        }
      }
    } catch (error) {
      if (!signal?.aborted)
        this.patch({ detail: null, payment: null, intent: null, error: errorMessage(error) });
    } finally {
      this.patch({ busy: false });
    }
  }

  async checkout(choice, amount, email) {
    if (this.state.busy || !this.state.detail) return;
    this.patch({ busy: true, error: '' });
    try {
      return await this.model.startCheckout(this.state.detail.invoice, choice, amount, email);
    } catch (error) {
      this.patch({ error: errorMessage(error) });
    } finally {
      this.patch({ busy: false });
    }
  }
}
