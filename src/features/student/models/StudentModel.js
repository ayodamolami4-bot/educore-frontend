import { api, normalizePage, ApiError, API_CONFIG } from '../../admin/api/client';
import { endpoints as demoEndpoints } from '../api/endpoints';

const backend = {
  dashboard: 'dashboard',
  classes: 'my-classes',
  workspace: 'classes/{classId}/workspace',
  materials: 'materials',
  material: 'materials/{materialId}',
  timetable: 'timetable',
  calendar: 'calendar',
  assignments: 'assignments',
  assignment: 'assignments/{assignmentId}',
  mySubmission: 'assignments/{assignmentId}/my-submission',
  submit: 'assignments/{assignmentId}/submit',
  history: 'assignments/{assignmentId}/submissions/{studentId}/history',
  reports: 'students/{studentId}/reports',
  report: 'reports/{reportId}',
  reportPdf: 'reports/{reportId}/pdf',
  attendance: 'students/{studentId}/attendance',
  notices: 'notices',
  notice: 'notices/{noticeId}',
  student: 'students/{studentId}',
  academicHistory: 'students/{studentId}/academic-history',
  externalResults: 'students/{studentId}/external-results',
  documents: 'documents',
};

const isDemo = () => API_CONFIG.demo;

function itemsOf(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.history)) return value.history;
  if (Array.isArray(value?.records)) return value.records;
  return [];
}

function localDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateDaysAgo(days) {
  const [year, month, day] = localDate().split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - days)).toISOString().slice(0, 10);
}

function minuteLabel(value) {
  const minute = Number(value);
  if (!Number.isFinite(minute) || minute < 0) return '';
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function currentEnrolment(rows) {
  const today = localDate();
  return rows.find((row) =>
    (!row.startsOn || row.startsOn <= today) &&
    (!row.endsOn || row.endsOn >= today)
  ) || rows[0] || null;
}

function classLabel(row) {
  if (!row) return '';
  return [row.level, row.arm].filter(Boolean).join(' ');
}

function submissionView(value) {
  if (!value || value.state === 'NOT_STARTED') return null;

  return {
    ...value,
    status: value.state ?? value.status,
    content: value.responseText ?? value.content ?? '',
    feedback: value.feedback ?? value.teacherFeedback ?? null,
  };
}

function assignmentView(value) {
  const raw = value || {};
  return {
    ...raw,
    brief: raw.instructions ?? raw.brief ?? '',
    maxScore: raw.maximumScore ?? raw.maxScore ?? null,
    subject: raw.subjectName ?? raw.subject ?? '',
    status: raw.state ?? raw.status,
    submission: submissionView(raw.submission),
  };
}

function reportView(value) {
  const raw = value || {};
  const classValue = raw.classLabel ?? raw.className ?? raw.class ?? '';

  return {
    ...raw,
    // Published report snapshots use termNumber/class and classTeacherRemark.
    termLabel:
      raw.termLabel ??
      raw.termName ??
      raw.term ??
      (raw.termNumber != null ? `Term ${raw.termNumber}` : ''),
    classLabel:
      typeof classValue === 'string'
        ? classValue
        : classValue?.label ?? '',
    average:
      raw.average ?? raw.averagePercentage ?? raw.summary?.average ?? null,
    // The published report contract does not include a class position.
    position: raw.position ?? raw.classPosition ?? null,
    formTeacherName: raw.formTeacherName ?? null,
    overallRemark: raw.overallRemark ?? raw.classTeacherRemark ?? raw.remark ?? '',
    principalRemark: raw.principalRemark ?? '',
    // Preserve the official backend marks; only adapt their field names.
    subjects: Array.isArray(raw.subjects)
      ? raw.subjects.map((subject) => ({
          ...subject,
          subject: subject.subject ?? subject.name ?? subject.subjectName ?? '',
          ca1: subject.ca1 ?? null,
          ca2: subject.ca2 ?? null,
          examScore: subject.examScore ?? subject.exam ?? null,
          total: subject.total ?? null,
          grade: subject.grade ?? '',
        }))
      : [],
  };
}

const subjectNames = new Map();

function materialView(value) {
  const raw = value || {};
  const published = raw.published || raw.accepted || raw;
  const subject =
    subjectNames.get(String(raw.subjectId)) ??
    published.subjectName ??
    published.subject ??
    raw.subjectName ??
    '';

  return {
    ...raw,
    ...published,
    id: raw.id,
    title: published.title ?? raw.title ?? '',
    subject,
    type: published.type ?? published.materialType ?? 'Material',
    publishedAt: raw.publishedAt ?? published.publishedAt ?? '',
    summary:
      published.summary ?? published.body ?? published.content ?? '',
  };
}

function documentView(value) {
  const raw = value || {};
  const published = raw.published || raw;
  return {
    ...raw,
    ...published,
    id: raw.id,
    termLabel: published.termLabel ?? published.term ?? '',
    fileName:
      published.fileName ?? published.filename ?? published.title ?? '',
  };
}

function notificationRange() {
  return { from: dateDaysAgo(365), to: localDate() };
}

async function getClasses() {
  const response = await api.get(backend.classes, null, {});
  return normalizePage(response);
}

export const StudentModel = {
  async overview(studentId) {
    if (isDemo()) {
      const response = await api.get(demoEndpoints.overview, { studentId });
      return response.overview;
    }

    const dashboard = await api.get(backend.dashboard, null, {});
    if (
      dashboard?.role !== 'STUDENT' ||
      String(dashboard.studentId) !== String(studentId)
    ) {
      throw new Error('The selected school context does not match this student.');
    }

    const [classPage, assignmentPage, reportPage, student] = await Promise.all([
      getClasses(),
      api.get(backend.assignments, null, { limit: 30 }),
      api.get(backend.reports, { studentId }),
      api.get(backend.student, { studentId }),
    ]);

    const enrolment = currentEnrolment(classPage.items);
    let workspace = null;

    if (enrolment?.id) {
      workspace = await api.get(
        backend.workspace,
        { classId: enrolment.id },
        {}
      );

      for (const subject of workspace.subjects || []) {
        subjectNames.set(String(subject.subjectId), subject.subjectName);
      }
    }

    const assignmentItems = itemsOf(assignmentPage).map(assignmentView);
    const reportRows = itemsOf(reportPage);
    const latestReport = reportRows[0]
      ? reportView(await api.get(backend.report, { reportId: reportRows[0].id }))
      : null;

    const openAssignments = assignmentItems.filter(
      (assignment) =>
        assignment.state !== 'ARCHIVED' &&
        assignment.submission?.status !== 'SUBMITTED'
    );

    return {
      studentName: student.fullName ?? '',
      classLabel: classLabel(enrolment),
      sessionLabel: '',
      termLabel: latestReport?.termLabel ?? '',
      formTeacherName: null,
      subjects: (workspace?.subjects || []).map((subject) => ({
        id: subject.subjectId,
        name: subject.subjectName,
        department: subject.department ?? null,
      })),
      openAssignments,
      latestReport,
    };
  },

  async learning(studentId, query = {}) {
    if (isDemo()) {
      return normalizePage(
        await api.get(demoEndpoints.learning, { studentId }, query)
      );
    }

    const classPage = await getClasses();
    const enrolment = currentEnrolment(classPage.items);

    if (!enrolment?.id) {
      return { items: [], total: 0, page: 1, pages: 1 };
    }

    const workspace = await api.get(
      backend.workspace,
      { classId: enrolment.id },
      {}
    );

    for (const subject of workspace.subjects || []) {
      subjectNames.set(String(subject.subjectId), subject.subjectName);
    }

    const filters = {
      classId: enrolment.id,
      limit: query.limit ?? 30,
      cursor: query.cursor,
    };

    const response = await api.get(backend.materials, null, filters);
    const page = normalizePage(response);

    return {
      ...page,
      items: page.items.map(materialView),
    };
  },

  async materials(query = {}) {
    if (isDemo()) {
      return normalizePage(await api.get(demoEndpoints.materials, null, query));
    }

    const response = await api.get(backend.materials, null, {
      classId: query.classId,
      subjectId: query.subjectId,
      termId: query.termId,
      cursor: query.cursor,
      limit: query.limit ?? 30,
    });

    const page = normalizePage(response);
    return { ...page, items: page.items.map(materialView) };
  },

  async materialById(materialId) {
    if (isDemo()) {
      const response = await api.get(demoEndpoints.materialById, { materialId });
      return response.material;
    }

    return materialView(
      await api.get(backend.material, { materialId })
    );
  },

  async timetable(studentId) {
    if (isDemo()) {
      const response = await api.get(demoEndpoints.timetable, { studentId });
      return response.timetable;
    }

    const today = localDate();
    const [timetable, classPage, dailySchedule] = await Promise.all([
      api.get(backend.timetable, null, { on: today }),
      getClasses(),
      api.get('schedule/day', null, { on: today }),
    ]);

    const enrolment = currentEnrolment(classPage.items);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const lessons = itemsOf(timetable);

    const grouped = days.map((day) => ({
      day,
      periods: lessons
        .filter((lesson) => {
          const numericDay = Number(lesson.weekday ?? lesson.dayOfWeek ?? lesson.day);
          const rawDay = String(lesson.dayName ?? lesson.day ?? '').toLowerCase();
          return rawDay === day.toLowerCase() ||
            (Number.isInteger(numericDay) && numericDay === days.indexOf(day) + 1);
        })
        .map((lesson, index) => ({
          period: lesson.period ?? lesson.periodNumber ?? index + 1,
          time:
            lesson.time ??
            (minuteLabel(lesson.startMinute) && minuteLabel(lesson.endMinute)
              ? `${minuteLabel(lesson.startMinute)} – ${minuteLabel(lesson.endMinute)}`
              : [lesson.startsAt ?? lesson.startTime, lesson.endsAt ?? lesson.endTime]
                  .filter(Boolean)
                  .join(' – ')),
          subject: lesson.subjectName ?? lesson.subject ?? '',
        })),
    })).filter((day) => day.periods.length > 0);

    const todayEvents = itemsOf(dailySchedule).map((item) => ({
      id: item.id ?? `${item.type}-${item.startMinute}`,
      title: item.title ?? item.subjectName ?? item.type ?? 'School activity',
      detail: [item.classLabel, item.room, item.description].filter(Boolean).join(' · '),
      time:
        minuteLabel(item.startMinute) && minuteLabel(item.endMinute)
          ? `${minuteLabel(item.startMinute)} – ${minuteLabel(item.endMinute)}`
          : '',
      type: item.type ?? 'ACTIVITY',
    }));

    return {
      classLabel: classLabel(enrolment),
      termLabel: '',
      days: grouped,
      today,
      todayEvents,
      published: timetable.published ?? false,
      timezone: timetable.timezone ?? 'Africa/Lagos',
    };
  },

  async calendar() {
    if (isDemo()) {
      return api.get(demoEndpoints.calendar, null, {});
    }

    const classPage = await getClasses();
    const enrolment = currentEnrolment(classPage.items);

    if (!enrolment?.sessionId) return null;

    const calendar = await api.get(backend.calendar, null, {
      sessionId: enrolment.sessionId,
    });

    const terms = calendar.terms || [];
    const today = localDate();
    const activeTerm = terms.find(
      (term) => term.startsOn <= today && term.endsOn >= today
    );
    const nextTerm = terms.find((term) => term.startsOn > today);

    return {
      termLabel: activeTerm ? `Term ${activeTerm.number}` : '',
      termStart: activeTerm?.startsOn ?? '',
      termEnd: activeTerm?.endsOn ?? '',
      nextTermStart: nextTerm?.startsOn ?? '',
      keyDates: (calendar.exceptions || []).map((entry) => ({
        id: entry.id,
        date: entry.onDate,
        title: entry.title,
        detail: entry.teachingDay ? 'Teaching day' : 'School calendar exception',
      })),
      timezone: calendar.timezone,
    };
  },

  async assignments(studentId, query = {}) {
    if (isDemo()) {
      return normalizePage(
        await api.get(demoEndpoints.assignments, { studentId }, query)
      );
    }

    const response = await api.get(backend.assignments, null, {
      classId: query.classId,
      termId: query.termId,
      cursor: query.cursor,
      limit: query.limit ?? 30,
    });

    const page = normalizePage(response);
    return { ...page, items: page.items.map(assignmentView) };
  },

  async assignmentById(studentId, assignmentId) {
    if (isDemo()) {
      const response = await api.get(
        demoEndpoints.assignmentById,
        { studentId, assignmentId }
      );
      return response.assignment;
    }

    return assignmentView(
      await api.get(backend.assignment, { assignmentId })
    );
  },

  async submissions(studentId, assignmentId) {
    if (isDemo()) {
      const response = await api.get(
        demoEndpoints.submissions,
        { studentId, assignmentId }
      );
      return {
        items: response.items || [],
        assignment: response.assignment,
      };
    }

    const assignment = await api.get(
      backend.assignment,
      { assignmentId }
    );
    const submission = submissionView(assignment.submission);
    if (!submission) {
      return { items: [], assignment: assignmentView(assignment), history: null };
    }

    const history = await api.get(
      backend.history,
      { assignmentId, studentId }
    );
    const submissionWithHistory = {
      ...submission,
      history: {
        revisions: itemsOf(history.revisions),
        reviews: itemsOf(history.reviews),
      },
    };

    return {
      items: [submissionWithHistory],
      assignment: assignmentView(assignment),
      history,
    };
  },

  async submitAssignment(studentId, assignmentId, body) {
    if (isDemo()) {
      const response = await api.post(
        demoEndpoints.submissions,
        { studentId, assignmentId },
        body
      );
      return response.submission;
    }

    const detail = await api.get(backend.assignment, { assignmentId });
    const currentVersion = Number(detail.submission?.version ?? 1);

    const saved = await api.put(
      backend.mySubmission,
      { assignmentId },
      {
        responseText: body.content ?? body.responseText ?? '',
        fileIds: body.fileIds ?? [],
      },
      { version: currentVersion }
    );

    const savedVersion = Number(saved?.version);
    if (!Number.isSafeInteger(savedVersion) || savedVersion < 1) {
      throw new Error('The backend did not return the saved submission version.');
    }

    const submitted = await api.post(
      backend.submit,
      { assignmentId },
      undefined,
      { version: savedVersion }
    );

    return submissionView(submitted);
  },

  async reports(studentId, query = {}) {
    if (isDemo()) {
      return normalizePage(
        await api.get(demoEndpoints.reports, { studentId }, query)
      );
    }

    const response = await api.get(backend.reports, { studentId });
    const page = normalizePage(response);

    const reports = await Promise.all(
      page.items.map(async (entry) => {
        const detail = await api.get(backend.report, { reportId: entry.id });
        return reportView({ ...entry, ...detail, id: entry.id });
      })
    );

    return { ...page, items: reports };
  },

  async reportById(studentId, reportId) {
    if (isDemo()) {
      const response = await api.get(
        demoEndpoints.reportById,
        { studentId, reportId }
      );
      return response.report;
    }

    return reportView(
      await api.get(backend.report, { reportId })
    );
  },

  async exportReport(body) {
    if (isDemo()) {
      return api.post(demoEndpoints.exports, null, body);
    }

    return api.download(
      backend.reportPdf,
      { reportId: body.reportId }
    );
  },

  async attendance(studentId) {
    if (isDemo()) {
      const response = await api.get(
        demoEndpoints.attendance,
        { studentId }
      );
      return response.attendance;
    }

    const range = notificationRange();
    const response = await api.get(
      backend.attendance,
      { studentId },
      range
    );

    // The backend returns only accepted register rows. Missing registers are
    // intentionally absent from this response and must never be counted as absences.
    const statusLabels = {
      PRESENT: 'Present',
      ABSENT: 'Absent',
      LATE: 'Late',
      EXCUSED: 'Excused',
    };
    const records = itemsOf(response).map((record) => ({
      ...record,
      date: record.onDate ?? record.date ?? '',
      status: statusLabels[String(record.status ?? '').toUpperCase()] ??
        record.status ?? 'Not recorded',
    }));
    const summary = records.reduce((counts, record) => {
      if (record.status === 'Present') counts.present += 1;
      else if (record.status === 'Absent') counts.absent += 1;
      else if (record.status === 'Late') counts.late += 1;
      else if (record.status === 'Excused') counts.excused += 1;
      counts.total += 1;
      return counts;
    }, { present: 0, absent: 0, late: 0, excused: 0, total: 0 });

    return {
      ...response,
      summary,
      items: records,
      records,
      attendance: records,
      days: records,
    };
  },

  async notices(query = {}) {
    if (isDemo()) {
      return normalizePage(await api.get(demoEndpoints.notices, null, query));
    }

    return normalizePage(
      await api.get(backend.notices, null, {
        cursor: query.cursor,
        limit: query.limit ?? 30,
      })
    );
  },

  async noticeById(noticeId) {
    if (isDemo()) {
      return api.get(demoEndpoints.noticeById, { noticeId });
    }

    const response = await api.get(backend.notice, { noticeId });
    return response.notice ?? response;
  },

  async profile(studentId) {
    if (isDemo()) {
      const response = await api.get(
        demoEndpoints.profile,
        { studentId }
      );
      return response.profile;
    }

    const [student, history] = await Promise.all([
      api.get(backend.student, { studentId }),
      api.get(backend.academicHistory, { studentId }),
    ]);

    const enrolments = student.enrolments || [];
    const current = currentEnrolment(enrolments);

    return {
      studentName: student.fullName ?? '',
      admissionNumber: student.admissionNumber ?? '',
      status: student.status ?? '',
      classLabel: classLabel(current),
      department: current?.department ?? null,
      academicHistory: itemsOf(history).map((entry) => ({
        ...entry,
        sessionLabel: entry.sessionLabel ?? entry.sessionName ?? '',
        termLabel: entry.termLabel ?? entry.termName ?? '',
        classLabel: entry.classLabel ?? entry.className ?? '',
      })),
    };
  },

  async externalResults(studentId) {
    if (isDemo()) {
      const response = await api.get(
        demoEndpoints.externalResults,
        { studentId }
      );
      return response.items || [];
    }

    const response = await api.get(
      backend.externalResults,
      { studentId }
    );

    return itemsOf(response).map((entry) => {
      const issued = entry.issuedResult || {};
      const subjects = Array.isArray(issued.subjects)
        ? issued.subjects.length
        : issued.subjectsCount ?? null;

      return {
        ...entry,
        examName: `${entry.board ?? 'External examination'} ${entry.examYear ?? ''}`.trim(),
        subjects,
        grade: issued.grade ?? null,
      };
    });
  },

  async historicalReports(studentId) {
    if (isDemo()) {
      const response = await api.get(
        demoEndpoints.historicalReports,
        { studentId }
      );
      return response.items || [];
    }

    const response = await api.get(backend.documents, null, {
      studentId,
      kind: 'HISTORICAL_REPORT',
      limit: 30,
    });

    return itemsOf(response).map(documentView);
  },
};

export default StudentModel;
export { ApiError };