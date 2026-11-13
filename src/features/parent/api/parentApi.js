import { queryString, schoolPath } from '../../../api/client.js';

export function createParentApi(client, context) {
  const path = (route, query = {}) => schoolPath(context.schoolId, route) + queryString(query);
  const studentId = context.childId;
  const invoice = (id) => '/invoices/' + encodeURIComponent(id);
  const intent = (id) => '/payment-intents/' + encodeURIComponent(id);
  const student = (id = studentId) => '/students/' + encodeURIComponent(id);
  const assignment = (id) => '/assignments/' + encodeURIComponent(id);
  const report = (id) => '/reports/' + encodeURIComponent(id);
  const document = (id) => '/documents/' + encodeURIComponent(id);

  return {
    classes: () => client.request(path('/my-classes')),
    schedule: () => client.request(path('/schedule/day')),
    terms: (sessionId) => client.request(path('/terms', { sessionId })),
    invoices: (cursor) => client.request(path('/invoices', { studentId, cursor })),
    payments: (cursor) => client.request(path('/payments', { studentId, cursor })),
    invoice: (id) => client.request(path(invoice(id))),
    checkout: (id, body, idempotencyKey) =>
      client.request(path(invoice(id) + '/checkout'), {
        method: 'POST',
        body,
        idempotencyKey,
      }),
    status: (id) => client.request(path(intent(id))),
    verify: (id) => client.request(path(intent(id) + '/verify'), { method: 'POST' }),
    refunds: (id) => client.request(path('/fee-adjustments', { invoiceId: id })),
    invoicePdf: (id) => client.download(path(invoice(id) + '/pdf')),
    receipt: (id) => client.download(path('/payments/' + encodeURIComponent(id) + '/receipt')),

    student: () => client.request(path(student())),
    academicHistory: () => client.request(path(student() + '/academic-history')),
    externalResults: () => client.request(path(student() + '/external-results')),
    timetable: (classId, on) => client.request(path('/timetable', { classId, on })),
    calendar: (sessionId) => client.request(path('/calendar', { sessionId })),
    examinations: (termId) => client.request(path('/examinations', { termId })),
    classWorkspace: (classId) =>
      client.request(path('/classes/' + encodeURIComponent(classId) + '/workspace')),
    materials: (filters = {}) => client.request(path('/materials', filters)),
    material: (id) => client.request(path('/materials/' + encodeURIComponent(id))),
    materialHistory: (id) =>
      client.request(path('/materials/' + encodeURIComponent(id) + '/history')),
    assignments: (filters = {}) => client.request(path('/assignments', filters)),
    assignment: (id) => client.request(path(assignment(id))),
    submissionHistory: (assignmentId) =>
      client.request(
        path(
          assignment(assignmentId) + '/submissions/' + encodeURIComponent(studentId) + '/history',
        ),
      ),
    attendance: (from, to) => client.request(path(student() + '/attendance', { from, to })),
    reports: () => client.request(path(student() + '/reports')),
    report: (id) => client.request(path(report(id))),
    reportPdf: (id) => client.download(path(report(id) + '/pdf')),
    documents: (filters = {}) => client.request(path('/documents', { studentId, ...filters })),
    document: (id) => client.request(path(document(id))),
    documentHistory: (id) => client.request(path(document(id) + '/history')),

    contacts: () => client.request(path('/threads/contacts', { studentId })),
    threads: (cursor) => client.request(path('/threads', { cursor })),
    thread: (id) => client.request(path('/threads/' + encodeURIComponent(id))),
    createThread: (body, key) =>
      client.request(path('/threads'), { method: 'POST', body, idempotencyKey: key }),
    sendMessage: (id, body, key, version) =>
      client.request(path('/threads/' + encodeURIComponent(id) + '/messages'), {
        method: 'POST',
        body,
        idempotencyKey: key,
        version,
      }),
    readThread: (id) =>
      client.request(path('/threads/' + encodeURIComponent(id) + '/read'), {
        method: 'PUT',
      }),
    closeThread: (id, body, key, version) =>
      client.request(path('/threads/' + encodeURIComponent(id) + '/close'), {
        method: 'POST',
        body,
        idempotencyKey: key,
        version,
      }),
    notices: (cursor) => client.request(path('/notices', { cursor })),
    notice: (id) => client.request(path('/notices/' + encodeURIComponent(id))),
    complaints: (cursor) => client.request(path('/complaints', { cursor })),
    complaint: (id) => client.request(path('/complaints/' + encodeURIComponent(id))),
    createComplaint: (body, key) =>
      client.request(path('/complaints'), { method: 'POST', body, idempotencyKey: key }),
    replyComplaint: (id, body, key, version) =>
      client.request(path('/complaints/' + encodeURIComponent(id) + '/replies'), {
        method: 'POST',
        body,
        idempotencyKey: key,
        version,
      }),
    changeComplaintStatus: (id, body, key, version) =>
      client.request(path('/complaints/' + encodeURIComponent(id) + '/status'), {
        method: 'POST',
        body,
        idempotencyKey: key,
        version,
      }),
    complaintHistory: (id) =>
      client.request(path('/complaints/' + encodeURIComponent(id) + '/history')),
    metadata: () => client.request('/metadata'),
    profile: () => client.request('/me'),
    contexts: () => client.request('/me/contexts'),
  };
}
