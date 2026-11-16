/**
 * AD25 — Payment and its fee-adjustment refund workflow.
 * Requests and decisions use the backend's amount, payment, reason and
 * version fields. Provider confirmation requires its reference and evidence;
 * there is no standalone refund-execution route.
 */
import { ApiError } from '../api/ApiError';

export class PaymentDetailPresenter {
  constructor(financeModel) {
    this.model = financeModel;
    this._render = null;
    this._navigation = null;
    this._alive = false;
    this._paymentId = null;
    this.initialState = {
      status: 'loading',
      payment: null,
      refunds: [],
      saving: null,
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

  async load(paymentId) {
    this._paymentId = paymentId;
    this._setState({ status: 'loading', errorText: null });
    try {
      const payment = await this.model.paymentById(paymentId);
      const refunds = await this.model.refundRequests({ paymentId });
      this._setState({
        status: 'content',
        payment,
        refunds: refunds.items ?? [],
        errorText: null,
      });
      return payment;
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not load this payment.',
      });
      return null;
    }
  }

  onRetry() {
    return this.load(this._paymentId);
  }

  async onRequestRefund(reason) {
    if (this.state.saving) return false;
    const payment = this.state.payment;
    const trimmed = String(reason ?? '').trim();
    if (!payment?.invoiceId || !payment?.id) {
      this._setState({ errorText: 'The payment is not linked to an invoice, so a refund cannot be requested.' });
      return false;
    }
    if (trimmed.length < 5) {
      this._setState({ errorText: 'Enter a refund reason of at least five characters.' });
      return false;
    }
    const amountMinor = Number(payment.allocatedMinor ?? payment.amountMinor ?? 0);
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      this._setState({ errorText: 'The confirmed payment has no refundable allocated amount.' });
      return false;
    }

    this._setState({ saving: 'request', errorText: null, notice: null });
    try {
      await this.model.requestRefund({
        invoiceId: payment.invoiceId,
        paymentId: payment.id,
        amountMinor,
        reason: trimmed,
      });
      await this.load(this._paymentId);
      this._setState({ notice: 'Refund adjustment request submitted for Principal review.' });
      return true;
    } catch (error) {
      this._setState({
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The refund request could not be raised.',
      });
      return false;
    } finally {
      if (this._alive) this._setState({ saving: null });
    }
  }

  async onDecision(refund, action, reason) {
    if (this.state.saving) return false;
    const trimmed = String(reason ?? '').trim();
    if (trimmed.length < 5) {
      this._setState({ errorText: 'Enter a decision reason of at least five characters.' });
      return false;
    }
    if (!Number.isSafeInteger(refund?.version) || refund.version < 1) {
      this._setState({ errorText: 'The refund request version is missing. Refresh the payment.' });
      return false;
    }
    if (!['approve', 'reject'].includes(action)) return false;

    this._setState({ saving: 'decide:' + refund.id, errorText: null, notice: null });
    try {
      await this.model.decideRefund(refund.id, {
        action,
        reason: trimmed,
      }, refund.version);
      await this.load(this._paymentId);
      this._setState({
        notice: action === 'approve'
          ? 'Refund approved. Provider processing must be completed and independently verified before confirmation.'
          : 'Refund request rejected.',
      });
      return true;
    } catch (error) {
      this._setState({
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The refund decision could not be saved.',
      });
      return false;
    } finally {
      if (this._alive) this._setState({ saving: null });
    }
  }

  async onConfirmRefund(refund, reference, verificationReference) {
    if (this.state.saving) return false;
    const providerReference = String(reference ?? '').trim();
    const evidence = String(verificationReference ?? '').trim();
    if (providerReference.length < 3 || evidence.length < 5) {
      this._setState({ errorText: 'Enter the provider refund reference and independent verification evidence.' });
      return false;
    }
    if (!Number.isSafeInteger(refund?.version) || refund.version < 1) {
      this._setState({ errorText: 'The approved refund version is missing. Refresh the payment.' });
      return false;
    }

    this._setState({ saving: 'confirm:' + refund.id, errorText: null, notice: null });
    try {
      await this.model.confirmRefundManually(refund.id, {
        reference: providerReference,
        verificationReference: evidence,
      }, refund.version);
      await this.load(this._paymentId);
      this._setState({ notice: 'The backend verified and confirmed the refund.' });
      return true;
    } catch (error) {
      this._setState({
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'The refund was not confirmed.',
      });
      return false;
    } finally {
      if (this._alive) this._setState({ saving: null });
    }
  }
}

export default PaymentDetailPresenter;
