/**
 * AD23 — One invoice: what is billed, what has been paid, and the office
 * action of recording a cash/transfer/POS payment. Money math stays in the
 * API; the demo clamps to the balance with the same rule.
 */
import { ApiError } from '../api/ApiError';

export class InvoiceDetailPresenter {
  constructor(financeModel) {
    this.model = financeModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this._invoiceId = null;
    this.initialState = {
      status: 'loading', // loading | content | error
      invoice: null,
      payments: [],
      method: 'Cash',
      saving: false,
      notice: null,
      errorText: null,
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

  async load(invoiceId) {
    this._invoiceId = invoiceId;
    this._setState({ status: 'loading', errorText: null });
    try {
      const [invoice, payments] = await Promise.all([
        this.model.invoiceById(invoiceId),
        this.model.invoicePayments(invoiceId),
      ]);
      this._setState({
        status: 'content',
        invoice,
        payments: (payments && payments.items) || [],
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load this invoice.',
      });
    }
  }

  onRetry() {
    return this.load(this._invoiceId);
  }

  /** Balance in naira from the numeric fields the API sends. */
  balanceNumber(invoice) {
    const amount = Number(invoice && invoice.amount) || 0;
    const paid = Number(invoice && invoice.paid) || 0;
    return Math.max(0, amount - paid);
  }

  onPickMethod(method) {
    this._setState({ method });
  }

  async recordPayment({ amount, method, reference }) {
    if (this.state.saving) return;
    const value = Number(String(amount).replace(/[^0-9.]/g, ''));
    if (!value || value <= 0) {
      this._setState({ errorText: 'Enter the amount in naira — numbers only.' });
      return;
    }
    const balance = this.balanceNumber(this.state.invoice);
    if (balance <= 0) {
      this._setState({
        errorText:
          'This bill is already fully paid — there is nothing left to record. The payments list below shows what came in.',
      });
      return;
    }
    if (value > balance) {
      const name = (this.state.invoice && this.state.invoice.studentName) || 'the student';
      this._setState({
        errorText:
          `That payment is ₦${(value - balance).toLocaleString('en-NG')} more than what ` +
          `${name} owes. This bill still has ₦${balance.toLocaleString('en-NG')} outstanding — ` +
          `enter ₦${balance.toLocaleString('en-NG')} or less. For anything extra, record it on a new bill or raise a refund.`,
      });
      return;
    }
    this._setState({ saving: true, errorText: null, notice: null });
    try {
      const result = await this.model.manualPayment(this._invoiceId, {
        amount: value,
        method,
        reference: reference || undefined,
      });
      if (result && result.ok === false) {
        this._setState({ errorText: result.error || 'The payment could not be recorded.' });
        return;
      }
      await this.load(this._invoiceId);
      const balanceAfter = Number((result && result.balanceAfter) || 0);
      this._setState({
        notice: `Recorded ${method.toLowerCase()} payment of ₦${value.toLocaleString(
          'en-NG',
        )}. Balance is now ₦${balanceAfter.toLocaleString('en-NG')}.`,
      });
    } catch (error) {
      this._setState({
        errorText:
          error instanceof ApiError ? error.message : 'The payment could not be recorded.',
      });
    } finally {
      if (this._alive) this._setState({ saving: false });
    }
  }
}

export default InvoiceDetailPresenter;
