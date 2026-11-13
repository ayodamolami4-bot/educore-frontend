import { queryString, schoolPath } from '../../../api/client.js';

export function createParentApi(client, context) {
  const path = (route, query = {}) => schoolPath(context.schoolId, route) + queryString(query);
  const studentId = context.childId;
  const invoice = (id) => '/invoices/' + encodeURIComponent(id);
  const intent = (id) => '/payment-intents/' + encodeURIComponent(id);

  return {
    classes: () => client.request(path('/my-classes')),
    schedule: () => client.request(path('/schedule/day')),
    terms: (sessionId) => client.request(path('/terms', { sessionId })),
    invoices: (cursor) => client.request(path('/invoices', { studentId, cursor })),
    payments: (cursor) => client.request(path('/payments', { studentId, cursor })),
    invoice: (id) => client.request(path(invoice(id))),
    checkout: (id, body, idempotencyKey) =>
      client.request(path(invoice(id) + '/checkout'), { method: 'POST', body, idempotencyKey }),
    status: (id) => client.request(path(intent(id))),
    verify: (id) => client.request(path(intent(id) + '/verify'), { method: 'POST' }),
    refunds: (id) => client.request(path('/fee-adjustments', { invoiceId: id })),
    invoicePdf: (id) => client.download(path(invoice(id) + '/pdf')),
    receipt: (id) => client.download(path('/payments/' + encodeURIComponent(id) + '/receipt')),
  };
}
