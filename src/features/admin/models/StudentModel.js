/**
 * AD02–AD04 — Student records and enrolment.
 * Routes and DTO names mirror the Java school API; the server owns IDs,
 * admission numbers, placement, metadata versions and guardian relationships.
 */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

const itemsOf = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const classLabel = (item) =>
  [item?.level, item?.arm].filter(Boolean).join(' ') || item?.classLabel || '';

function toListItem(raw, classesById = new Map()) {
  const placement = raw.enrolments?.[0] ?? null;
  return {
    id: raw.id,
    name: raw.fullName || raw.name || '',
    admissionNumber: raw.admissionNumber || '',
    classLabel: raw.classLabel || classLabel(classesById.get(placement?.classId)),
    department: placement?.department ?? raw.department ?? null,
    status: raw.status || '',
    version: raw.version,
  };
}

export const StudentModel = {
  async list(filters = {}) {
    const payload = await api.get('students', null, {
      search: filters.search ?? filters.q,
      classId: filters.classId,
      cursor: filters.cursor,
      limit: filters.limit ?? 30,
    });
    const page = normalizePage(payload);
    const classIds = [...new Set(page.items.map((item) => item.classId).filter(Boolean))];
    const classesPage = classIds.length ? await api.get('classes') : { items: [] };
    const classes = new Map(itemsOf(classesPage).map((item) => [item.id, item]));
    return { ...page, items: page.items.map((item) => toListItem(item, classes)) };
  },

  async listFull(filters = {}) {
    const payload = await api.get('students', null, {
      search: filters.search ?? filters.q,
      classId: filters.classId,
      cursor: filters.cursor,
      limit: filters.limit ?? 30,
    });
    return normalizePage(payload);
  },

  async listAll(filters = {}) {
    const items = [];
    let cursor;
    let page;
    do {
      page = await this.listFull({ ...filters, cursor });
      items.push(...page.items);
      cursor = page.hasMore ? page.items.at(-1)?.id : null;
    } while (cursor);
    return items;
  },

  async enrolmentForm() {
    const metadata = await api.get('metadata');
    const [classesPage, sessionsPage] = await Promise.all([
      api.get('classes', null, { sessionId: metadata.activeSessionId }),
      api.get('academic-sessions'),
    ]);
    const sessions = itemsOf(sessionsPage);
    const sessionById = new Map(sessions.map((item) => [item.id, item]));
    const classes = itemsOf(classesPage).map((item) => ({
      ...item,
      label: classLabel(item),
      session: sessionById.get(item.sessionId) ?? null,
    }));
    return {
      metadataVersion: metadata.version,
      definition: metadata.definition ?? {},
      activeSessionId: metadata.activeSessionId ?? null,
      classes,
      sessions,
    };
  },

  async findGuardianMatches({ guardianPhone, guardianEmail } = {}) {
    const search = String(guardianPhone || guardianEmail || '').trim();
    if (!search) return { matches: [] };
    const result = await api.get('guardians', null, { search, limit: 10 });
    return {
      matches: itemsOf(result).map((item) => ({
        id: item.id,
        fullName: item.fullName ?? '',
        phone: item.phone ?? '',
        email: item.email ?? '',
        childrenCount: item.childrenCount ?? null,
      })),
    };
  },

  async enrol(body) {
    return api.post('students', null, body);
  },

  async retryProvisioning(subjectId) {
    return api.post('provisioning/STUDENT/{subjectId}/retry', { subjectId });
  },

  async admissionWorkflow(subjectId) {
    return api.get('provisioning/STUDENT/{subjectId}', { subjectId });
  },

  async byId(studentId) {
    const raw = await api.get('students/{studentId}', { studentId });
    const enrolments = Array.isArray(raw.enrolments) ? raw.enrolments : [];
    const current = enrolments.find((item) => !item.endsOn) ?? enrolments[0] ?? null;
    return {
      ...toListItem({ ...raw, enrolments }),
      ...raw,
      classLabel: classLabel(current),
      department: current?.department ?? null,
      enrolments,
      guardians: Array.isArray(raw.guardians) ? raw.guardians : [],
    };
  },

  async update(studentId, body, version) {
    return api.patch(
      'students/{studentId}',
      { studentId },
      body,
      { version },
    );
  },

  async enrolments(studentId) {
    const student = await this.byId(studentId);
    return student.enrolments ?? [];
  },

  async moveClass(studentId, body, version) {
    return api.post(
      'students/{studentId}/transfers',
      { studentId },
      {
        classId: body.classId ?? body.targetClassId,
        effectiveOn: body.effectiveOn ?? body.effectiveFrom,
        department: body.department ?? null,
        reason: body.reason,
      },
      { version },
    );
  },

  async withdraw(studentId, body, version) {
    return api.post(
      'students/{studentId}/withdrawal',
      { studentId },
      {
        effectiveOn: body.effectiveOn ?? body.effectiveDate,
        reason: body.reason,
      },
      { version },
    );
  },

  async externalResults(studentId) {
    return api.get('students/{studentId}/external-results', { studentId });
  },

  async addExternalResult(studentId, body) {
    return api.post('students/{studentId}/external-results', { studentId }, body);
  },

  async attachHistoricalReport(studentId, body) {
    return api.post('documents', null, { ...body, studentId });
  },

  async feeStatus(studentId, termId) {
    return api.get('invoices/fee-status', null, { studentId, termId });
  },

  async exportFiltered(filters = {}) {
    return api.download('students/export.csv', null, {
      classId: filters.classId,
    });
  },
};

export default StudentModel;
