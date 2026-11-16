/**
 * AD23 — Invoice detail and a versioned office payment record.
 * Amounts are converted to kobo for the API; the backend validates balance,
 * part-payment policy, evidence and the invoice version.
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
      status: 'loading',
      invoice: null,
      payments: [],
      method: 'CASH',
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
      const invoice = await this.model.invoiceById(invoiceId);
      const payments = invoice.confirmedPayments ?? [];
      this._setState({
        status: 'content',
        invoice,
        payments,
        errorText: null,
      });
      return invoice;
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not load this invoice.',
      });
      return null;
    }
  }

  onRetry() {
    return this.load(this._invoiceId);
  }

  balanceMinor(invoice) {
    return Math.max(0, Number(invoice?.balanceMinor ?? 0));
  }

  onPickMethod(method) {
    if (!['CASH', 'BANK'].includes(method)) return;
    this._setState({ method });
  }

  async recordPayment({ amount, method, reference, verificationReference, reason }) {
    if (this.state.saving) return false;
    const value = Number(String(amount ?? '').replace(/[^0-9.]/g, ''));
    const amountMinor = Math.round(value * 100);
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      this._setState({ errorText: 'Enter a valid payment amount in naira.' });
      return false;
    }
    const invoice = this.state.invoice;
    const balance = this.balanceMinor(invoice);
    if (balance <= 0) {
      this._setState({ errorText: 'This invoice has no outstanding balance.' });
      return false;
    }
    if (amountMinor > balance) {
      this._setState({
        errorText: 'The payment exceeds the outstanding balance of ' + (balance / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' }) + '.',
      });
      return false;
    }
    if (!invoice?.partialAllowed && amountMinor !== balance) {
      this._setState({ errorText: 'This invoice does not allow part payments. Enter the exact outstanding balance.' });
      return false;
    }
    if (!['CASH', 'BANK'].includes(method)) {
      this._setState({ errorText: 'Choose Cash or verified Bank Transfer.' });
      return false;
    }
    if (String(reference ?? '').trim().length < 3) {
      this._setState({ errorText: 'Enter the receipt or bank reference (at least 3 characters).' });
      return false;
    }
    if (String(verificationReference ?? '').trim().length < 5) {
      this._setState({ errorText: 'Enter the independent verification evidence reference (at least 5 characters).' });
      return false;
    }
    if (String(reason ?? '').trim().length < 5) {
      this._setState({ errorText: 'Enter a recording reason (at least 5 characters).' });
      return false;
    }
    if (!Number.isSafeInteger(invoice.version) || invoice.version < 1) {
      this._setState({ errorText: 'The invoice version is missing. Refresh before recording a payment.' });
      return false;
    }

    this._setState({ saving: true, errorText: null, notice: null });
    try {
      await this.model.manualPayment(this._invoiceId, {
        amountMinor,
        method,
        reference: String(reference).trim(),
        verificationReference: String(verificationReference).trim(),
        reason: String(reason).trim(),
      }, invoice.version);
      await this.load(this._invoiceId);
      this._setState({
        notice: 'Payment recorded and confirmed. The invoice balance has been refreshed from the school ledger.',
      });
      return true;
    } catch (error) {
      this._setState({
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The payment could not be recorded.',
      });
      return false;
    } finally {
      if (this._alive) this._setState({ saving: false });
    }
  }
}

export default InvoiceDetailPresenter;
