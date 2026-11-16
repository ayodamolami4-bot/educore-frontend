/**
 * AD21–AD25 — Finance adapters for the live Java finance controllers.
 * The backend owns all balances, payment states, refunds and reconciliation
 * decisions; this module only normalises its records and sends versioned commands.
 */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

const itemsOf = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

const moneyLabel = (minor) => {
  const value = Number(minor ?? 0);
  return '₦' + (value / 100).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

function invoiceView(raw) {
  return {
    ...raw,
    number: raw.number ?? raw.id,
    studentName: raw.studentName ?? 'Student record',
    planName: raw.description ?? 'School invoice',
    amount: Number(raw.totalMinor ?? 0) / 100,
    paid: Number(raw.paidMinor ?? 0) / 100,
    amountLabel: moneyLabel(raw.totalMinor),
    balanceLabel: moneyLabel(raw.balanceMinor),
    dueDate: raw.dueOn ?? '',
    status: raw.status ?? 'UNPAID',
  };
}

function paymentView(raw) {
  return {
    ...raw,
    studentName: raw.studentName ?? 'Student record',
    channel: raw.source ?? raw.method ?? 'Payment',
    status: raw.state ?? 'CONFIRMED',
    amountLabel: moneyLabel(raw.amountMinor),
    paidAt: raw.confirmedAt ?? raw.createdAt ?? '',
  };
}

async function readAll(template, query = {}) {
  const items = [];
  let cursor;
  let hasMore = true;
  do {
    const payload = await api.get(template, null, {
      ...query,
      cursor,
      limit: 100,
    });
    const page = normalizePage(payload);
    items.push(...page.items);
    hasMore = Boolean(payload?.hasMore);
    const next = payload?.nextCursor ?? (hasMore ? page.items.at(-1)?.id : null);
    if (!hasMore || !next || next === cursor || page.items.length === 0) break;
    cursor = next;
  } while (hasMore);
  return items;
}

export const FinanceModel = {
  // AD21 — Fee plan methods retained for other admin views.
  async feePlans(query) {
    return normalizePage(await api.get(endpoints.finance.feePlans, null, query));
  },

  async feePlanById(planId) {
    return api.get(endpoints.finance.feePlanById, { planId });
  },

  async createFeePlan(body) {
    return api.post(endpoints.finance.feePlans, null, body);
  },

  async updateFeePlan(planId, body, version) {
    return api.put(endpoints.finance.feePlanById, { planId }, body, { version });
  },

  async publishFeePlan(planId, version) {
    return api.post(endpoints.finance.publishFeePlan, { planId }, undefined, { version });
  },

  async issuePreview(planId, body) {
    return api.post(endpoints.finance.issuePreview, { planId }, body);
  },

  async feeBatchById(batchId) {
    return api.get(endpoints.finance.feeBatchById, { batchId });
  },

  async issuePlan(batchId, version) {
    return api.post(endpoints.finance.issuePlan, { batchId }, undefined, { version });
  },

  // AD22/AD23 — invoices. The list API supports cursor + studentId, not
  // search/status/page filters, so search and status are applied after reading
  // the server-paged records.
  async invoices(query = {}) {
    const rows = await readAll(endpoints.finance.invoices, {
      studentId: query.studentId,
    });
    const mapped = rows.map(invoiceView);
    const search = String(query.q ?? query.search ?? '').trim().toLowerCase();
    const status = String(query.status ?? 'all').toUpperCase();
    const filtered = mapped.filter((invoice) => {
      const matchesStatus = status === 'ALL' || invoice.status === status;
      const text = [
        invoice.id,
        invoice.number,
        invoice.studentId,
        invoice.studentName,
        invoice.description,
      ].join(' ').toLowerCase();
      return matchesStatus && (!search || text.includes(search));
    });
    return { items: filtered, total: filtered.length, page: 1, pages: 1 };
  },

  async invoiceById(invoiceId) {
    const detail = await api.get(endpoints.finance.invoiceById, { invoiceId });
    return {
      ...invoiceView(detail.invoice ?? detail),
      confirmedPayments: itemsOf(detail.confirmedPayments).map(paymentView),
    };
  },

  async invoicePayments(invoiceId) {
    const invoice = await this.invoiceById(invoiceId);
    return { items: invoice.confirmedPayments ?? [] };
  },

  async manualPayment(invoiceId, body, version) {
    return api.post(
      endpoints.finance.manualPayments,
      { invoiceId },
      {
        amountMinor: body.amountMinor,
        method: body.method,
        reference: body.reference,
        verificationReference: body.verificationReference,
        reason: body.reason,
      },
      { version },
    );
  },

  async receiptById(paymentId) {
    return api.download(endpoints.finance.receiptById, { paymentId });
  },

  // AD23 — fee adjustments are also the backend's refund-request records.
  async adjustmentRequests(query = {}) {
    const rows = await readAll(endpoints.finance.adjustmentRequests, {
      invoiceId: query.invoiceId,
    });
    return {
      items: rows.filter((item) => !query.kind || item.kind === query.kind),
      total: rows.length,
      page: 1,
      pages: 1,
    };
  },

  async adjustmentById(adjustmentId) {
    const raw = await api.get(endpoints.finance.adjustmentById, { adjustmentId });
    return {
      ...raw,
      invoiceId: raw.invoiceId ?? raw.invoice_id,
      paymentId: raw.paymentId ?? raw.payment_id,
      amountMinor: raw.amountMinor ?? raw.amount_minor,
      createdAt: raw.createdAt ?? raw.created_at,
      evidenceReference: raw.evidenceReference ?? raw.evidence_reference,
      status: ({
        REQUESTED: 'Pending',
        APPROVED: 'Approved',
        REJECTED: 'Rejected',
        CONFIRMED: 'Refund confirmed',
        PROCESSING: 'Processing',
        UNKNOWN: 'Unknown',
      })[String(raw.state ?? '').toUpperCase()] ?? raw.state,
      amountLabel: moneyLabel(raw.amountMinor ?? raw.amount_minor),
      reference: raw.evidenceReference ?? raw.evidence_reference ?? '',
    };
  },

  async requestAdjustment(invoiceId, body) {
    return api.post(
      'invoices/{invoiceId}/adjustments',
      { invoiceId },
      {
        kind: body.kind,
        amountMinor: body.amountMinor,
        paymentId: body.paymentId ?? null,
        reason: body.reason,
        evidenceReference: body.evidenceReference ?? null,
      },
    );
  },

  async decideAdjustment(adjustmentId, body, version) {
    return api.post(
      endpoints.finance.refundDecision,
      { refundId: adjustmentId },
      {
        approve: Boolean(body.approve),
        reason: String(body.reason ?? '').trim(),
      },
      { version },
    );
  },

  async confirmRefund(adjustmentId, body, version) {
    return api.post(
      endpoints.finance.refundManualConfirmation,
      { refundId: adjustmentId },
      {
        reference: body.reference,
        verificationReference: body.verificationReference,
      },
      { version },
    );
  },

  // AD24 — payment ledger and payment-intent history.
  async paymentAttempts(query = {}) {
    const payload = await api.get(endpoints.finance.paymentAttempts, null, {
      studentId: query.studentId,
      invoiceId: query.invoiceId,
      state: query.state,
      reference: query.reference,
      from: query.from,
      to: query.to,
      cursor: query.cursor,
      limit: query.limit ?? 30,
    });
    return normalizePage(payload);
  },

  async payments(query = {}) {
    const rows = await readAll(endpoints.finance.payments, {
      studentId: query.studentId,
    });
    const items = rows.map(paymentView);
    return { items, total: items.length, page: 1, pages: 1 };
  },

  async paymentById(paymentId) {
    const payments = await this.payments();
    const payment = payments.items.find((item) => item.id === paymentId);
    if (!payment) throw new Error('This payment is no longer available in the school ledger.');
    return payment;
  },

  async settlements(query = {}) {
    const rows = await readAll(endpoints.finance.settlements, query);
    return { items: rows, total: rows.length, page: 1, pages: 1 };
  },

  async settlementById(settlementId) {
    return api.get(endpoints.finance.settlementById, { settlementId });
  },

  async submitStatement(body) {
    return api.post(endpoints.finance.statements, null, body);
  },

  async syncPaystack(body) {
    return api.post(endpoints.finance.paystackSync, null, body);
  },

  async reconciliationOverview() {
    return api.get(endpoints.finance.reconciliationOverview);
  },

  async exceptions() {
    return normalizePage(await api.get(endpoints.finance.exceptions));
  },

  async resolveSettlementRow(settlementId, rowId, body, version) {
    return api.post(
      endpoints.finance.exceptionActions,
      { settlementId, rowId },
      {
        resolution: body.resolution,
        reason: body.reason,
      },
      { version },
    );
  },

  // Refund-only convenience methods for AD25.
  async refundRequests(query = {}) {
    const all = await this.adjustmentRequests();
    const summaries = all.items.filter((item) => item.kind === 'REFUND');
    const details = await Promise.all(summaries.map((item) => this.refundById(item.id)));
    const refunds = details.filter((item) =>
      !query.paymentId || String(item.paymentId) === String(query.paymentId)
    );
    return { items: refunds, total: refunds.length, page: 1, pages: 1 };
  },

  async refundById(refundId) {
    return this.adjustmentById(refundId);
  },

  async requestRefund(body) {
    return this.requestAdjustment(body.invoiceId, {
      kind: 'REFUND',
      amountMinor: body.amountMinor,
      paymentId: body.paymentId,
      reason: body.reason,
      evidenceReference: body.evidenceReference,
    });
  },

  async decideRefund(refundId, body, version) {
    return this.decideAdjustment(refundId, {
      approve: body.action === 'approve' || Boolean(body.approve),
      reason: body.reason,
    }, version);
  },

  async executeRefund() {
    throw new Error('The backend has no standalone refund-execution endpoint. Use the verified refund-confirmation workflow after provider processing.');
  },

  async confirmRefundManually(refundId, body, version) {
    return this.confirmRefund(refundId, body, version);
  },
};

export default FinanceModel;
