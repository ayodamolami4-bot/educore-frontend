/**
 * AD25 — One payment and its refund review. Shows the payment's facts and
 * the refund requests raised against it, and runs the refund state machine
 * (request → decide → execute or manual confirmation). Every action posts
 * through the Model and reloads.
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
      status: 'loading', // loading | content | error
      payment: null,
      refunds: [],
      saving: null, // which action is mid-flight
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
      const [payment, refunds] = await Promise.all([
        this.model.paymentById(paymentId),
        this.model.refundRequests({ paymentId }),
      ]);
      this._setState({
        status: 'content',
        payment,
        refunds: (refunds && refunds.items) || [],
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load this payment.',
      });
    }
  }

  onRetry() {
    return this.load(this._paymentId);
  }

  /** Office raises a refund request against this payment. */
  async onRequestRefund(reason) {
    if (this.state.saving) return;
    const trimmed = String(reason || '').trim();
    if (!trimmed) {
      this._setState({ errorText: 'Give a short reason for the refund request.' });
      return;
    }
    this._setState({ saving: 'request', errorText: null, notice: null });
    try {
      const result = await this.model.requestRefund({ paymentId: this._paymentId, reason: trimmed });
      if (result && result.ok === false) {
        this._setState({ errorText: result.error || 'The refund request could not be raised.' });
        return;
      }
      await this.load(this._paymentId);
      this._setState({ notice: 'Refund request raised — it is now Pending.' });
    } catch (error) {
      this._setState({
        errorText:
          error instanceof ApiError ? error.message : 'The refund request could not be raised.',
      });
    } finally {
      if (this._alive) this._setState({ saving: null });
    }
  }

  /** Approve or reject a Pending request (the office decides). */
  async onDecision(refund, action) {
    if (this.state.saving) return;
    this._setState({ saving: `decide:${refund.id}`, errorText: null, notice: null });
    try {
      await this.model.decideRefund(refund.id, { action });
      await this.load(this._paymentId);
      this._setState({
        notice: action === 'approve' ? 'Refund approved.' : 'Refund request rejected.',
      });
    } catch (error) {
      this._setState({
        errorText: error instanceof ApiError ? error.message : 'The decision could not be saved.',
      });
    } finally {
      if (this._alive) this._setState({ saving: null });
    }
  }

  /** Paystack executes the approved refund. */
  async onExecute(refund) {
    if (this.state.saving) return;
    this._setState({ saving: `execute:${refund.id}`, errorText: null, notice: null });
    try {
      await this.model.executeRefund(refund.id);
      await this.load(this._paymentId);
      this._setState({ notice: 'Refund executed through Paystack.' });
    } catch (error) {
      this._setState({
        errorText: error instanceof ApiError ? error.message : 'The refund could not be executed.',
      });
    } finally {
      if (this._alive) this._setState({ saving: null });
    }
  }

  /** Cash/transfer refund done by hand at the office, then confirmed here. */
  async onConfirmManual(refund) {
    if (this.state.saving) return;
    this._setState({ saving: `confirm:${refund.id}`, errorText: null, notice: null });
    try {
      await this.model.confirmRefundManually(refund.id, {});
      await this.load(this._paymentId);
      this._setState({ notice: 'Marked as refunded (manual confirmation).' });
    } catch (error) {
      this._setState({
        errorText: error instanceof ApiError ? error.message : 'The confirmation could not be saved.',
      });
    } finally {
      if (this._alive) this._setState({ saving: null });
    }
  }
}

export default PaymentDetailPresenter;
