/**
 * School-scoped Java backend route registry.
 *
 * Keep names used by the existing role Models, but use only routes exposed by
 * the backend controllers. A null value means that the old UI operation has
 * no equivalent standalone endpoint and must be adapted before it is called.
 * The shared client adds /api/v1/schools/{school}/ to these paths.
 */
export const endpoints = {
  dashboard: 'dashboard',

  students: {
    list: 'students',
    enrolmentForm: 'metadata',
    guardianMatches: 'guardians',
    enrol: 'students',
    admissionWorkflow: 'provisioning/{type}/{subjectId}',
    retryProvisioning: 'provisioning/{type}/{subjectId}/retry',
    inviteAccount: 'onboarding/{type}/{subjectId}/activation-slips',
    byId: 'students/{studentId}',
    enrolments: 'students/{studentId}',
    classMoves: 'students/{studentId}/transfers',
    withdrawals: 'students/{studentId}/withdrawal',
    externalResults: 'students/{studentId}/external-results',
    historicalReports: 'documents',
    feeStatus: 'invoices/fee-status',
  },

  learnerReports: {
    forStudent: 'students/{studentId}/reports',
    byId: 'reports/{reportId}',
  },

  guardians: {
    list: 'guardians',
    create: null,
    byId: 'guardians/{guardianId}',
    links: 'students/{studentId}/guardians',
    linkById: null,
    revokeLink: 'students/{studentId}/guardians/{guardianId}/revoke',
  },

  teachers: {
    list: 'teachers',
    create: 'teachers',
    byId: 'staff/{teacherId}',
    assignments: 'teaching-assignments',
    assignmentChanges: 'teaching-assignments/{assignmentId}',
    retryProvisioning: 'provisioning/STAFF/{teacherId}/retry',
    accessChange: 'staff/{teacherId}/access',
    timetable: 'timetable',
    nextStaffNumber: null,
    importCsv: 'imports',
  },

  auditTrail: 'activity/{domain}',

  settings: {
    get: 'settings',
    update: 'settings',
    adminMemberships: 'staff',
    adminMembershipById: 'staff/{staffId}',
    enrolmentFormDraft: null,
    enrolmentFormPublish: null,
    settlementConfiguration: 'invoices/payment-settings',
  },

  calendar: {
    sessions: 'academic-sessions',
    sessionById: 'academic-sessions/{sessionId}',
    activateSession: 'active-academic-session',
    calendar: 'calendar',
    events: 'calendar-exceptions',
    today: null,
    drafts: 'calendar-plans',
    draftById: 'calendar-plans/{draftId}',
    validateDraft: null,
    publishDraft: 'calendar-plans/{draftId}/publish',
  },

  academics: {
    classes: 'classes',
    classById: 'classes/{classId}',
    classWorkspace: 'classes/{classId}/workspace',
    classRoster: 'students',
    classCurriculum: 'classes/{classId}/curriculum',
    curriculumDrafts: 'curricula',
    subjects: 'subjects',
    subjectById: 'subjects/{subjectId}',
    rooms: 'rooms',
    roomById: 'rooms/{roomId}',
    curriculumDraftById: 'curricula/{draftId}',
    publishCurriculumDraft: 'curricula/{draftId}/publish',
  },

  timetable: {
    assignmentCandidates: 'teaching-assignments',
    drafts: 'timetable-plans',
    draftById: 'timetable-plans/{draftId}',
    validateDraft: 'timetable-plans/{draftId}/review',
    requestReview: 'timetable-plans/{draftId}/review',
    publishDraft: 'timetable-plans/{draftId}/publish',
    published: 'timetable',
    publishedById: null,
  },

  attendance: {
    overview: 'attendance/overview',
    registers: 'attendance/registers',
    registerById: 'attendance/registers/{registerId}',
    corrections: 'attendance/registers/{registerId}/corrections',
    absenceAlerts: 'attendance/registers/{registerId}/absence-alerts',
    correctionRequests: 'attendance/correction-requests',
    declineCorrection: 'attendance/correction-requests/{requestId}/decision',
    followUps: 'attendance/follow-up-cases',
    followUpById: 'attendance/follow-up-cases/{followUpId}',
  },

  assessment: {
    policies: 'grading-policy',
    lockPolicy: null,
    unlockPolicy: null,
    cycles: 'assessment-cycles',
    cycleById: 'assessment-cycles/{cycleId}',
    publishSchedule: 'exam-schedules',
  },

  results: {
    cycles: 'assessment-cycles',
    cycleReview: 'assessment-cycles/{cycleId}/review',
    returnSheet: 'assessment-cycles/{cycleId}/sheets/{assignmentId}/return',
    returnReview: 'assessment-cycles/{cycleId}/return-review',
    publishCycle: 'assessment-cycles/{cycleId}/publish',
    reopenCycle: 'assessment-cycles/{cycleId}/reopen',
  },
  reports: {
    catalogue: 'school-reports/catalogue',
  },
  exports: null,

  finance: {
    feePlans: 'fee-plans',
    feePlanById: 'fee-plans/{planId}',
    publishFeePlan: 'fee-plans/{planId}/publish',
    issuePreview: 'fee-plans/{planId}/batches',
    feeBatchById: 'fee-batches/{batchId}',
    issuePlan: 'fee-batches/{batchId}/confirm',
    invoices: 'invoices',
    invoiceById: 'invoices/{invoiceId}',
    invoicePayments: null,
    manualPayments: 'invoices/{invoiceId}/manual-payments',
    receiptById: 'payments/{paymentId}/receipt',
    adjustmentRequests: 'fee-adjustments',
    adjustmentById: 'fee-adjustments/{adjustmentId}',
    adjustmentDecision: 'fee-adjustments/{adjustmentId}/decision',
    paymentAttempts: 'payment-intents',
    payments: 'payments',
    paymentById: 'payments/{paymentId}',
    reconciliations: null,
    reconciliationById: 'reconciliation/settlements/{reconciliationId}',
    exceptions: 'reconciliation/exceptions',
    exceptionById: null,
    exceptionActions: 'reconciliation/settlements/{settlementId}/rows/{rowId}/resolution',
    settlements: 'reconciliation/settlements',
    settlementById: 'reconciliation/settlements/{settlementId}',
    refundRequests: 'fee-adjustments',
    refundById: 'fee-adjustments/{refundId}',
    refundDecision: 'fee-adjustments/{refundId}/decision',
    refundExecute: null,
    refundManualConfirmation: 'fee-adjustments/{refundId}/confirm-refund',
  },

  promotion: {
    previews: 'promotion-batches',
    previewById: 'promotion-batches/{previewId}',
    decisions: 'promotion-batches/{previewId}/students/{studentId}',
    validate: null,
    confirm: 'promotion-batches/{previewId}/confirm',
  },

  notices: {
    list: 'notices',
    byId: 'notices/{noticeId}',
    publish: 'notices/{noticeId}/publish',
    archive: 'notices/{noticeId}/archive',
  },

  messages: {
    recipients: 'threads/contacts',
    conversations: 'threads',
    conversationById: 'threads/{conversationId}',
    messages: 'threads/{conversationId}/messages',
    markRead: 'threads/{conversationId}/read',
    close: 'threads/{conversationId}/close',
    reopen: null,
  },

  complaints: {
    list: 'complaints',
    byId: 'complaints/{caseId}',
    replies: 'complaints/{caseId}/replies',
    internalNotes: null,
    owner: 'complaints/{caseId}/owner',
    stateActions: 'complaints/{caseId}/status',
    history: 'complaints/{caseId}/history',
  },

  imports: {
    template: 'imports/templates/{importType}',
    batches: 'imports',
    batchById: 'imports/{batchId}',
    preview: 'imports',
    correctRow: 'imports/{batchId}/rows/{rowId}',
    errorsCsv: 'imports/{batchId}/errors.csv',
    confirm: 'imports/{batchId}/confirm',
  },

  audit: {
    events: 'activity/{domain}',
    eventById: null,
  },
};

export default endpoints;
