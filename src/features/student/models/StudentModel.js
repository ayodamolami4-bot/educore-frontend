/**
 * StudentModel — the student app's data layer. Each method maps to one of the
 * ST01–ST13 endpoints (see api/endpoints.js). The student app reuses the
 * shared admin api client (features/admin/api/client.js) because it already
 * has the demo backend, the school scope (`S/` prefix), the auth token
 * injection and the ApiError class. In real mode the client points at the
 * real gateway and the same paths route to the academics service.
 *
 * The signed-in student's id is passed by the presenter (from the session),
 * so the model never holds identity itself.
 */
import { api, normalizePage, ApiError } from '../../admin/api/client';
import { endpoints } from '../api/endpoints';

export const StudentModel = {
  /** ST01/ST02 — home + my class/subjects. */
  async overview(studentId) {
    const r = await api.get(endpoints.overview, { studentId });
    return r.overview;
  },

  /** ST03 — the learning materials for this student's class. */
  async learning(studentId, query) {
    return normalizePage(await api.get(endpoints.learning, { studentId }, query));
  },

  /** ST03 — shared materials list (filterable). */
  async materials(query) {
    return normalizePage(await api.get(endpoints.materials, null, query));
  },

  /** ST03 — one material's detail. */
  async materialById(materialId) {
    const r = await api.get(endpoints.materialById, { materialId });
    return r.material;
  },

  /** ST04 — the student's weekly timetable. */
  async timetable(studentId) {
    const r = await api.get(endpoints.timetable, { studentId });
    return r.timetable;
  },

  /** ST04 — the school calendar (terms + key dates). */
  async calendar() {
    return api.get(endpoints.calendar, null, {});
  },

  /** ST05 — the student's assignments. */
  async assignments(studentId, query) {
    return normalizePage(await api.get(endpoints.assignments, { studentId }, query));
  },

  /** ST06 — one assignment's detail. */
  async assignmentById(studentId, assignmentId) {
    const r = await api.get(endpoints.assignmentById, { studentId, assignmentId });
    return r.assignment;
  },

  /** ST08 — the student's submissions for one assignment. */
  async submissions(studentId, assignmentId) {
    const r = await api.get(endpoints.submissions, { studentId, assignmentId });
    return { items: r.items || [], assignment: r.assignment };
  },

  /** ST07 — submit an assignment (the student's answer). */
  async submitAssignment(studentId, assignmentId, body) {
    const r = await api.post(endpoints.submissions, { studentId, assignmentId }, body);
    return r.submission;
  },

  /** ST09 — the student's report cards. */
  async reports(studentId, query) {
    return normalizePage(await api.get(endpoints.reports, { studentId }, query));
  },

  /** ST10 — one report card. */
  async reportById(studentId, reportId) {
    const r = await api.get(endpoints.reportById, { studentId, reportId });
    return r.report;
  },

  /** ST10 — request a report-card export. */
  async exportReport(body) {
    return api.post(endpoints.exports, null, body);
  },

  /** ST11 — the student's attendance. */
  async attendance(studentId) {
    const r = await api.get(endpoints.attendance, { studentId });
    return r.attendance;
  },

  /** ST12 — school notices. */
  async notices(query) {
    return normalizePage(await api.get(endpoints.notices, null, query));
  },

  /** ST12 — one notice. */
  async noticeById(noticeId) {
    return api.get(endpoints.noticeById, { noticeId });
  },

  /** ST13 — the student's profile + academic history. */
  async profile(studentId) {
    const r = await api.get(endpoints.profile, { studentId });
    return r.profile;
  },

  /** ST13 — the student's external results (e.g. WAEC/NECO). */
  async externalResults(studentId) {
    const r = await api.get(endpoints.externalResults, { studentId });
    return r.items || [];
  },

  /** ST13 — historical report-card attachments. */
  async historicalReports(studentId) {
    const r = await api.get(endpoints.historicalReports, { studentId });
    return r.items || [];
  },
};

export default StudentModel;
export { ApiError };
