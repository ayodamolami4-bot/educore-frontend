
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

    const classItems = itemsOf(classes);
    const assignmentItems = itemsOf(assignments);
    const classById = new Map(classItems.map((item) => [item.id, item]));
    const missingIds = [...new Set(assignmentItems.map((item) => item.classId).filter((id) => id && !classById.has(id)))];
    const workspaces = await Promise.all(missingIds.map(async (id) => {
      try {
        const workspace = await this.get(schoolId, `/classes/${encodeURIComponent(id)}/workspace`);
        return [id, workspace.class ?? {}];
      } catch (error) {
        if (error instanceof ApiError && error.problem?.status === 403) return [id, {}];
        throw error;
      }
    }));
    for (const [id, info] of workspaces) classById.set(id, info);

    const byClass = new Map();
    for (const assignment of assignmentItems) {
      if (!byClass.has(assignment.classId)) byClass.set(assignment.classId, []);
      byClass.get(assignment.classId).push(assignment);
    }

    return {
      items: [...classById.entries()].map(([id, item]) => {
        const assigned = byClass.get(id) ?? [];
        const label = classLabel(item) || assigned[0]?.classLabel || 'Assigned class';
        return {
          id,
          label,
          detail: [...new Set(assigned.map((assignment) => assignment.subjectName).filter(Boolean))].join(', '),
          state: item.classTeacher ? 'Class teacher' : 'Subject teaching',
          sessionId: item.sessionId,
          classTeacher: Boolean(item.classTeacher),
        };
      }).sort((a, b) => a.label.localeCompare(b.label)),
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
    const terms = classInfo.sessionId
      ? itemsOf(await this.get(schoolId, '/terms', { sessionId: classInfo.sessionId }))
      : [];

    return {
      classId,
      classLabel: classLabel(classInfo),
      sessionId: classInfo.sessionId ?? null,
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
      subjects: subjects.map((item) => ({
        id: item.id,
        subjectId: item.subjectId,
        name: item.subjectName,
        teacherId: item.teacherId,
        teacherName: item.teacherName,
        department: item.department,
        required: item.required,
        weeklyPeriods: item.weeklyPeriods,
      })),
      terms: terms.map((item) => ({
        id: item.id,
        number: item.number,
        label: `Term ${item.number}`,
        startsOn: item.startsOn,
        endsOn: item.endsOn,
      })),
      materials: itemsOf(materials).map((item) => {
        const snapshot = item.draft ?? item.published ?? {};
        return {
          id: item.id,
          title: snapshot.title ?? item.title ?? 'Untitled material',
          detail: snapshot.body ?? item.description ?? '',
          state: item.state ?? '',
          version: item.version,
          publishedAt: item.publishedAt ?? null,
        };
      }),
      assignments: itemsOf(assignments).map((item) => ({
        ...item,
        detail: item.instructions ?? item.title ?? '',
      })),
    };
  }

  async studentProfile(schoolId, classId, studentId) {
    if (!studentId) throw localError('Choose a student from the assigned class roster.');

    const today = todayInLagos();
    const from = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const [student, attendance, reports, classes, assignments] = await Promise.all([
      this.get(schoolId, '/students/' + encodeURIComponent(studentId)),
      this.get(schoolId, '/students/' + encodeURIComponent(studentId) + '/attendance', { from, to: today }),
      this.get(schoolId, '/students/' + encodeURIComponent(studentId) + '/reports'),
      this.get(schoolId, '/my-classes'),
      this.get(schoolId, '/teaching-assignments', { classId }),
    ]);

    const enrolments = itemsOf(student.enrolments);
    const active = enrolments.find((entry) =>
      (!entry.startsOn || entry.startsOn <= today) &&
      (!entry.endsOn || entry.endsOn >= today)
    );
    const placement = enrolments.find((entry) =>
      classId && String(entry.classId) === String(classId)
    ) ?? active ?? enrolments[0] ?? {};
    const resolvedClassId = placement.classId ?? classId;
    const assignedClass = itemsOf(classes).find((entry) =>
      String(entry.id) === String(resolvedClassId)
    );
    const assignedSubjects = [...new Set(
      itemsOf(assignments)
        .filter((entry) => String(entry.classId) === String(resolvedClassId))
        .map((entry) => entry.subjectName)
        .filter(Boolean)
    )];

    const records = [
      ...itemsOf(attendance).map((item) => ({
        id: 'attendance-' + item.registerId + '-' + item.onDate,
        category: 'Attendance',
        title: 'Attendance',
        detail: String(item.onDate ?? '') + ' · ' + String(item.status ?? ''),
        extra: item.reason ?? '',
      })),
      ...itemsOf(reports).map((item) => ({
        id: item.id,
        category: 'Published results',
        title: 'Published report',
        detail: item.revision ? 'Published revision ' + item.revision : '',
        extra: item.publishedAt ?? '',
      })),
    ];

    return {
      id: student.id,
      classId: resolvedClassId ?? null,
      name: student.fullName ?? '',
      code: student.admissionNumber ?? '',
      classArm: classLabel(placement),
      state: student.status ?? '',
      yourSubject: assignedSubjects.join(', '),
      classTeacherDuty: Boolean(assignedClass?.classTeacher),
      enrolment: placement.startsOn
        ? placement.startsOn + (placement.endsOn ? ' – ' + placement.endsOn : ' – current')
        : '',
      records,
    };
  }

  async timetable(schoolId) {
    const on = todayInLagos();

    const [weekly, daily, classPage, teachingPage] = await Promise.all([
      this.get(schoolId, '/timetable', { on }),
      this.get(schoolId, '/schedule/day', { on }),
      this.get(schoolId, '/my-classes'),
      this.get(schoolId, '/teaching-assignments'),
    ]);

    const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const minuteLabel = (value) => {
      const minute = Number(value);
      if (!Number.isFinite(minute) || minute < 0) return '';
      return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
    };
    const lessons = itemsOf(weekly).map((lesson, index) => {
      const rawDay = String(lesson.weekday ?? lesson.day ?? lesson.dayOfWeek ?? '').toLowerCase();
      const numericDay = Number(rawDay);
      const dayIndex = Number.isInteger(numericDay)
        ? numericDay - 1
        : dayKeys.findIndex((key) => rawDay.startsWith(key));
      const start = minuteLabel(lesson.startMinute) || lesson.startTime || lesson.start || '—';
      const end = minuteLabel(lesson.endMinute) || lesson.endTime || '';
      return {
        id: lesson.id ?? `${lesson.classId}-${lesson.subjectId}-${lesson.startMinute}-${index}`,
        classId: lesson.classId,
        classLabel: lesson.classLabel ?? '',
        subject: lesson.subjectName ?? lesson.subject ?? 'Lesson',
        room: lesson.room ?? '',
        dayKey: dayKeys[dayIndex] ?? '',
        dayLabel: dayNames[dayIndex] ?? '',
        dayIndex,
        startMinute: Number(lesson.startMinute ?? 0),
        time: [start, end].filter(Boolean).join('–'),
        label: [lesson.subjectName ?? lesson.subject, lesson.classLabel].filter(Boolean).join(' · '),
      };
    }).filter((item) => item.dayKey);

    const rows = new Map();
    for (const lesson of lessons) {
      const key = lesson.startMinute;
      if (!rows.has(key)) {
        rows.set(key, {
          startMinute: key,
          time: lesson.time,
          mon: '',
          tue: '',
          wed: '',
          thu: '',
          fri: '',
        });
      }
      rows.get(key)[lesson.dayKey] = lesson.label;
    }

    const classMap = new Map();
    for (const item of itemsOf(classPage)) {
      classMap.set(item.id, { id: item.id, label: classLabel(item), classTeacher: item.classTeacher });
    }
    for (const lesson of lessons) {
      if (lesson.classId && !classMap.has(lesson.classId)) {
        classMap.set(lesson.classId, {
          id: lesson.classId,
          label: lesson.classLabel || 'Assigned class',
          classTeacher: false,
        });
      }
    }
    for (const item of itemsOf(teachingPage)) {
      if (!classMap.has(item.classId)) {
        classMap.set(item.classId, { id: item.classId, label: classLabel({ level: item.level, arm: item.arm }) || item.classLabel || 'Assigned class', classTeacher: false });
      }
    }

    const duties = itemsOf(daily).map((item, index) => ({
      id: item.id ?? `${item.type ?? 'activity'}-${index}`,
      time: [minuteLabel(item.startMinute), minuteLabel(item.endMinute)].filter(Boolean).join('–'),
      title: item.title ?? item.subjectName ?? item.type ?? 'School activity',
      detail: [item.classLabel, item.room, item.description].filter(Boolean).join(' · '),
      classId: item.classId ?? null,
      type: item.type ?? 'ACTIVITY',
      state: item.state ?? item.status ?? '',
    }));

    return {
      date: on,
      week: weekly.effectiveFrom ?? '',
      published: weekly.published ?? false,
      grid: [...rows.values()].sort((a, b) => a.startMinute - b.startMinute),
      lessons,
      classes: [...classMap.values()],
      duties,
      todayEvents: duties,
      timezone: weekly.timezone ?? daily.timezone ?? 'Africa/Lagos',
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

    const classDuties = classItems.filter((item) => item.classTeacher);

    return {
      date,
      classDuty: classDuties[0]?.id ?? '',
      classes: classDuties.map((item) => ({
        id: item.id,
        label: classLabel(item),
      })),
      registerState: 'all',
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

    // Opening a register is a read-first workflow. Reuse an existing draft or
    // submitted register instead of issuing POST every time the screen opens.
    const existingPage = await this.get(schoolId, '/attendance/registers', {
      classId,
      from: date,
      to: date,
    });
    const existing = itemsOf(existingPage).find(
      (item) =>
        String(item.classId) === String(classId) &&
        String(item.onDate ?? item.date).slice(0, 10) === date,
    );

    const result = existing?.id
      ? await this.get(
          schoolId,
          `/attendance/registers/${encodeURIComponent(existing.id)}`,
        )
      : await this.command(
          schoolId,
          '/attendance/registers',
          'POST',
          { classId, onDate: date },
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

  async saveRegisterMarks(schoolId, register, rows) {
    const result = await this.command(
      schoolId,
      `/attendance/registers/${encodeURIComponent(register.id)}/marks`,
      'PUT',
      { rows },
      register.version
    );
    return this.mapRegister(result);
  }

  async submitRegister(schoolId, register) {
    const result = await this.command(
      schoolId,
      `/attendance/registers/${encodeURIComponent(register.id)}/submit`,
      'POST',
      undefined,
      register.version
    );
    return this.mapRegister(result);
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

  createMaterial(schoolId, body) {
    return this.command(schoolId, '/materials', 'POST', body);
  }

  updateMaterial(schoolId, materialId, body, version) {
    return this.command(
      schoolId,
      `/materials/${encodeURIComponent(materialId)}`,
      'PUT',
      body,
      version,
    );
  }

  publishMaterial(schoolId, material) {
    return this.command(
      schoolId,
      `/materials/${encodeURIComponent(material.id)}/publish`,
      'POST',
      undefined,
      material.version,
    );
  }

  async assignmentOptions(schoolId) {
    const [classes, assignments] = await Promise.all([
      this.get(schoolId, '/my-classes'),
      this.get(schoolId, '/teaching-assignments'),
    ]);
    const classItems = itemsOf(classes);
    const classById = new Map(classItems.map((item) => [item.id, item]));
    const sessionIds = [...new Set(classItems.map((item) => item.sessionId).filter(Boolean))];
    const termPages = await Promise.all(
      sessionIds.map((sessionId) => this.get(schoolId, '/terms', { sessionId })),
    );
    const terms = termPages.flatMap((page) => itemsOf(page));
    return {
      teachingAssignments: itemsOf(assignments).map((item) => ({
        id: item.id,
        classId: item.classId,
        subjectId: item.subjectId,
        teacherId: item.teacherId,
        department: item.department ?? '',
        label: `${classLabel(classById.get(item.classId))} · ${item.subjectName ?? 'Subject'}${item.department ? ` · ${item.department}` : ''}`,
      })),
      terms: terms.map((item) => ({
        id: item.id,
        sessionId: item.sessionId,
        number: item.number,
        label: item.label ?? `Term ${item.number ?? ''}${item.startsOn ? ` · ${item.startsOn}` : ''}`,
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
    const classReports = [];

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
        classReports.push({
          id: `${cycle.id}-${cycle.classId}`,
          cycleId: cycle.id,
          classId: cycle.classId,
          label: `${classLabel(classInfo)} class report`,
          detail: `Assessment cycle: ${cycle.state}`,
          state: cycle.state,
          version: cycle.version,
        });
      }
    }

    return {
      packages,
      classReports,
      classReport: classReports[0] ?? null,
    };
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
      classId,
      version: review.version,
      state: review.state,
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
        remark: student.remark ?? '',
        conduct: student.conduct ?? null,
        punctuality: student.punctuality ?? null,
        cooperation: student.cooperation ?? null,
        handwriting: student.handwriting ?? null,
        practicalSkills: student.practicalSkills ?? null,
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
    const [catalogue, packages] = await Promise.all([
      this.get(schoolId, '/school-reports/catalogue'),
      this.marksPackages(schoolId),
    ]);
    const entries = itemsOf(catalogue);

    return {
      types: entries.map((item) => item.kind).filter(Boolean),
      formats: Array.isArray(catalogue.formats) ? catalogue.formats : ['JSON', 'PDF', 'CSV'],
      catalogue,
      packages: packages.packages,
      classReports: packages.classReports,
    };
  }

  async runReport(schoolId, kind, filters = {}) {
    if (!kind) throw localError('Choose a permitted report type.');
    return this.get(schoolId, '/school-reports/' + encodeURIComponent(kind), {
      ...filters,
      format: 'JSON',
    });
  }

  async exportReport(schoolId, kind, filters = {}, format = 'PDF') {
    const chosen = String(format).toUpperCase();
    if (!['PDF', 'CSV'].includes(chosen)) {
      throw localError('Choose PDF or CSV for a file export.');
    }
    return this.client.download(this.path(
      schoolId,
      '/school-reports/' + encodeURIComponent(kind),
      { ...filters, format: chosen }
    ));
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
        label: item.subject ?? 'School conversation',
        detail: (item.target === 'CLASS_TEACHER' ? 'Class-teacher family thread' : item.target ?? 'Conversation') +
          ' · ' + (item.studentId ?? ''),
        state: item.state,
      })),
    };
  }

  async threadStudents(schoolId) {
    const classes = (await this.classes(schoolId)).items.filter((item) => item.classTeacher);
    const rosters = await Promise.all(classes.map(async (item) => {
      const workspace = await this.get(
        schoolId,
        '/classes/' + encodeURIComponent(item.id) + '/workspace'
      );
      return itemsOf(workspace.students).map((student) => ({
        id: student.id,
        name: student.fullName ?? student.admissionNumber ?? 'Student',
        classId: item.id,
        classLabel: item.label,
      }));
    }));

    return rosters.flat().sort((a, b) =>
      a.name.localeCompare(b.name) || a.classLabel.localeCompare(b.classLabel)
    );
  }

  async threadContacts(schoolId, studentId) {
    if (!studentId) throw localError('Choose a student first.');
    const context = await this.get(schoolId, '/threads/contacts', { studentId });
    const guardians = itemsOf(context.guardians)
      .filter((guardian) => guardian.learningAccess)
      .map((guardian, index) => ({
        id: guardian.id,
        label: guardian.primaryContact ? 'Primary linked guardian' : 'Linked guardian ' + (index + 1),
        primaryContact: Boolean(guardian.primaryContact),
      }));

    return {
      studentId: context.studentId ?? studentId,
      classId: context.classId ?? null,
      classTeacherAssigned: Boolean(context.classTeacherId),
      guardians,
    };
  }

  createThread(schoolId, body) {
    if (!body?.studentId || !body?.guardianId) {
      throw localError('Choose a student and an eligible linked guardian.');
    }
    if (!body.subject?.trim() || body.subject.trim().length < 3) {
      throw localError('Enter a conversation subject of at least three characters.');
    }
    if (!body.body?.trim() || body.body.trim().length < 2) {
      throw localError('Write the first message before opening the conversation.');
    }
    return this.command(schoolId, '/threads', 'POST', {
      studentId: body.studentId,
      guardianId: body.guardianId,
      target: 'CLASS_TEACHER',
      subject: body.subject.trim(),
      body: body.body.trim(),
      fileIds: [],
    });
  }

  async thread(schoolId, threadId) {
    if (!threadId) throw localError('Choose a conversation first.');

    const thread = await this.get(
      schoolId,
      '/threads/' + encodeURIComponent(threadId)
    );

    const student = thread.studentId
      ? await this.get(
          schoolId,
          '/students/' + encodeURIComponent(thread.studentId)
        )
      : {};
    const today = todayInLagos();
    const enrolments = itemsOf(student.enrolments);
    const placement = enrolments.find((entry) =>
      (!entry.startsOn || entry.startsOn <= today) &&
      (!entry.endsOn || entry.endsOn >= today)
    ) ?? enrolments[0] ?? {};

    return {
      ...thread,
      studentId: thread.studentId ?? student.id ?? null,
      classId: placement.classId ?? null,
      school: this.context?.schoolName ?? '',
      child: student.fullName ?? '',
      classArm: classLabel(placement),
      participants: thread.target === 'CLASS_TEACHER'
        ? 'Linked parent / guardian · class teacher'
        : thread.target ?? '',
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
    const [account, classes, assignments] = await Promise.all([
      this.client.request('/me'),
      this.get(schoolId, '/my-classes'),
      this.get(schoolId, '/teaching-assignments'),
    ]);
    const classItems = itemsOf(classes);
    const assignmentItems = itemsOf(assignments);
    // The browser's selected-context wire intentionally omits subjectId.
    // The authenticated teaching-assignment collection is already scoped by
    // the backend to this teacher and carries the authoritative staff ID.
    const staffId = assignmentItems.find((item) => item.teacherId)?.teacherId;
    const staff = staffId
      ? await this.get(schoolId, `/staff/${encodeURIComponent(staffId)}`)
      : null;
    const assignedSubjects = [...new Set(
      assignmentItems.map((item) => item.subjectName).filter(Boolean),
    )];

    return {
      displayName: staff?.fullName ?? account.displayName ?? '',
      code: staff?.staffNumber ?? '',
      role: 'Teacher',
      state: staff ? (staff.active ? 'Active' : 'Inactive') : 'No current teaching assignment',
      official: {
        school: this.context?.schoolName ?? '',
        canTeach: assignedSubjects.join(', '),
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

  changeAssignment(schoolId, assignmentId, body, version) {
    return this.command(
      schoolId,
      `/assignments/${encodeURIComponent(assignmentId)}/changes`,
      'POST',
      body,
      version
    );
  }

  reviewDraft(schoolId, assignmentId, studentId) {
    return this.get(
      schoolId,
      `/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(studentId)}/review-draft`
    );
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

  reviewDraft(schoolId, assignmentId, studentId) {
    return this.get(
      schoolId,
      `/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(studentId)}/review-draft`
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
