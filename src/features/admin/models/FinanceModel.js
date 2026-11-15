/**
 * AD21–AD25 — Finance: fee plans, invoices, payments, reconciliation,
 * refunds, exceptions, settlements.
 *
 * Money rules live in the Java API: balances, reconciliation status and
 * Paystack webhook truth. This Model only reads what the backend decided
 * and passes office actions (manual payments, decisions) through.
 */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

export const FinanceModel = {
  // ── AD21 — Fee plans and invoice issue ──────────────────────────────
  async feePlans(query) {
    return normalizePage(await api.get(endpoints.finance.feePlans, null, query));
  },

  async feePlanById(planId) {
    return api.get(endpoints.finance.feePlanById, { planId });
  },

  async createFeePlan(body) {
    return api.post(endpoints.finance.feePlans, null, body);
  },

  async updateFeePlan(planId, body) {
    return api.patch(endpoints.finance.feePlanById, { planId }, body);
  },

  async issuePreview(planId, body) {
    return api.post(endpoints.finance.issuePreview, { planId }, body);
  },

  /** Issue bills for a plan (e.g. a term's boarding fees) to matching students. */
  async issuePlan(planId, body) {
    return api.post(endpoints.finance.issuePlan, { planId }, body);
  },

  // ── AD22/AD23 — Invoices ────────────────────────────────────────────
  async invoices(query) {
    return normalizePage(await api.get(endpoints.finance.invoices, null, query));
  },

  async invoiceById(invoiceId) {
    return api.get(endpoints.finance.invoiceById, { invoiceId });
  },

  /** The payments already recorded on one invoice (AD23). */
  async invoicePayments(invoiceId) {
    return api.get(endpoints.finance.invoicePayments, { invoiceId });
  },

  /** Record cash/transfer paid at the school office (Paystack is the online route). */
  async manualPayment(invoiceId, body) {
    return api.post(endpoints.finance.manualPayments, { invoiceId }, body);
  },

  async receiptById(receiptId) {
    return api.get(endpoints.finance.receiptById, { receiptId });
  },

  // ── AD23 — Adjustment requests ──────────────────────────────────────
  async adjustmentRequests(query) {
    return normalizePage(await api.get(endpoints.finance.adjustmentRequests, null, query));
  },

  async adjustmentById(adjustmentId) {
    return api.get(endpoints.finance.adjustmentById, { adjustmentId });
  },

  async requestAdjustment(body) {
    return api.post(endpoints.finance.adjustmentRequests, null, body);
  },

  async decideAdjustment(adjustmentId, body) {
    return api.post(endpoints.finance.adjustmentDecision, { adjustmentId }, body);
  },

  // ── AD24 — Payments and reconciliation ──────────────────────────────
  async paymentAttempts(query) {
    return normalizePage(await api.get(endpoints.finance.paymentAttempts, null, query));
  },

  async payments(query) {
    return normalizePage(await api.get(endpoints.finance.payments, null, query));
  },

  async reconciliations(query) {
    return normalizePage(await api.get(endpoints.finance.reconciliations, null, query));
  },

  async createReconciliation(body) {
    return api.post(endpoints.finance.reconciliations, null, body);
  },

  async reconciliationById(reconciliationId) {
    return api.get(endpoints.finance.reconciliationById, { reconciliationId });
  },

  async exceptions(query) {
    return normalizePage(await api.get(endpoints.finance.exceptions, null, query));
  },

  async settlements(query) {
    return normalizePage(await api.get(endpoints.finance.settlements, null, query));
  },

  // ── AD25 — Payment detail, refunds, exception actions ────────────────
  async paymentById(paymentId) {
    return api.get(endpoints.finance.paymentById, { paymentId });
  },

  async exceptionById(exceptionId) {
    return api.get(endpoints.finance.exceptionById, { exceptionId });
  },

  async actOnException(exceptionId, body) {
    return api.post(endpoints.finance.exceptionActions, { exceptionId }, body);
  },

  async settlementById(settlementId) {
    return api.get(endpoints.finance.settlementById, { settlementId });
  },

  async refundRequests(query) {
    return normalizePage(await api.get(endpoints.finance.refundRequests, null, query));
  },

  async refundById(refundId) {
    return api.get(endpoints.finance.refundById, { refundId });
  },

  async requestRefund(body) {
    return api.post(endpoints.finance.refundRequests, null, body);
  },

  async decideRefund(refundId, body) {
    return api.post(endpoints.finance.refundDecision, { refundId }, body);
  },

  async executeRefund(refundId) {
    return api.post(endpoints.finance.refundExecute, { refundId });
  },

  async confirmRefundManually(refundId, body) {
    return api.post(endpoints.finance.refundManualConfirmation, { refundId }, body);
  },
};

export default FinanceModel;
