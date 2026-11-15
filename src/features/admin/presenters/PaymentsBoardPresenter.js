/**
 * AD24 — Payments and money checks. Settlements are the Paystack money that
 * arrived; the ledger is every payment row; reconciliation is the office
 * action of matching a settlement to the invoice it pays.
 */
import { ApiError } from '../api/ApiError';

export class PaymentsBoardPresenter {
  constructor(financeModel) {
    this.model = financeModel;
    this._render = null;
    this._alive = false;
    this.initialState = {
      status: 'loading', // loading | content | error
      settlements: [],
      payments: [],
      exceptions: [],
      errorText: null,
      notice: null,
      busyId: null,
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
    this._setState({ status: 'loading', errorText: null, notice: null });
    try {
      const [settlements, payments, exceptions] = await Promise.all([
        this.model.settlements({ page: 1 }),
        this.model.payments({ page: 1 }),
        this.model.exceptions({ page: 1 }),
      ]);
      this._setState({
        status: 'content',
        settlements: settlements.items || [],
        payments: payments.items || [],
        exceptions: exceptions.items || [],
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : 'Could not load the payments.',
      });
    }
  }

  /** Open one ledger payment's detail and refund review (AD25). */
  onOpenPayment(payment) {
    if (this._navigation && payment) {
      this._navigation.navigate('PaymentDetail', { paymentId: payment.id });
    }
  }

  /** A matched settlement opens the payment it settled (its money trail). */
  onOpenSettlementPayment(settlement) {
    if (!this._navigation || !settlement) return;
    const payment = this.state.payments.find((p) => p.reference === settlement.reference);
    if (payment) {
      this._navigation.navigate('PaymentDetail', { paymentId: payment.id });
    } else {
      this._setState({ notice: 'No ledger row carries this reference yet.' });
    }
  }

  /** Match a settlement's payment to the invoice it covers. */
  async reconcile(settlement) {
    if (this.state.busyId) return;
    const payment = this.state.payments.find((p) => p.reference === settlement.reference);
    if (!payment) {
      this._setState({ notice: 'No ledger row matches this reference — open an exception instead.' });
      return;
    }
    this._setState({ busyId: payment.id, errorText: null, notice: null });
    try {
      await this.model.createReconciliation({
        paymentId: payment.id,
        invoiceNumber: settlement.invoiceNumber,
      });
      await this.load();
      this._setState({
        notice: `Matched ${settlement.amountLabel} from ${settlement.studentName} to ${settlement.invoiceNumber}.`,
      });
    } catch (error) {
      this._setState({
        errorText:
          error instanceof ApiError ? error.message : 'The payment could not be reconciled.',
      });
    } finally {
      if (this._alive) this._setState({ busyId: null });
    }
  }

  /** Resolve (or flag for refund) a webhook exception. */
  async resolveException(exception, action = 'resolve') {
    if (this.state.busyId) return;
    this._setState({ busyId: exception.id, errorText: null, notice: null });
    try {
      await this.model.actOnException(exception.id, { action });
      await this.load();
      this._setState({
        notice:
          action === 'refund-flag'
            ? `${exception.reference} is flagged for refund review.`
            : `${exception.reference} is marked resolved.`,
      });
    } catch (error) {
      this._setState({
        errorText:
          error instanceof ApiError ? error.message : 'The exception could not be updated.',
      });
    } finally {
      if (this._alive) this._setState({ busyId: null });
    }
  }

  onRetry() {
    return this.load();
  }
}

export default PaymentsBoardPresenter;
