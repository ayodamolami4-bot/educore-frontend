
import { schoolPath, queryString } from '../../../api/client.js';
import { ApiError, localError } from '../../../api/errors.js';

const itemsOf = (value) =>
  Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : [];

const classLabel = (value) =>
  [value?.level, value?.arm].filter(Boolean).join(' ') || 'Class';

const displayDate = (value) =>
  value ? new Date(value).toLocaleString() : '—';

const todayInLagos = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
  }).format(new Date());

export class TeacherModel {
  constructor(client, uuid, context) {
    this.client = client;
    this.uuid = uuid;
    this.context = context;
    this.pendingCommands = new Map();
  }

  path(schoolId, route, query = {}) {
    return (
      schoolPath(schoolId, route) +
      queryString(
        Object.fromEntries(
          Object.entries(query).filter(([, value]) => value !== undefined && value !== null)
        )
      )
    );
  }

  get(schoolId, route, query = {}) {
    return this.client.request(this.path(schoolId, route, query));
  }

  async command(schoolId, route, method, body, version) {
    if (typeof this.uuid !== 'function') {
      throw localError('The shared EduCore command service is unavailable.');
    }

    const url = this.path(schoolId, route);
    const identity = `${method}:${url}:${JSON.stringify(body ?? null)}:${version ?? ''}`;

    let pending = this.pendingCommands.get(identity);

    if (!pending) {
      pending = { key: this.uuid() };
      this.pendingCommands.set(identity, pending);
    }

    const options = {
      method,
      idempotencyKey: pending.key,
    };

    if (body !== undefined) options.body = body;
    if (version !== undefined) options.version = version;

    try {
      const result = await this.client.request(url, options);
      this.pendingCommands.delete(identity);
      return result;
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.problem?.status >= 400 &&
        error.problem.status < 500 &&
        ![408, 409, 429].includes(error.problem.status)
      ) {
        this.pendingCommands.delete(identity);
      }
      throw error;
    }
  }

  async dashboard(schoolId) {
    const [classes, assignments, cycles, schedule] = await Promise.all([
      this.get(schoolId, '/my-classes'),
      this.get(schoolId, '/assignments'),
      this.get(schoolId, '/assessment-cycles'),
      this.get(schoolId, '/schedule/day'),
    ]);

    const classItems = itemsOf(classes);
    const assignmentItems = itemsOf(assignments);
    const cycleItems = itemsOf(cycles);
    const scheduleItems = itemsOf(schedule);

    return {
      greeting: 'Teacher workspace',
      today: schedule.on ? displayDate(schedule.on) : '',
      summary: [
        { label: 'My classes', value: String(classItems.length) },
        { label: 'Assignments', value: String(assignmentItems.length) },
        { label: 'Assessment cycles', value: String(cycleItems.length) },
        {
          label: 'Class-teacher duties',
          value: String(classItems.filter((item) => item.classTeacher).length),
        },
      ],
      actions: scheduleItems.map((item) => ({
        id: item.id,
        time: item.startTime ?? item.start ?? '',
        title: item.title ?? item.subjectName ?? item.type ?? 'School activity',
        detail: item.classLabel ?? item.description ?? '',
        tag: item.state ?? item.status ?? '',
      })),
    };
  }

  async classes(schoolId) {
    const [classes, assignments] = await Promise.all([
      this.get(schoolId, '/my-classes'),
      this.get(schoolId, '/teaching-assignments'),
    ]);

    const assignmentItems = itemsOf(assignments);

    return {
      items: itemsOf(classes).map((item) => {
        const assigned = assignmentItems.filter(
          (assignment) => assignment.classId === item.id
        );

        return {
          id: item.id,
          label: classLabel(item),
          detail: [
            ...new Set(
              assigned
                .map((assignment) => assignment.subjectName)
                .filter(Boolean)
            ),
          ].join(', '),
          state: item.classTeacher ? 'Class teacher' : 'Assigned',
          sessionId: item.sessionId,
          classTeacher: item.classTeacher,
        };
      }),
    };
  }

  async classWorkspace(schoolId, classId) {
    if (!classId) throw localError('Choose an assigned class first.');

    const [workspace, materials, assignments] = await Promise.all([
      this.get(schoolId, `/classes/${encodeURIComponent(classId)}/workspace`),
      this.get(schoolId, '/materials', { classId }),
      this.get(schoolId, '/assignments', { classId }),
    ]);

    const classInfo = workspace.class ?? {};
    const subjects = itemsOf(workspace.subjects);
    const students = itemsOf(workspace.students);

    return {
      classId,
      subject: subjects.map((item) => item.subjectName).filter(Boolean).join(', '),
      primaryTeacher: subjects[0]?.teacherName ?? '',
      classTeacher: classInfo.attendanceTeacherName ?? '',
      rosterCount: students.length,
      roster: students.map((student) => ({
        id: student.id,
        name: student.fullName,
        code: student.admissionNumber,
        state: student.status ?? student.state ?? '',
      })),
      materials: itemsOf(materials).map((item) => ({
        id: item.id,
        title: item.title,
        detail: item.body ?? item.description ?? item.state ?? '',
        state: item.state ?? '',
      })),
      assignments: itemsOf(assignments),
    };
  }

  async studentProfile(schoolId, classId, studentId) {
    if (!studentId) throw localError('Choose a student from the assigned class roster.');

    const from = new Date(Date.now() - 90 * 86400000)
      .toISOString()
      .slice(0, 10);
    const to = todayInLagos();

    const [student, attendance, reports] = await Promise.all([
      this.get(schoolId, `/students/${encodeURIComponent(studentId)}`),
      this.get(schoolId, `/students/${encodeURIComponent(studentId)}/attendance`, {
        from,
        to,
      }),
      this.get(schoolId, `/students/${encodeURIComponent(studentId)}/reports`),
    ]);

    const placement = student.currentPlacement ?? student.enrolment ?? {};

    const records = [
      ...itemsOf(attendance).map((item) => ({
        id: `attendance-${item.registerId}-${item.onDate}`,
        title: 'Attendance',
        detail: `${item.onDate ?? ''} · ${item.status ?? ''}`,
        extra: item.reason ?? '',
      })),
      ...itemsOf(reports).map((item) => ({
        id: item.id,
        title: item.title ?? 'Published report',
        detail: item.termLabel ?? item.sessionLabel ?? '',
        extra: item.publishedAt ?? '',
      })),
    ];

    return {
      id: student.id,
      name: student.fullName ?? '',
      code: student.admissionNumber ?? '',
      classArm: placement.classLabel ?? classLabel(placement),
      state: student.status ?? '',
      yourSubject: '',
      classTeacher: '',
      enrolment: placement.status ?? '',
      records,
    };
  }

  async timetable(schoolId) {
    const on = todayInLagos();

    const [weekly, daily] = await Promise.all([
      this.get(schoolId, '/timetable', { on }),
      this.get(schoolId, '/schedule/day', { on }),
    ]);

    const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const rows = new Map();

    for (const lesson of itemsOf(weekly)) {
      const time =
        lesson.startTime ?? lesson.start ?? lesson.startsAt ?? '—';
      const rawDay = String(
        lesson.day ?? lesson.weekday ?? lesson.dayOfWeek ?? ''
      ).toLowerCase();

      const day = days.find((key) => rawDay.startsWith(key));
      if (!day) continue;

      if (!rows.has(time)) {
        rows.set(time, {
          time,
          mon: '',
          tue: '',
          wed: '',
          thu: '',
          fri: '',
        });
      }

      const label = [
        lesson.subjectName ?? lesson.subject,
        lesson.classLabel,
      ]
        .filter(Boolean)
        .join(' · ');

      rows.get(time)[day] = label;
    }

    return {
      week: weekly.effectiveFrom ?? '',
      grid: [...rows.values()],
      duties: itemsOf(daily).map((item) => ({
        id: item.id,
        title: item.title ?? item.subjectName ?? item.type ?? '',
        detail: item.description ?? item.classLabel ?? '',
        state: item.state ?? item.status ?? '',
      })),
    };
  }

  async attendanceCentre(schoolId) {
    const date = todayInLagos();

    const [classes, registers] = await Promise.all([
      this.get(schoolId, '/my-classes'),
      this.get(schoolId, '/attendance/registers', {
        from: date,
        to: date,
      }),
    ]);

    const classItems = itemsOf(classes);
    const classById = new Map(classItems.map((item) => [item.id, item]));

    return {
      date,
      classDuty: classItems.find((item) => item.classTeacher)?.id ?? '',
      registerState: 'All states',
      registers: itemsOf(registers).map((item) => ({
        id: item.id,
        classId: item.classId,
        date: item.onDate,
        label: `${classLabel(classById.get(item.classId))} · ${item.onDate ?? ''}`,
        detail: item.submittedAt
          ? `Submitted ${displayDate(item.submittedAt)}`
          : `Register state: ${item.state}`,
        state: item.state,
      })),
      context: {
        date,
        deadline: '',
        teacher: '',
      },
    };
  }

  async register(schoolId, classId, date) {
    if (!classId || !date) {
      throw localError('Select an assigned class and school date.');
    }

    const result = await this.command(
      schoolId,
      '/attendance/registers',
      'POST',
      { classId, onDate: date }
    );

    return this.mapRegister(result);
  }

  mapRegister(register) {
    const students = itemsOf(register.rows).map((row) => ({
      id: row.studentId,
      name: row.fullName,
      code: row.admissionNumber,
      status: row.status ?? 'UNMARKED',
      note: row.reason ?? '',
    }));

    return {
      ...register,
      context: {
        roster: students.length,
        deadline: '',
        state: `${register.state} · version ${register.version}`,
      },
      students,
      summary: {
        marked: students.filter((item) => item.status !== 'UNMARKED').length,
        present: students.filter((item) => item.status === 'PRESENT').length,
        absent: students.filter((item) => item.status === 'ABSENT').length,
        late: students.filter((item) => item.status === 'LATE').length,
      },
    };
  }

  saveRegisterMarks(schoolId, register, rows) {
    return this.command(
      schoolId,
      `/attendance/registers/${encodeURIComponent(register.id)}/marks`,
      'PUT',
      { rows },
      register.version
    );
  }

  submitRegister(schoolId, register) {
    return this.command(
      schoolId,
      `/attendance/registers/${encodeURIComponent(register.id)}/submit`,
      'POST',
      undefined,
      register.version
    );
  }

  async assignments(schoolId) {
    const result = await this.get(schoolId, '/assignments');

    return {
      items: itemsOf(result).map((item) => ({
        ...item,
        title: item.title,
        detail: [
          item.submissionMode,
          item.state,
          item.dueAt ? `Due ${displayDate(item.dueAt)}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
        state: item.state,
      })),
    };
  }

  async assignment(schoolId, assignmentId) {
    if (!assignmentId) throw localError('Choose an assignment first.');

    const [assignment, submissions] = await Promise.all([
      this.get(schoolId, `/assignments/${encodeURIComponent(assignmentId)}`),
      this.get(schoolId, `/assignments/${encodeURIComponent(assignmentId)}/submissions`),
    ]);

    return {
      ...assignment,
      due: displayDate(assignment.dueAt),
      method: assignment.submissionMode,
      maxScore: assignment.maximumScore,
      window: assignment.state,
      submissions: itemsOf(submissions).map((item) => ({
        id: item.studentId,
        submissionId: item.id,
        student: item.studentName,
        detail: [
          item.submittedAt ? displayDate(item.submittedAt) : '',
          item.receivedOn ?? '',
          item.score !== null && item.score !== undefined
            ? `Score ${item.score}`
            : '',
        ]
          .filter(Boolean)
          .join(' · '),
        state: item.state,
        version: item.version,
      })),
    };
  }

  async submission(schoolId, assignmentId, studentId) {
    if (!assignmentId || !studentId) {
      throw localError('Choose the assignment and student to review.');
    }

    const [submission, history] = await Promise.all([
      this.get(
        schoolId,
        `/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(studentId)}`
      ),
      this.get(
        schoolId,
        `/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(studentId)}/history`
      ).catch((error) => {
        if (error instanceof ApiError && error.problem?.status === 404) {
          return { revisions: [], reviews: [] };
        }
        throw error;
      }),
    ]);

    const response = submission.acceptedResponse ?? submission;
    const content = [];

    if (response.responseText) {
      content.push({
        type: 'Written response',
        detail: response.responseText,
      });
    }

    for (const file of response.files ?? []) {
      content.push({
        type: 'Attachment',
        detail: file.filename ?? file.name ?? '',
      });
    }

    for (const revision of itemsOf(history.revisions)) {
      if (revision.snapshot?.responseText) {
        content.push({
          type: `Accepted revision ${revision.revision}`,
          detail: revision.snapshot.responseText,
        });
      }
    }

    return {
      assignmentId,
      studentId,
      submitted: displayDate(submission.submittedAt),
      status: submission.state,
      version: submission.version,
      receipt: submission.receivedOn ?? submission.channel ?? '',
      content,
      maxScore: submission.maximumScore,
      score: submission.score,
      feedback: submission.feedback,
      history,
    };
  }

  async marksPackages(schoolId) {
    const [cycles, teachingAssignments, classes] = await Promise.all([
      this.get(schoolId, '/assessment-cycles'),
      this.get(schoolId, '/teaching-assignments'),
      this.get(schoolId, '/my-classes'),
    ]);

    const classById = new Map(
      itemsOf(classes).map((item) => [item.id, item])
    );

    const packages = [];
    let classReport = null;

    for (const cycle of itemsOf(cycles)) {
      const classInfo = classById.get(cycle.classId);

      const assignedSubjects = itemsOf(teachingAssignments).filter(
        (item) => item.classId === cycle.classId
      );

      for (const assignment of assignedSubjects) {
        try {
          const sheet = await this.get(
            schoolId,
            `/assessment-cycles/${encodeURIComponent(cycle.id)}/sheets/${encodeURIComponent(assignment.id)}`
          );

          packages.push({
            id: assignment.id,
            assignmentId: assignment.id,
            cycleId: cycle.id,
            classId: cycle.classId,
            label: `${classLabel(classInfo)} · ${assignment.subjectName ?? ''}`,
            detail: `Assessment state: ${sheet.state}`,
            state: sheet.state,
            version: sheet.version,
          });
        } catch (error) {
          if (!(error instanceof ApiError) || error.problem?.status !== 404) {
            throw error;
          }
        }
      }

      if (classInfo?.classTeacher) {
        classReport = {
          cycleId: cycle.id,
          classId: cycle.classId,
          label: `${classLabel(classInfo)} class report`,
          detail: `Assessment cycle: ${cycle.state}`,
          state: cycle.state,
          version: cycle.version,
        };
      }
    }

    return { packages, classReport };
  }

  async scores(schoolId, cycleId, assignmentId) {
    if (!cycleId || !assignmentId) {
      throw localError('Open a specific assessment sheet before entering marks.');
    }

    const sheet = await this.get(
      schoolId,
      `/assessment-cycles/${encodeURIComponent(cycleId)}/sheets/${encodeURIComponent(assignmentId)}`
    );

    return {
      ...sheet,
      policy: {
        ca1: sheet.policy?.ca1Weight ?? sheet.policy?.ca1 ?? '',
        ca2: sheet.policy?.ca2Weight ?? sheet.policy?.ca2 ?? '',
        exam: sheet.policy?.examWeight ?? sheet.policy?.exam ?? '',
        total: sheet.policy?.total ?? '',
        precision: sheet.policy?.precision ?? '',
      },
      students: itemsOf(sheet.rows).map((row) => ({
        id: row.studentId,
        name: row.fullName,
        ca1: row.ca1,
        ca2: row.ca2,
        exam: row.exam,
        examState: row.examState,
        note: row.note,
      })),
    };
  }

  saveScores(schoolId, sheet, rows) {
    return this.command(
      schoolId,
      `/assessment-cycles/${encodeURIComponent(sheet.cycleId)}/sheets/${encodeURIComponent(sheet.assignmentId)}/marks`,
      'PUT',
      { rows },
      sheet.version
    );
  }

  submitScores(schoolId, sheet) {
    return this.command(
      schoolId,
      `/assessment-cycles/${encodeURIComponent(sheet.cycleId)}/sheets/${encodeURIComponent(sheet.assignmentId)}/submit`,
      'POST',
      undefined,
      sheet.version
    );
  }

  async classReport(schoolId, classId, session, term, cycleId) {
    if (!cycleId) {
      const cycles = await this.get(schoolId, '/assessment-cycles', { classId });
      cycleId = itemsOf(cycles)[0]?.id;
    }

    if (!cycleId) {
      throw localError('No assessment cycle is available for this class.');
    }

    const review = await this.get(
      schoolId,
      `/assessment-cycles/${encodeURIComponent(cycleId)}/review`
    );

    const students = itemsOf(review.students);

    return {
      cycleId: review.id,
      version: review.version,
      completeness: {
        mine: itemsOf(review.sheets).filter((sheet) => sheet.state === 'SUBMITTED').length,
        others: itemsOf(review.sheets).length,
        missing: review.missingMarkRows ?? 0,
        remarks: students.filter((student) => student.remark).length,
      },
      readiness: students.map((student) => ({
        id: student.studentId,
        name: student.fullName,
        average: student.average ?? student.totalAverage ?? '—',
        state: student.remark ? 'Remark saved' : 'Remark required',
        remarkVersion: student.remarkVersion ?? 1,
      })),
    };
  }

  saveClassRemark(schoolId, cycleId, studentId, body, version) {
    return this.command(
      schoolId,
      `/assessment-cycles/${encodeURIComponent(cycleId)}/remarks/${encodeURIComponent(studentId)}`,
      'PUT',
      body,
      version
    );
  }

  submitClassReport(schoolId, cycleId, version) {
    return this.command(
      schoolId,
      `/assessment-cycles/${encodeURIComponent(cycleId)}/submit-review`,
      'POST',
      undefined,
      version
    );
  }

  async reports(schoolId) {
    const catalogue = await this.get(schoolId, '/school-reports/catalogue');
    const types = itemsOf(catalogue).map((item) => item.kind ?? item.name).filter(Boolean);

    return {
      types,
      formats: ['JSON', 'PDF', 'CSV'],
      catalogue,
    };
  }

  async notices(schoolId) {
    const result = await this.get(schoolId, '/notices');

    return {
      items: itemsOf(result).map((item) => ({
        ...item,
        title: item.title,
        detail: [
          item.scope,
          item.publishedAt ? displayDate(item.publishedAt) : '',
          item.body ?? '',
        ]
          .filter(Boolean)
          .join(' · '),
        state: item.state,
      })),
      opened: null,
    };
  }

  async threads(schoolId) {
    const result = await this.get(schoolId, '/threads');

    return {
      threads: itemsOf(result).map((item) => ({
        ...item,
        label: item.subject,
        detail: `${item.target ?? ''} · ${item.studentId ?? ''}`,
        state: item.state,
      })),
    };
  }

  async thread(schoolId, threadId) {
    if (!threadId) throw localError('Choose a conversation first.');

    const thread = await this.get(
      schoolId,
      `/threads/${encodeURIComponent(threadId)}`
    );

    const student = thread.studentId
      ? await this.get(
          schoolId,
          `/students/${encodeURIComponent(thread.studentId)}`
        )
      : {};

    return {
      ...thread,
      school: this.context?.schoolName ?? '',
      child: student.fullName ?? '',
      classArm: classLabel(student.currentPlacement ?? student.enrolment ?? {}),
      participants: thread.target ?? '',
      thread: thread.subject ?? '',
      messages: itemsOf(thread.messages).map((message) => ({
        id: message.id,
        author: message.authorId,
        text: message.body,
        time: displayDate(message.createdAt),
      })),
    };
  }

  readThread(schoolId, threadId) {
    return this.command(
      schoolId,
      `/threads/${encodeURIComponent(threadId)}/read`,
      'PUT'
    );
  }

  sendMessage(schoolId, thread, body) {
    if (!body?.trim()) throw localError('Write a message before sending.');

    return this.command(
      schoolId,
      `/threads/${encodeURIComponent(thread.id)}/messages`,
      'POST',
      { body: body.trim(), fileIds: [] },
      thread.version
    );
  }

  async profile(schoolId) {
    const staffId = this.context?.subjectId;

    if (!staffId) {
      throw localError('The signed-in teacher identity is unavailable.');
    }

    const [account, staff, classes, assignments] = await Promise.all([
      this.client.request('/me'),
      this.get(schoolId, `/staff/${encodeURIComponent(staffId)}`),
      this.get(schoolId, '/my-classes'),
      this.get(schoolId, '/teaching-assignments'),
    ]);

    const classItems = itemsOf(classes);
    const assignmentItems = itemsOf(assignments);

    return {
      displayName: staff.fullName ?? account.displayName ?? '',
      code: staff.staffNumber ?? staff.code ?? '',
      role: 'Teacher',
      state: staff.status ?? (staff.active ? 'Active' : ''),
      official: {
        school: this.context?.schoolName ?? '',
        canTeach: itemsOf(staff.teachingScope?.subjects)
          .map((item) => item.name ?? item.subjectName)
          .filter(Boolean)
          .join(', '),
        assigned: assignmentItems
          .map((item) => `${classLabel(classItems.find((c) => c.id === item.classId))} ${item.subjectName ?? ''}`)
          .join('; '),
        classTeacher: classItems
          .filter((item) => item.classTeacher)
          .map(classLabel)
          .join(', '),
        attendance: classItems
          .filter((item) => item.classTeacher)
          .map(classLabel)
          .join(', '),
        session: [...new Set(classItems.map((item) => item.sessionId).filter(Boolean))].join(', '),
      },
    };
  }

  createAssignment(schoolId, body) {
    return this.command(schoolId, '/assignments', 'POST', body);
  }

  updateAssignment(schoolId, assignmentId, body, version) {
    return this.command(
      schoolId,
      `/assignments/${encodeURIComponent(assignmentId)}`,
      'PUT',
      body,
      version
    );
  }

  publishAssignment(schoolId, assignmentId, version) {
    return this.command(
      schoolId,
      `/assignments/${encodeURIComponent(assignmentId)}/publish`,
      'POST',
      undefined,
      version
    );
  }

  saveReviewDraft(schoolId, assignmentId, studentId, body, version) {
    return this.command(
      schoolId,
      `/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(studentId)}/review-draft`,
      'PUT',
      body,
      version
    );
  }

  releaseReviewDraft(schoolId, assignmentId, studentId, version) {
    return this.command(
      schoolId,
      `/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(studentId)}/review-draft/release`,
      'POST',
      undefined,
      version
    );
  }

  reviewSubmission(schoolId, assignmentId, studentId, body, version) {
    return this.command(
      schoolId,
      `/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(studentId)}/feedback`,
      'POST',
      body,
      version
    );
  }
}
