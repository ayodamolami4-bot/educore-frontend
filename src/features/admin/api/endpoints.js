/**
 * Every admin endpoint from the handoff table (AD01–AD34), grouped by domain.
 *
 * Paths are written WITHOUT the leading `S/` — client.js adds the school
 * scope automatically. Path params use {curlyBraces}: pass values via the
 * `params` argument, e.g.  api.get(endpoints.students.byId, { studentId: 7 }).
 *
 * Screen references (ADxx) are comments so you can trace every screen in the
 * design handoff to the calls its Presenter is allowed to make.
 */

export const endpoints = {
  //  AD01 — Admin home
  dashboard: 'dashboard',

  //  AD02/AD03/AD04 — Students, enrolment, profile
  students: {
    list: 'students', // GET  AD02
    enrolmentForm: 'enrolment-form', // GET  AD03
    guardianMatches: 'guardian-account-matches', // POST AD03
    enrol: 'student-enrolments', // POST AD03
    admissionWorkflow: 'admission-workflows/{workflowId}', // GET  AD03
    retryProvisioning: 'admission-workflows/{workflowId}/retry-provisioning', // POST AD03
    inviteAccount: 'account-invitations', // POST AD03/AD06/AD08
    byId: 'students/{studentId}', // GET/PATCH AD03/AD04
    enrolments: 'students/{studentId}/enrolments', // GET  AD04
    classMoves: 'students/{studentId}/class-moves', // POST AD04
    withdrawals: 'students/{studentId}/withdrawals', // POST AD04
    externalResults: 'students/{studentId}/external-results', // GET/POST AD04
    historicalReports: 'students/{studentId}/historical-report-attachments', // POST AD04
    feeStatus: 'students/{studentId}/fee-status', // GET  AD04
  },

  //  AD04/AD20 — Learner reports (report cards)
  learnerReports: {
    forStudent: 'learners/{studentId}/reports', // GET  AD04
    byId: 'learners/{studentId}/reports/{reportId}', // GET  AD20
  },

  //  AD05/AD06 — Guardians
  guardians: {
    list: 'guardians', // GET  AD05
    create: 'guardians', // POST AD33 (CSV import — guardian + optional child links)
    byId: 'guardians/{guardianId}', // GET/PATCH AD06
    links: 'guardian-links', // POST AD06
    linkById: 'guardian-links/{linkId}', // PATCH AD06
    revokeLink: 'guardian-links/{linkId}/revoke', // POST AD06
  },

  //  AD07/AD08/AD09 — Teachers
  teachers: {
    list: 'teachers', // GET  AD07
    create: 'teachers', // POST AD08
    byId: 'teachers/{teacherId}', // GET/PATCH AD08/AD09
    assignments: 'teachers/{teacherId}/assignments', // GET  AD08/AD09
    assignmentChanges: 'teaching-assignment-changes', // POST AD08/AD09
    retryProvisioning: 'teachers/{teacherId}/retry-provisioning', // POST AD08
    accessChange: 'teachers/{teacherId}/access-change', // POST AD09
    timetable: 'teachers/{teacherId}/timetable', // GET  AD09
    nextStaffNumber: 'teachers/next-staff-number', // GET  AD08 (read-only preview)
    importCsv: 'teachers/import', // POST AD08 (CSV rows, same validation)
  },

  //  AD34 — School change history
  auditTrail: 'audit-trail', // GET (category filter)

  //  AD10 — School settings and admin access
  settings: {
    get: 'settings', // GET
    update: 'settings', // PATCH
    adminMemberships: 'admin-memberships', // GET/POST
    adminMembershipById: 'admin-memberships/{membershipId}', // PATCH
    enrolmentFormDraft: 'enrolment-form/draft', // PUT
    enrolmentFormPublish: 'enrolment-form/publish', // POST
    settlementConfiguration: 'finance/settlement-configuration', // GET
  },

  //  AD11 — Calendar and school day
  calendar: {
    sessions: 'sessions', // GET/POST
    sessionById: 'sessions/{sessionId}', // PATCH
    activateSession: 'sessions/{sessionId}/activate', // POST
    calendar: 'calendar', // GET
    events: 'calendar-events', // POST (add a key date)
    today: 'calendar-today', // POST (add to today at school)
    drafts: 'calendar-drafts', // GET/POST
    draftById: 'calendar-drafts/{draftId}', // GET/PUT
    validateDraft: 'calendar-drafts/{draftId}/validate', // POST
    publishDraft: 'calendar-drafts/{draftId}/publish', // POST
  },

  // ── AD12/AD13 — Classes, subjects, rooms, curriculum, roster ─────────
  academics: {
    classes: 'classes', // GET/POST
    classById: 'classes/{classId}', // PATCH
    classWorkspace: 'classes/{classId}/workspace', // GET  AD13
    classRoster: 'classes/{classId}/roster', // GET  AD13
    classCurriculum: 'classes/{classId}/curriculum', // GET  AD12/AD13
    curriculumDrafts: 'classes/{classId}/curriculum-drafts', // POST AD12
    subjects: 'subjects', // GET/POST
    subjectById: 'subjects/{subjectId}', // PATCH
    rooms: 'rooms', // GET/POST
    roomById: 'rooms/{roomId}', // PATCH
    curriculumDraftById: 'curriculum-drafts/{draftId}', // GET/PUT
    publishCurriculumDraft: 'curriculum-drafts/{draftId}/publish', // POST
  },

  //  AD14/AD15 — Timetable build and publish
  timetable: {
    assignmentCandidates: 'teaching-assignment-candidates', // GET  AD14
    drafts: 'timetable-drafts', // GET/POST
    draftById: 'timetable-drafts/{draftId}', // GET/PATCH
    validateDraft: 'timetable-drafts/{draftId}/validate', // POST AD14/AD15
    requestReview: 'timetable-drafts/{draftId}/request-review', // POST AD15
    publishDraft: 'timetable-drafts/{draftId}/publish', // POST AD15
    published: 'timetables', // GET  AD15
    publishedById: 'timetables/{timetableId}', // GET  AD15
  },

  //  AD16/AD17 — Attendance
  attendance: {
    overview: 'attendance/overview', // GET  AD01/AD16
    registers: 'attendance/registers', // GET  AD16
    registerById: 'attendance/registers/{registerId}', // GET  AD17
    corrections: 'attendance/registers/{registerId}/corrections', // POST AD17
    absenceAlerts: 'attendance/registers/{registerId}/absence-alerts', // POST AD16/AD17
    correctionRequests: 'attendance/correction-requests', // GET  AD16
    declineCorrection: 'attendance/correction-requests/{requestId}/decline', // POST AD17
    followUps: 'attendance/follow-ups', // GET  AD16
    followUpById: 'attendance/follow-ups/{followUpId}', // PATCH AD16
  },

  //  AD18 — Exams and grading rules
  assessment: {
    policies: 'assessment-policies', // GET/POST
    lockPolicy: 'assessment-policies/{policyId}/lock', // POST
    unlockPolicy: 'assessment-policies/{policyId}/unlock', // POST
    cycles: 'assessment-cycles', // GET/POST
    cycleById: 'assessment-cycles/{cycleId}', // GET/PATCH
    publishSchedule: 'assessment-cycles/{cycleId}/publish-schedule', // POST
  },

  //  AD19 — Review and publish results
  results: {
    markPackages: 'mark-packages', // GET
    markPackageById: 'mark-packages/{packageId}', // GET
    returnPackage: 'mark-packages/{packageId}/return', // POST
    approvePackage: 'mark-packages/{packageId}/approve', // POST — admin signs off
    absenceResolutions: 'mark-packages/{packageId}/absence-resolutions', // POST
    reportBatches: 'class-report-batches', // GET
    reportBatchById: 'class-report-batches/{batchId}', // GET
    returnBatch: 'class-report-batches/{batchId}/return', // POST
    publishBatch: 'class-report-batches/{batchId}/publish', // POST
    reopenBatch: 'class-report-batches/{batchId}/reopen', // POST
    submitBatch: 'class-report-batches/{batchId}/submit-review', // POST
    reviewIssues: 'result-review-issues', // POST
    resolveIssue: 'result-review-issues/{issueId}/resolve', // POST
  },

  //  AD20 — Reports catalogue and exports
  reports: {
    catalogue: 'reports/catalogue', // GET
  },
  exports: 'exports', // POST AD02/AD20/AD33

  //  AD21–AD25 — Finance
  finance: {
    feePlans: 'finance/fee-plans', // GET/POST AD21
    feePlanById: 'finance/fee-plans/{planId}', // GET/PATCH AD21
    issuePreview: 'finance/fee-plans/{planId}/issue-preview', // POST AD21
    issuePlan: 'finance/fee-plans/{planId}/issue', // POST AD21
    invoices: 'finance/invoices', // GET  AD22
    invoiceById: 'finance/invoices/{invoiceId}', // GET  AD23
    invoicePayments: 'finance/invoices/{invoiceId}/payments', // GET + POST AD23
    manualPayments: 'finance/invoices/{invoiceId}/manual-payments', // POST AD23
    receiptById: 'finance/receipts/{receiptId}', // GET  AD23
    adjustmentRequests: 'finance/adjustment-requests', // GET/POST AD23
    adjustmentById: 'finance/adjustment-requests/{adjustmentId}', // GET AD23
    adjustmentDecision: 'finance/adjustment-requests/{adjustmentId}/decision', // POST AD23
    paymentAttempts: 'finance/payment-attempts', // GET  AD24
    payments: 'finance/payments', // GET  AD24
    paymentById: 'finance/payments/{paymentId}', // GET  AD25
    reconciliations: 'finance/reconciliations', // GET/POST AD24
    reconciliationById: 'finance/reconciliations/{reconciliationId}', // GET AD24
    exceptions: 'finance/exceptions', // GET  AD24
    exceptionById: 'finance/exceptions/{exceptionId}', // GET  AD25
    exceptionActions: 'finance/exceptions/{exceptionId}/actions', // POST AD25
    settlements: 'finance/settlements', // GET  AD24
    settlementById: 'finance/settlements/{settlementId}', // GET  AD25
    refundRequests: 'finance/refund-requests', // GET/POST AD25
    refundById: 'finance/refund-requests/{refundId}', // GET  AD25
    refundDecision: 'finance/refund-requests/{refundId}/decision', // POST AD25
    refundExecute: 'finance/refund-requests/{refundId}/execute', // POST AD25
    refundManualConfirmation: 'finance/refund-requests/{refundId}/manual-confirmation', // POST AD25
  },

  //  AD26/AD27 — Promotion and graduation
  promotion: {
    previews: 'promotion-previews', // GET/POST
    previewById: 'promotion-previews/{previewId}', // GET  AD26/AD27
    decisions: 'promotion-previews/{previewId}/decisions', // PUT  AD26
    validate: 'promotion-previews/{previewId}/validate', // POST AD27
    confirm: 'promotion-previews/{previewId}/confirm', // POST AD27
  },

  //  AD28 — Announcements
  notices: {
    list: 'notices', // GET/POST
    byId: 'notices/{noticeId}', // GET/PATCH
    publish: 'notices/{noticeId}/publish', // POST
    archive: 'notices/{noticeId}/archive', // POST
  },

  //  AD29/AD30 — Messages
  messages: {
    recipients: 'conversation-recipients', // GET
    conversations: 'conversations', // GET/POST
    conversationById: 'conversations/{conversationId}', // GET
    messages: 'conversations/{conversationId}/messages', // GET/POST
    markRead: 'conversations/{conversationId}/read', // PUT
    close: 'conversations/{conversationId}/close', // POST — close/block a thread
    reopen: 'conversations/{conversationId}/reopen', // POST — reopen a closed thread
  },

  //  AD31/AD32 — Complaints
  complaints: {
    list: 'complaints', // GET/POST
    byId: 'complaints/{caseId}', // GET
    replies: 'complaints/{caseId}/replies', // GET/POST
    internalNotes: 'complaints/{caseId}/internal-notes', // GET/POST
    owner: 'complaints/{caseId}/owner', // POST
    stateActions: 'complaints/{caseId}/state-actions', // POST
    history: 'complaints/{caseId}/history', // GET
  },

  //  AD33 — Imports and exports
  imports: {
    template: 'import-templates/{importType}', // GET
    batches: 'import-batches', // GET/POST
    batchById: 'import-batches/{batchId}', // GET
    mapping: 'import-batches/{batchId}/mapping', // PUT
    validate: 'import-batches/{batchId}/validate', // POST
    rows: 'import-batches/{batchId}/rows', // GET
    openingBalanceApproval: 'import-batches/{batchId}/opening-balance-approval', // POST
    confirm: 'import-batches/{batchId}/confirm', // POST
    retryFailed: 'import-batches/{batchId}/retry-failed', // POST
  },

  //  AD34 — Change history (audit log)
  audit: {
    events: 'audit-events', // GET
    eventById: 'audit-events/{eventId}', // GET
  },
};
