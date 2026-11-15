/**
 * Student app endpoints — the ST01–ST13 surface.
 *
 * These paths use the `/learners/{studentId}/...` contract from the student
 * screen-design table. The shared admin api client (features/admin/api/client.js)
 * answers them in demo mode from api/demoData.js; in real mode the gateway
 * routes `/api/v1/schools/{school}/learners/{studentId}/...` to the academics
 * service, which exposes the same data under its `/students/{student}/...`
 * routes. The student app talks ONLY through these endpoint constants, so
 * swapping demo → real is a single env-var flip (EXPO_PUBLIC_API_URL), not a
 * code change.
 *
 * Path conventions:
 *   • `{studentId}` — the signed-in student's id (the presenter injects it).
 *   • `{assignmentId}`, `{reportId}`, `{noticeId}`, `{materialId}`,
 *     `{submissionId}` — per-row ids from the list responses.
 *
 * Pages (ST = Student page in the design table):
 *   ST01  Student home          GET learners/{studentId}/overview
 *   ST02  My class/subjects     GET learners/{studentId}/overview (same payload)
 *   ST03  Subject workspace     GET learners/{studentId}/learning
 *                               GET materials
 *                               GET materials/{materialId}
 *   ST04  Timetable/calendar    GET learners/{studentId}/timetable
 *                               GET calendar
 *   ST05  Assignments list      GET learners/{studentId}/assignments
 *   ST06  Assignment details    GET learners/{studentId}/assignments/{assignmentId}
 *   ST07  Prepare/submit        GET learners/{studentId}/assignments/{assignmentId}
 *                               POST learners/{studentId}/assignments/{assignmentId}/submissions
 *   ST08  Submission/feedback   GET learners/{studentId}/assignments/{assignmentId}/submissions
 *   ST09  Results list         GET learners/{studentId}/reports
 *   ST10  Report card          GET learners/{studentId}/reports/{reportId}
 *                               POST exports
 *   ST11  Attendance           GET learners/{studentId}/attendance
 *   ST12  Notices              GET notices
 *                               GET notices/{noticeId}
 *   ST13  Profile/academic     GET learners/{studentId}/profile
 *                               GET learners/{studentId}/external-results
 *                               GET learners/{studentId}/historical-report-attachments
 */
export const endpoints = {
  // ST01/ST02 — home + my class/subjects (one payload, two pages read it).
  overview: 'learners/{studentId}/overview',

  // ST03 — subject workspace: the learning materials for this student.
  learning: 'learners/{studentId}/learning',
  materials: 'materials', // GET ?classId&subjectId&termId — list materials
  materialById: 'materials/{materialId}', // GET — one material's detail

  // ST04 — timetable + calendar.
  timetable: 'learners/{studentId}/timetable',
  calendar: 'calendar', // GET — school calendar (terms, key dates)

  // ST05/ST06/ST07/ST08 — assignments.
  assignments: 'learners/{studentId}/assignments', // GET — list
  assignmentById: 'learners/{studentId}/assignments/{assignmentId}', // GET — detail
  submissions: 'learners/{studentId}/assignments/{assignmentId}/submissions', // GET (ST08) + POST (ST07)

  // ST09/ST10 — results / report cards.
  reports: 'learners/{studentId}/reports', // GET — list (ST09)
  reportById: 'learners/{studentId}/reports/{reportId}', // GET — one card (ST10)
  exports: 'exports', // POST — request a report-card export (ST10)

  // ST11 — attendance.
  attendance: 'learners/{studentId}/attendance',

  // ST12 — notices.
  notices: 'notices', // GET — list
  noticeById: 'notices/{noticeId}', // GET — one notice

  // ST13 — profile + academic history.
  profile: 'learners/{studentId}/profile',
  externalResults: 'learners/{studentId}/external-results',
  historicalReports: 'learners/{studentId}/historical-report-attachments',
};

export default endpoints;
