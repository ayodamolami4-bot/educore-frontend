import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ApiClient } from '../../../api/client.js';
import { createDemoTransport, DEMO } from '../../../api/demoTransport.js';
import { ApiError } from '../../../api/errors.js';
import { memoryVault } from '../../../api/memoryVault.js';
import { SessionStore } from '../../../core/SessionStore.js';
import { SharedModel } from '../../shared/models/SharedModel.js';
import { createParentApi } from '../api/parentApi.js';
import { checkoutUrl, ParentModel, paymentAmount } from './ParentModel.js';

const context = {
  schoolId: 'sch_greenfield',
  childId: 'stu_zainab_001',
  role: 'PARENT',
  capabilities: { actions: ['fees.pay'] },
};
const invoice = {
  id: 'inv_test',
  studentId: context.childId,
  balanceMinor: 45000,
  partialAllowed: true,
};
const intent = { id: 'intent_test', reference: 'EC-test', state: 'PENDING' };

test('changing demo children isolates invoices and confirmed receipts by child and school', async () => {
  const vault = memoryVault();
  const client = new ApiClient('https://demo.educore.invalid/api/v1', vault, createDemoTransport());
  const shared = new SharedModel(client, randomUUID);
  const session = new SessionStore(client, shared, vault);
  await session.signIn(DEMO.loginId, DEMO.password, 'installation_test');

  const parents = session.getSnapshot().contexts.filter((item) => item.role === 'PARENT');
  assert.equal(parents.length, 2);
  const greenfield = parents.find((item) => item.schoolId === context.schoolId);
  const brightfield = parents.find((item) => item !== greenfield);
  await session.selectContext(greenfield);
  const first = new ParentModel(
    createParentApi(client, greenfield),
    shared,
    greenfield,
    randomUUID,
    true,
  );
  const firstInvoices = (await first.fees('invoices')).items;
  const firstPayments = (await first.fees('payments')).items;
  assert.deepEqual(
    firstInvoices.map((item) => item.studentId),
    [greenfield.childId],
  );
  assert.equal((await first.payment(firstPayments[0].id)).payment.reference, 'DEMO-PAY-001');

  await session.selectContext(brightfield);
  const second = new ParentModel(
    createParentApi(client, brightfield),
    shared,
    brightfield,
    randomUUID,
    true,
  );
  assert.deepEqual(
    (await second.fees('invoices')).items.map((item) => item.studentId),
    [brightfield.childId],
  );
  assert.deepEqual((await second.fees('payments')).items, []);
  await assert.rejects(second.invoice(firstInvoices[0].id), ApiError);
  await assert.rejects(first.fees('invoices'), ApiError);
});

test('fee access requires payer permission and refuses another child in a response', async () => {
  let requests = 0;
  const api = {
    invoices: async () => {
      requests += 1;
      return { items: [{ ...invoice, studentId: 'another-child' }] };
    },
  };
  const denied = new ParentModel(
    api,
    null,
    { ...context, capabilities: { actions: [] } },
    randomUUID,
    false,
  );
  await assert.rejects(denied.fees('invoices'), /not enabled fees/);
  assert.equal(requests, 0);
  const model = new ParentModel(api, null, context, randomUUID, false);
  await assert.rejects(model.fees('invoices'), /selected child/);
  assert.equal(requests, 1);
});

test('an uncertain checkout and concurrent taps reuse the same amount, email and key', async () => {
  const requests = [];
  const model = new ParentModel(
    {
      checkout: async (id, body, key) => {
        requests.push({ id, body, key });
        if (requests.length === 1) throw new Error('Response lost');
        return intent;
      },
    },
    null,
    context,
    randomUUID,
    false,
  );

  await assert.rejects(
    model.startCheckout(invoice, 'partial', '125.40', 'payer@example.invalid'),
    /Response lost/,
  );
  const retry = model.startCheckout(invoice, 'full', '', 'different@example.invalid');
  const duplicate = model.startCheckout(invoice, 'full', '', 'different@example.invalid');
  assert.deepEqual(await Promise.all([retry, duplicate]), [intent, intent]);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(requests[0].body.amountMinor, 12540);
  assert.equal(await model.startCheckout(invoice, 'full', '', 'payer@example.invalid'), intent);
  assert.equal(requests.length, 2);
});

test('a known checkout rejection lets the parent correct the input', async () => {
  const requests = [];
  const model = new ParentModel(
    {
      checkout: async (_id, body, key) => {
        requests.push({ body, key });
        if (requests.length === 1)
          throw new ApiError({ status: 422, code: 'PAYMENT_AMOUNT', detail: 'Review the amount.' });
        return intent;
      },
    },
    null,
    context,
    randomUUID,
    false,
  );

  await assert.rejects(
    model.startCheckout(invoice, 'partial', '100', 'payer@example.invalid'),
    /Review the amount/,
  );
  assert.equal(model.attempt(invoice.id), undefined);
  await model.startCheckout(invoice, 'partial', '50', 'payer@example.invalid');
  assert.notEqual(requests[0].key, requests[1].key);
  assert.equal(requests[1].body.amountMinor, 5000);
});

test('a receipt requires a confirmed intent and its matching Paystack payment', async () => {
  const manual = { id: 'pay_manual', reference: intent.reference, source: 'CASH' };
  const actual = { id: 'pay_test', reference: intent.reference, source: 'PAYSTACK' };
  const detail = { invoice, confirmedPayments: [manual] };
  let serverState = 'PENDING';
  const model = new ParentModel(
    {
      checkout: async () => intent,
      status: async () => ({ ...intent, state: serverState }),
      verify: async () => ({ ...intent, state: serverState }),
      invoice: async () => detail,
    },
    null,
    context,
    randomUUID,
    false,
  );
  await assert.rejects(model.paymentStatus(invoice.id, 'arbitrary'), /unavailable/);
  await model.startCheckout(invoice, 'full', '', 'payer@example.invalid');
  assert.equal((await model.paymentStatus(invoice.id, intent.id)).payment, undefined);

  serverState = 'CONFIRMED';
  assert.equal((await model.paymentStatus(invoice.id, intent.id, true)).payment, undefined);
  detail.confirmedPayments.push(actual);
  assert.deepEqual((await model.paymentStatus(invoice.id, intent.id)).payment, actual);

  model.clearFinishedAttempt(invoice.id, 'older_intent');
  assert.ok(model.attempt(invoice.id));
  model.clearFinishedAttempt(invoice.id, intent.id);
  assert.equal(model.attempt(invoice.id), undefined);
});

test('partial payment uses integer kobo and checkout opens only an HTTPS Paystack URL', () => {
  assert.equal(paymentAmount(invoice, 'partial', '10.03'), 1003);
  assert.throws(() => paymentAmount(invoice, 'partial', '0'), /positive/);
  assert.throws(() => paymentAmount(invoice, 'partial', '12.003'), /two decimal/);
  assert.throws(() => paymentAmount(invoice, 'partial', '450.01'), /balance/);
  assert.throws(
    () => paymentAmount({ ...invoice, partialAllowed: false }, 'partial', '1'),
    /permitted/,
  );
  assert.equal(
    checkoutUrl('https://checkout.paystack.com/demo'),
    'https://checkout.paystack.com/demo',
  );
  for (const url of [
    'http://checkout.paystack.com/demo',
    'https://checkout.paystack.com.example.invalid/demo',
    'https://user@checkout.paystack.com/demo',
    'https://checkout.paystack.com:8080/demo',
    'blob:https://checkout.paystack.com/demo',
  ])
    assert.equal(checkoutUrl(url), null);
});
