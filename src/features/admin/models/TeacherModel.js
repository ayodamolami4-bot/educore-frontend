/** AD07–AD09 — Teacher records, teaching scope and staff provisioning. */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

const itemsOf = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const classLabel = (item) => [item?.level, item?.arm].filter(Boolean).join(' ');

export const TeacherModel = {
  async list(filters = {}) {
    const active = filters.status === 'Active'
      ? true
      : filters.status === 'Inactive'
        ? false
        : undefined;
    const raw = await api.get(endpoints.teachers.list, null, {
      search: filters.q || undefined,
      active,
      cursor: filters.cursor,
      limit: filters.limit ?? 30,
    });
    const page = normalizePage(raw);
    const [assignmentsPage, classesPage] = await Promise.all([
      api.get('teaching-assignments', null, { limit: 100 }),
      api.get('classes'),
    ]);
    const assignments = itemsOf(assignmentsPage);
    const classes = itemsOf(classesPage);
    return {
      ...page,
      hasMore: Boolean(raw?.hasMore),
      nextCursor: raw?.nextCursor ?? null,
      items: page.items.map((teacher) => {
        const duties = assignments.filter((item) => item.teacherId === teacher.id);
        const classDuty = classes.find((item) => item.attendanceTeacherId === teacher.id);
        return {
          id: teacher.id,
          name: teacher.fullName ?? '',
          staffNumber: teacher.staffNumber ?? '',
          phone: teacher.phone ?? '',
          email: teacher.email ?? '',
          formClass: classDuty ? classLabel(classDuty) : '',
          subjects: [...new Set(duties.map((item) => item.subjectName).filter(Boolean))],
          status: teacher.active ? 'Active' : 'Inactive',
          version: teacher.version,
        };
      }),
    };
  },

  async listAll(filters = {}) {
    const items = [];
    let cursor;
    let hasMore = true;
    do {
      const page = await this.list({ ...filters, cursor, limit: 100 });
      items.push(...page.items);
      hasMore = page.hasMore;
      const next = page.nextCursor ?? (hasMore ? page.items.at(-1)?.id : null);
      if (!hasMore || !next || next === cursor || page.items.length === 0) break;
      cursor = next;
    } while (hasMore);
    return items;
  },

  create(body) {
    return api.post('teachers', null, body);
  },

  async nextStaffNumber() {
    return null;
  },

  async importRows() {
    throw new Error('Teacher CSV import must use the school Imports workflow; the backend does not accept direct teacher JSON imports.');
  },

  async byId(teacherId) {
    const staff = await api.get('staff/{teacherId}', { teacherId });
    const [subjectsPage, classesPage] = await Promise.all([
      api.get('subjects'),
      api.get('classes'),
    ]);
    const subjectById = new Map(itemsOf(subjectsPage).map((item) => [item.id, item]));
    const classById = new Map(itemsOf(classesPage).map((item) => [item.id, item]));
    const qualifications = (staff.qualifications ?? []).map((item) => ({
      ...item,
      subjectName: subjectById.get(item.subjectId)?.name ?? item.subjectId,
    }));
    const assignments = (staff.assignments ?? []).map((item) => ({
      ...item,
      subjectName: subjectById.get(item.subjectId)?.name ?? item.subjectId,
      classLabel: classLabel(classById.get(item.classId)),
    }));
    return {
      ...staff,
      status: staff.active ? 'Active' : 'Inactive',
      qualifications,
      assignments,
      subjects: [...new Set(qualifications.map((item) => item.subjectName))],
      formClass: (staff.attendanceClasses ?? []).map(classLabel).join(', '),
      classOptions: itemsOf(classesPage).map((item) => ({ id: item.id, label: classLabel(item), level: item.level, sessionId: item.sessionId })),
      subjectOptions: itemsOf(subjectsPage).map((item) => ({ id: item.id, name: item.name })),
    };
  },

  update(teacherId, body, version) {
    return api.patch(
      'staff/{teacherId}',
      { teacherId },
      body,
      { version },
    );
  },

  async assignments(teacherId) {
    const page = await api.get('teaching-assignments', null, { teacherId, limit: 100 });
    return itemsOf(page);
  },

  changeAssignments(assignmentId, body, version) {
    return api.put(
      'teaching-assignments/{assignmentId}',
      { assignmentId },
      body,
      { version },
    );
  },

  provisioning(teacherId) {
    return api.get('provisioning/STAFF/{teacherId}', { teacherId });
  },

  retryProvisioning(teacherId, eventId, version, reason) {
    return api.post(
      'provisioning/STAFF/{teacherId}/retry',
      { teacherId },
      { eventId, reason },
      { version },
    );
  },

  async changeAccess(teacherId, body, version) {
    return api.post(
      'staff/{teacherId}/access',
      { teacherId },
      body,
      { version },
    );
  },

  timetable(teacherId) {
    return api.get('timetable', null, { teacherId });
  },

  async invite() {
    throw new Error('Staff activation slips are managed through the onboarding workflow.');
  },
};

export default TeacherModel;
