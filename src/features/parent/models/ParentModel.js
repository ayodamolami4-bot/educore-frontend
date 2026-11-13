import { ApiError, localError } from '../../../api/errors.js';
import { validEmail } from '../../../utils/validation.js';

export function canPay(context) {
  return (
    context.role === 'PARENT' &&
    !!context.childId &&
    context.capabilities.actions.includes('fees.pay')
  );
}

export function canReadLearning(context) {
  return context.capabilities.actions.includes('child.learning.read');
}

export function checkoutUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      url.origin === 'https://checkout.paystack.com' &&
      !url.username &&
      !url.password &&
      url.pathname !== '/'
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function paymentAmount(invoice, choice, input) {
  if (choice === 'full') return invoice.balanceMinor;
  const match = /^(\d{1,11})(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!match) throw localError('Enter a naira amount with up to two decimal places.');
  const amountMinor = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  if (!invoice.partialAllowed || amountMinor < 1 || amountMinor > invoice.balanceMinor)
    throw localError('Choose a positive amount within the permitted invoice balance.');
  return amountMinor;
}

export class ParentModel {
  #attempts = new Map();

  constructor(api, shared, context, uuid, demo) {
    this.api = api;
    this.shared = shared;
    this.context = context;
    this.uuid = uuid;
    this.demo = demo;
  }

  #requirePayer() {
    if (!canPay(this.context)) throw localError('The school has not enabled fees for this child.');
  }

  #forChild(record) {
    if (record.studentId !== this.context.childId)
      throw localError('This record is unavailable for the selected child.');
    return record;
  }

  async home() {
    const learning = canReadLearning(this.context);
    const [classes, schedule, notifications] = await Promise.allSettled([
      learning ? this.api.classes() : null,
      learning ? this.api.schedule() : null,
      this.shared.notifications({ schoolId: this.context.schoolId }),
    ]);
    return {
      classes: classes.value?.items ?? [],
      schedule: schedule.value,
      notifications: (notifications.value?.items ?? [])
        .filter(
          ({ schoolId, target }) =>
            schoolId === this.context.schoolId &&
            (!target?.childId || target.childId === this.context.childId),
        )
        .slice(0, 3),
      unavailable: [classes, schedule, notifications].some(
        (result) => result.status === 'rejected',
      ),
    };
  }

  async terms() {
    if (!canReadLearning(this.context)) return [];
    const { items } = await this.api.classes();
    const ids = [...new Set(items.map(({ sessionId }) => sessionId))];
    return (await Promise.all(ids.map((id) => this.api.terms(id)))).flatMap((page) => page.items);
  }

  async fees(kind, cursor) {
    this.#requirePayer();
    const page =
      kind === 'invoices' ? await this.api.invoices(cursor) : await this.api.payments(cursor);
    return { ...page, items: page.items.map((item) => this.#forChild(item)) };
  }

  async invoice(id) {
    this.#requirePayer();
    const result = await this.api.invoice(id);
    this.#forChild(result.invoice);
    return result;
  }

  async payment(id, invoiceId, signal) {
    this.#requirePayer();
    if (!invoiceId) {
      let cursor;
      const seen = new Set();
      while (!signal?.aborted && !seen.has(cursor)) {
        seen.add(cursor);
        const page = await this.fees('payments', cursor);
        const payment = page.items.find((item) => item.id === id);
        if (payment) {
          invoiceId = payment.invoiceId;
          break;
        }
        if (!page.hasMore || !page.nextCursor) break;
        cursor = page.nextCursor;
      }
    }
    if (invoiceId && !signal?.aborted) {
      const detail = await this.invoice(invoiceId);
      const payment = detail.confirmedPayments.find((item) => item.id === id);
      if (payment) return { detail, payment };
    }
    throw localError('This receipt is unavailable for the selected child.');
  }

  attempt(invoiceId) {
    return this.#attempts.get(invoiceId);
  }

  async startCheckout(invoice, choice, input, email) {
    this.#requirePayer();
    this.#forChild(invoice);
    if (this.demo) throw localError('Connect to the Java backend to try Paystack test checkout.');

    let attempt = this.#attempts.get(invoice.id);
    if (!attempt) {
      const amountMinor = paymentAmount(invoice, choice, input);
      if (!Number.isSafeInteger(amountMinor) || amountMinor < 1)
        throw localError('There is no balance left to pay.');
      attempt = { body: { amountMinor, email: validEmail(email) }, key: this.uuid() };
      this.#attempts.set(invoice.id, attempt);
    }
    if (attempt.intent) return attempt.intent;
    if (attempt.pending) return attempt.pending;

    attempt.pending = this.api
      .checkout(invoice.id, attempt.body, attempt.key)
      .then((intent) => {
        attempt.intent = intent;
        delete attempt.body;
        return intent;
      })
      .catch((error) => {
        // An ambiguous response keeps the original amount, email and key for a safe retry.
        if (error instanceof ApiError && this.#checkoutWasRejected(error))
          this.#attempts.delete(invoice.id);
        throw error;
      })
      .finally(() => {
        delete attempt.pending;
      });
    return attempt.pending;
  }

  #checkoutWasRejected(error) {
    const { status, code } = error.problem;
    return (
      (status >= 400 && status < 500 && ![408, 409, 429].includes(status)) ||
      [
        'PAYSTACK_NOT_CONFIGURED',
        'SCHOOL_SETTLEMENT_NOT_CONFIGURED',
        'SCHOOL_CHECKOUT_DISABLED',
      ].includes(code)
    );
  }

  async paymentStatus(invoiceId, intentId, verify = false) {
    this.#requirePayer();
    const attempt = this.#attempts.get(invoiceId);
    if (attempt?.intent?.id !== intentId)
      throw localError('This checkout is unavailable. Open the invoice to review your payments.');
    const intent = await (verify ? this.api.verify(intentId) : this.api.status(intentId));
    if (intent.id !== intentId || intent.reference !== attempt.intent.reference)
      throw localError('The school returned a different payment reference. Refresh the status.');
    attempt.intent = intent;
    const detail = await this.invoice(invoiceId);
    const payment =
      intent.state === 'CONFIRMED'
        ? detail.confirmedPayments.find(
            (item) => item.reference === intent.reference && item.source === 'PAYSTACK',
          )
        : undefined;
    return { detail, intent, payment };
  }

  clearFinishedAttempt(invoiceId, intentId) {
    const attempt = this.#attempts.get(invoiceId);
    if (
      intentId &&
      attempt?.intent?.id === intentId &&
      ['CONFIRMED', 'FAILED'].includes(attempt.intent.state)
    )
      this.#attempts.delete(invoiceId);
  }

  async refunds(invoiceId) {
    this.#requirePayer();
    return (await this.api.refunds(invoiceId)).items.filter(({ kind }) => kind === 'REFUND');
  }

  async invoicePdf(invoiceId) {
    this.#requirePayer();
    return this.api.invoicePdf(invoiceId);
  }

  async receipt(paymentId) {
    this.#requirePayer();
    return this.api.receipt(paymentId);
  }

  #requireLearning() {
    if (!this.context.childId || !canReadLearning(this.context))
      throw localError('Learning records are unavailable for the selected child.');
  }

  #checkSelectedChild(record) {
    if (record?.studentId && record.studentId !== this.context.childId)
      throw localError('This record is unavailable for the selected child.');
    return record;
  }

  #checkSelectedChildPage(result) {
    const items = Array.isArray(result) ? result : result?.items;
    if (Array.isArray(items)) items.forEach((item) => this.#checkSelectedChild(item));
    return result;
  }

  async studentOverview() {
    this.#requireLearning();
    const [student, classes, history, externalResults, documents] = await Promise.all([
      this.api.student(),
      this.api.classes(),
      this.api.academicHistory(),
      this.api.externalResults(),
      this.api.documents(),
    ]);
    this.#checkSelectedChild(student.student ?? student);
    this.#checkSelectedChildPage(history);
    this.#checkSelectedChildPage(externalResults);
    this.#checkSelectedChildPage(documents);
    return { student, classes, history, externalResults, documents };
  }

  async calendarWorkspace() {
    this.#requireLearning();
    const classes = await this.api.classes();
    const classItems = classes.items ?? [];
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date());
    const [timetable, calendar, terms] = await Promise.all([
      this.api.timetable(classItems[0]?.classId ?? classItems[0]?.id, today),
      this.api.calendar(),
      this.terms(),
    ]);
    const examinations = await Promise.all(terms.map((term) => this.api.examinations(term.id)));
    return { timetable, calendar, terms, examinations: examinations.flatMap((page) => page.items ?? []), classes: classItems };
  }

  async learningWorkspace() {
    this.#requireLearning();
    const classes = await this.api.classes();
    const classItems = classes.items ?? [];
    const ids = [...new Set(classItems.map((item) => item.classId ?? item.id).filter(Boolean))];
    const [workspaces, materials, assignments] = await Promise.all([
      Promise.all(ids.map((id) => this.api.classWorkspace(id))),
      Promise.all(ids.map((classId) => this.api.materials({ classId }))),
      Promise.all(ids.map((classId) => this.api.assignments({ classId }))),
    ]);
    return {
      classes: classItems,
      workspaces,
      materials: materials.flatMap((page) => page.items ?? []),
      assignments: assignments.flatMap((page) => page.items ?? []),
    };
  }

  async assignmentDetail(assignmentId) {
    this.#requireLearning();
    const [assignment, history] = await Promise.all([
      this.api.assignment(assignmentId),
      this.api.submissionHistory(assignmentId),
    ]);
    this.#checkSelectedChild(assignment.assignment ?? assignment);
    this.#checkSelectedChildPage(history);
    return { assignment, history };
  }

  async attendanceRecords(from, to) {
    this.#requireLearning();
    const result = await this.api.attendance(from, to);
    this.#checkSelectedChildPage(result);
    return result;
  }

  async reportList() {
    this.#requireLearning();
    const result = await this.api.reports();
    this.#checkSelectedChildPage(result);
    return result;
  }

  async reportDetail(reportId) {
    this.#requireLearning();
    const result = await this.api.report(reportId);
    this.#checkSelectedChild(result.report ?? result);
    return result;
  }

  async reportPdf(reportId) {
    this.#requireLearning();
    return this.api.reportPdf(reportId);
  }

}
