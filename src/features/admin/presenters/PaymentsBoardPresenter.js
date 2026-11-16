/**
 * AD24 — Finance reconciliation is represented by imported/synchronised
 * settlement batches and their exact backend rows. The UI does not invent
 * invoice matches; a row is only actionable when the backend supplies a
 * linked payment and supported resolution metadata.
 */
import { ApiError } from '../api/ApiError';

const moneyLabel = (minor) => '₦' + (Number(minor ?? 0) / 100).toLocaleString('en-NG', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export class PaymentsBoardPresenter {
  constructor(financeModel) {
    this.model = financeModel;
    this._render = null;
    this._alive = false;
    this.initialState = {
      status: 'loading',
      settlements: [],
      payments: [],
      exceptions: [],
      errorText: null,
      notice: null,
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
      const [batches, payments, exceptions] = await Promise.all([
        this.model.settlements(),
        this.model.payments(),
        this.model.exceptions(),
      ]);
      const settlements = await Promise.all((batches.items ?? []).map(async (summary) => {
        const detail = await this.model.settlementById(summary.id);
        const rows = (detail.rows ?? []).map((row) => ({
          ...row,
          batchId: detail.id,
          amountLabel: moneyLabel(row.amountMinor),
          feeLabel: moneyLabel(row.feeMinor),
          netLabel: moneyLabel(row.netMinor),
          reviewState: row.issue
            ? row.resolution ? 'Reviewed' : 'Needs review'
            : 'Matched',
        }));
        return { ...detail, rows };
      }));
      this._setState({
        status: 'content',
        settlements,
        payments: payments.items ?? [],
        exceptions: (exceptions.items ?? []).map((item) => ({
          ...item,
          stateLabel: 'Verification exception',
        })),
        errorText: null,
      });
    } catch (error) {
      this._setState({
        status: 'error',
        errorText: error instanceof ApiError ? error.message : error?.message ?? 'Could not load the finance records.',
      });
    }
  }

  onOpenPayment(payment) {
    if (this._navigation && payment?.id) {
      this._navigation.navigate('PaymentDetail', { paymentId: payment.id });
    }
  }

  onOpenSettlementRow(row) {
    if (row?.paymentId) {
      this.onOpenPayment({ id: row.paymentId });
      return;
    }
    this._setState({
      notice: row?.issue
        ? 'This statement row has no linked payment. It must be resolved through a reviewed settlement-row decision.'
        : 'This statement row has no linked payment record yet.',
    });
  }

  onRetry() {
    return this.load();
  }
}

export default PaymentsBoardPresenter;
