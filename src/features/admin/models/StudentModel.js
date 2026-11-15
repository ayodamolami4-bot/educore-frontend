/**
 * AD02/AD03/AD04 — Students: search/list, enrolment, profile actions.
 * The Model turns raw API payloads into the plain display objects the
 * Presenters and Views use — screens never see raw JSON.
 */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

function toListItem(raw) {
  return {
    id: raw.id,
    name: raw.fullName || raw.name || `${raw.firstName || ''} ${raw.lastName || ''}`.trim(),
    admissionNumber: raw.admissionNumber || raw.admissionNo || '',
    classLabel: raw.classLabel || raw.className || '',
    department: raw.department || null, // SSS only; JSS has no department
    status: raw.status || 'Active',
  };
}

export const StudentModel = {
  /** AD02 , filtered/paged list. params: { q, sessionId, classId, department, status, page } */
  async list(filters = {}) {
    const payload = await api.get(endpoints.students.list, null, filters);
    const page = normalizePage(payload);
    return { ...page, items: page.items.map(toListItem) };
  },

  /** AD02/AD33 , raw rows (guardian, DOB…) for CSV export and import checks. */
  async listFull(filters = {}) {
    const payload = await api.get(endpoints.students.list, null, filters);
    return normalizePage(payload);
  },

  /** AD33 , every student in the school (walks every page). Used by the import
      duplicate check so a pasted row is caught when it matches an EXISTING
      student's guardian phone, guardian email, or first+last name + class —
      not just against other rows in the same paste. */
  async listAll(filters = {}) {
    const items = [];
    let page = 1;
    let pages = 1;
    do {
      const result = await this.listFull({ ...filters, page });
      items.push(...(result.items || []));
      pages = result.pages || 1;
      page += 1;
    } while (page <= pages);
    return items;
  },

  /** AD03 , the enrolment form definition (fields + options for this school). */
  async enrolmentForm() {
    return api.get(endpoints.students.enrolmentForm);
  },

  /** AD03 , match a guardian email/phone to an existing account before creating one. */
  async findGuardianMatches(body) {
    return api.post(endpoints.students.guardianMatches, null, body);
  },

  /** AD03 , submit the enrolment. Backend (Java) validates and provisions accounts. */
  async enrol(body) {
    return api.post(endpoints.students.enrol, null, body);
  },

  /** AD03 , re-run account provisioning after a failed workflow step. */
  async retryProvisioning(workflowId) {
    return api.post(endpoints.students.retryProvisioning, { workflowId });
  },

  async admissionWorkflow(workflowId) {
    return api.get(endpoints.students.admissionWorkflow, { workflowId });
  },

  /** AD04 , full profile. */
  async byId(studentId) {
    const raw = await api.get(endpoints.students.byId, { studentId });
    return { ...toListItem(raw), ...raw };
  },

  /** AD03/AD04 , edit core details. */
  async update(studentId, body) {
    return api.patch(endpoints.students.byId, { studentId }, body);
  },

  async enrolments(studentId) {
    return api.get(endpoints.students.enrolments, { studentId });
  },

  /** AD04 , move class. One student identity; a move never creates a second student. */
  async moveClass(studentId, body) {
    return api.post(endpoints.students.classMoves, { studentId }, body);
  },

  /** AD04 , withdraw (status filter on AD02 must be used to find them afterwards). */
  async withdraw(studentId, body) {
    return api.post(endpoints.students.withdrawals, { studentId }, body);
  },

  async externalResults(studentId) {
    return api.get(endpoints.students.externalResults, { studentId });
  },

  async addExternalResult(studentId, body) {
    return api.post(endpoints.students.externalResults, { studentId }, body);
  },

  async attachHistoricalReport(studentId, body) {
    return api.post(endpoints.students.historicalReports, { studentId }, body);
  },

  async feeStatus(studentId) {
    return api.get(endpoints.students.feeStatus, { studentId });
  },

  /** AD02 ,export only the filtered rows the user may access. */
  async exportFiltered(filters = {}) {
    return api.post(endpoints.exports, null, { type: 'students', ...filters });
  },
};

export default StudentModel;
