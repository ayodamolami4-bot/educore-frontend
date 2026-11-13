const page = (items) => ({ items, hasMore: false, nextCursor: null });

export function parentDemoPayload(path, query, context) {
  if (context?.role !== 'PARENT' || !context.childId) return undefined;
  const prefix = '/schools/' + context.schoolId + '/';
  if (!path.startsWith(prefix)) return undefined;

  const studentId = context.childId;
  const zainab = studentId === 'stu_zainab_001';
  const sessionId = 'ses_' + studentId;
  const termId = 'term_' + studentId;
  const classes = {
    id: 'class_' + studentId,
    level: zainab ? 'JSS1' : 'SSS1',
    arm: 'A',
    department: zainab ? null : 'Science',
    sessionId,
    startsOn: '2026-09-14',
    endsOn: '2027-07-23',
  };
  const term = { id: termId, sessionId, number: 1, startsOn: '2026-09-14', endsOn: '2026-12-18' };

  const lines = zainab
    ? [
        { description: 'Tuition', amountMinor: 10_000_000, quantity: 1 },
        { description: 'Learning materials', amountMinor: 1_500_000, quantity: 1 },
        { description: 'Activities', amountMinor: 500_000, quantity: 1 },
      ]
    : [{ description: 'Tuition', amountMinor: 9_000_000, quantity: 1 }];
  const invoice = {
    id: 'inv_' + studentId,
    studentId,
    termId,
    description: 'First term school fees',
    lines,
    currency: 'NGN',
    totalMinor: zainab ? 12_000_000 : 9_000_000,
    paidMinor: zainab ? 5_000_000 : 0,
    creditMinor: 0,
    balanceMinor: zainab ? 7_000_000 : 9_000_000,
    status: zainab ? 'PART_PAID' : 'UNPAID',
    dueOn: '2026-12-01',
    partialAllowed: zainab,
  };
  const confirmedPayments = zainab
    ? [
        {
          id: 'pay_' + studentId,
          source: 'CASH',
          reference: 'DEMO-PAY-001',
          amountMinor: 5_000_000,
          allocatedMinor: 5_000_000,
          confirmedAt: '2026-11-10T09:00:00Z',
        },
      ]
    : [];

  const route = path.slice(prefix.length);
  switch (route) {
    case 'my-classes':
      return page([classes]);
    case 'schedule/day':
      return {
        on: '2026-11-13',
        timezone: 'Africa/Lagos',
        teachingDay: true,
        termId,
        weeklyPublished: true,
        items: [
          {
            type: 'LESSON',
            subjectName: zainab ? 'Mathematics' : 'Biology',
            startMinute: 480,
            endMinute: 510,
          },
          { type: 'LESSON', subjectName: 'English Language', startMinute: 510, endMinute: 540 },
          { type: 'BREAK', startMinute: 690, endMinute: 720 },
          { type: 'FRIDAY_SPORTS', startMinute: 720, endMinute: 780 },
        ],
      };
    case 'terms':
      return query.get('sessionId') === sessionId ? page([term]) : undefined;
    case 'invoices':
      return query.get('studentId') === studentId ? page([invoice]) : undefined;
    case 'payments':
      return query.get('studentId') === studentId
        ? page(
            confirmedPayments.map((payment) => ({ ...payment, studentId, invoiceId: invoice.id })),
          )
        : undefined;
    case 'invoices/' + invoice.id:
      return { invoice, confirmedPayments };
    case 'fee-adjustments':
      return query.get('invoiceId') === invoice.id ? page([]) : undefined;
    default:
      return undefined;
  }
}
