/** AD20 — School reports use the published catalogue and server-generated outputs. */
import { api } from '../api/client';
import { StudentModel } from './StudentModel';

const itemsOf = (payload) => {
  if (Array.isArray(payload?.items)) return payload.items;
  return Array.isArray(payload) ? payload : [];
};

const classLabel = (item) =>
  [item?.level, item?.arm].filter(Boolean).join(' ') || item?.classLabel || 'Class';

export const ReportsModel = {
  async catalogue() {
    return api.get('school-reports/catalogue');
  },

  async options() {
    const [metadata, sessionPayload, classPayload, cyclePayload, assignmentPayload, students] =
      await Promise.all([
        api.get('metadata'),
        api.get('academic-sessions'),
        api.get('classes'),
        api.get('assessment-cycles'),
        api.get('teaching-assignments'),
        StudentModel.listAll(),
      ]);
    const sessions = itemsOf(sessionPayload);
    const classes = itemsOf(classPayload);
    const cycles = itemsOf(cyclePayload);
    const assignments = itemsOf(assignmentPayload);

    const termPages = await Promise.all(
      sessions.map((session) => api.get('terms', null, { sessionId: session.id })),
    );
    const terms = termPages.flatMap((page) => itemsOf(page));

    const sessionById = new Map(sessions.map((session) => [session.id, session]));
    const classById = new Map(classes.map((item) => [item.id, item]));
    const termById = new Map(terms.map((term) => [term.id, term]));

    return {
      activeSessionId: metadata.activeSessionId ?? null,
      sessions: sessions.map((item) => ({
        value: item.id,
        label: item.name ?? item.label ?? 'Academic session',
      })),
      terms: terms.map((item) => ({
        value: item.id,
        label: (sessionById.get(item.sessionId)?.name ?? 'Session') +
          ' · Term ' + item.number,
      })),
      classes: classes.map((item) => ({
        value: item.id,
        label: classLabel(item),
      })),
      cycles: cycles.map((item) => ({
        value: item.id,
        label: [
          classLabel(classById.get(item.classId)),
          'Term ' + (termById.get(item.termId)?.number ?? ''),
          item.state,
        ].filter(Boolean).join(' · '),
        classId: item.classId,
        termId: item.termId,
      })),
      assignments: assignments.map((item) => ({
        value: item.id,
        label: [
          item.subjectName ?? 'Subject',
          classLabel(classById.get(item.classId)),
          item.teacherName ?? '',
        ].filter(Boolean).join(' · '),
        classId: item.classId,
        subjectName: item.subjectName ?? '',
      })),
      students: students.map((item) => ({
        value: item.id,
        label: [
          item.fullName ?? item.name ?? 'Student',
          item.admissionNumber ?? '',
        ].filter(Boolean).join(' · '),
      })),
    };
  },

  async run(kind, filters = {}) {
    if (!kind) throw new Error('Choose a report type.');
    const allowed = [
      'ENROLMENTS',
      'ATTENDANCE',
      'TEACHING_ASSIGNMENTS',
      'ASSESSMENT_COMPLETENESS',
      'PUBLISHED_BROADSHEET',
      'SUBJECT_MARKS',
    ];
    if (!allowed.includes(kind)) throw new Error('This report type is not available.');
    const clean = Object.fromEntries(
      Object.entries({ ...filters, format: 'JSON' }).filter(
        ([, value]) => value !== undefined && value !== null && value !== '',
      ),
    );
    return api.get('school-reports/{kind}', { kind }, clean);
  },

  async download(kind, filters = {}, format = 'CSV') {
    const chosen = String(format).toUpperCase();
    if (!['CSV', 'PDF'].includes(chosen)) {
      throw new Error('Choose CSV or PDF for a file export.');
    }
    const clean = Object.fromEntries(
      Object.entries({ ...filters, format: chosen }).filter(
        ([, value]) => value !== undefined && value !== null && value !== '',
      ),
    );
    return api.download('school-reports/{kind}', { kind }, clean);
  },

  /** A single published learner snapshot; the server still checks learner scope. */
  async learnerReport(_studentId, reportId) {
    return api.get('reports/{reportId}', { reportId });
  },
};

export default ReportsModel;
