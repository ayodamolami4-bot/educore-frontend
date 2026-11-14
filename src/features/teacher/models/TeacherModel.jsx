import { ApiError } from '../../../api/errors';
import { localError } from '../../../api/errors';
import * as paths from '../api/teacherApi';

/** Teacher data layer. Stubs return sample records so screens run before backend wiring. */
export class TeacherModel {
  constructor(client) {
    this.client = client;
  }

  async dashboard(schoolId) {
    // return this.client.request(paths.teacherDashboardPath(schoolId));
    return {
      greeting: 'Good morning, Mr Okafor',
      today: 'Monday, 9 November — First Term',
      summary: [
        { label: 'Register due', value: 'JSS1 A', tone: 'warn' },
        { label: 'Work to review', value: '12', tone: 'info' },
        { label: 'Subject marks', value: 'In review', tone: 'info' },
        { label: 'Class reports', value: 'Open', tone: 'info' },
      ],
      actions: [
        { id: 'a1', time: '08:00', title: 'JSS1 A Mathematics', detail: 'Room 04 - 30 minutes', tag: 'Published' },
        { id: 'a2', time: '08:30', title: 'Daily register', detail: 'Attendance duty: JSS1 A - due 08:30', tag: 'Action needed' },
        { id: 'a3', time: '', title: 'Class report preparation', detail: 'Class teacher: JSS1 A', tag: 'Class duty' },
      ],
    };
  }

  async classes(schoolId) {
    return {
      session: '2026/2027',
      assignmentView: 'All my responsibilities',
      items: [
        { id: 'c1', label: 'JSS1 A - Mathematics', detail: '4 periods weekly - primary subject teacher', state: 'Assigned' },
        { id: 'c2', label: 'JSS1 B - Mathematics', detail: '4 periods weekly - primary subject teacher', state: 'Assigned' },
        { id: 'c3', label: 'JSS1 A - Class teacher', detail: 'Class report and daily register responsibility', state: 'Assigned' },
      ],
    };
  }

  async classWorkspace(schoolId, classId) {
    return {
      classId,
      subject: 'Mathematics',
      term: 'First Term',
      primaryTeacher: 'Mr Chinedu Okafor',
      classTeacher: 'Mr Chinedu Okafor',
      rosterCount: 32,
      roster: [
        { id: 's1', name: 'Zainab Bello', code: 'EC/2026/0142', state: 'Active' },
        { id: 's2', name: 'Tunde Adewale', code: 'EC/2026/0143', state: 'Active' },
        { id: 's3', name: 'Ibrahim Musa', code: 'EC/2026/0145', state: 'Active' },
      ],
      materials: [
        { id: 'm1', title: 'Fractions practice notes', detail: 'PDF - published 6 Nov', state: 'Available' },
        { id: 'm2', title: 'Worked examples', detail: 'Teacher note - 4 Nov', state: 'Available' },
      ],
    };
  }

  async studentProfile(schoolId, classId, studentId) {
    return {
      id: 's1', name: 'Zainab Bello', code: 'EC/2026/0142', classArm: 'JSS1 A', state: 'Active',
      yourSubject: 'Mathematics', classTeacher: 'Mr Okafor', enrolment: 'Active',
      records: [
        { id: 'r1', title: 'Fractions practice', detail: 'Submitted - awaiting review', extra: '1 submission' },
        { id: 'r2', title: 'First Term Mathematics', detail: 'CA1 draft / CA2 pending / exam pending', extra: 'Unpublished' },
      ],
    };
  }

  async timetable(schoolId) {
    return {
      session: '2026/2027', week: '9-13 November 2026', display: 'My combined week', classFilter: 'All my classes',
      grid: [
        { time: '08:00', mon: 'Math A', tue: '-', wed: 'PT', thu: 'Math A', fri: '-' },
        { time: '08:30', mon: '-', tue: 'Math A', wed: '-', thu: 'Math A', fri: '-' },
        { time: '11:30', mon: 'BREAK', tue: 'BREAK', wed: 'BREAK', thu: 'BREAK', fri: 'BREAK' },
        { time: '12:00', mon: '-', tue: '-', wed: '-', thu: 'Math B', fri: 'SPORTS' },
      ],
      duties: [
        { id: 'd1', title: 'Wednesday PT', detail: '08:00-08:30 — Supervision assignment when enabled', state: 'Published' },
        { id: 'd2', title: 'Friday sport', detail: '12:00-13:00 — School field - assigned supervisor', state: 'Published' },
      ],
    };
  }

  async attendanceCentre(schoolId) {
    return {
      date: '2026-11-09', classDuty: 'JSS1 A', registerState: 'All states',
      registers: [
        { id: 'rg1', label: 'JSS1 A - Today', detail: '32 students - due 08:30', state: 'Not started' },
        { id: 'rg2', label: 'JSS1 A - 6 November', detail: 'Submitted 08:24 - version 1', state: 'Submitted' },
      ],
      context: { date: 'Teaching day', deadline: '08:30 WAT', teacher: 'Mr Chinedu Okafor' },
    };
  }

  async register(schoolId, classId, date) {
    return {
      classId, date,
      context: { roster: 32, deadline: '08:30 WAT', state: 'Draft - version 1' },
      students: [
        { id: 's1', name: 'Zainab Bello', status: 'ABSENT', note: 'No reason yet' },
        { id: 's2', name: 'Tunde Adewale', status: 'PRESENT', note: '' },
        { id: 's3', name: 'Ibrahim Musa', status: 'LATE', note: 'Arrived 08:21' },
      ],
      summary: { marked: 32, present: 29, absent: 2, late: 1 },
    };
  }

  async assignments(schoolId) {
    return {
      classId: 'JSS1 A', subject: 'Mathematics', status: 'All assignments',
      items: [
        { id: 'as1', title: 'Fractions practice', detail: 'Due 13 Nov, 18:00 - 24/32 received', state: 'Open' },
        { id: 'as2', title: 'Revision worksheet', detail: 'Draft - not visible to families', state: 'Draft' },
        { id: 'as3', title: 'Whole numbers quiz', detail: 'All feedback released', state: 'Closed' },
      ],
    };
  }

  async assignment(schoolId, assignmentId) {
    return {
      id: assignmentId, title: 'Fractions practice', classArm: 'JSS1 A', subject: 'Mathematics',
      due: '13 Nov, 18:00 WAT', method: 'Typed answer + file', maxScore: 20, window: 'Open - late submissions labelled',
      submissions: [
        { id: 'su1', student: 'Zainab Bello', detail: 'Version 1 - 12 Nov, 16:04', state: 'Submitted' },
        { id: 'su2', student: 'Tunde Adewale', detail: 'No accepted submission yet', state: 'Not submitted' },
        { id: 'su3', student: 'Ibrahim Musa', detail: 'Version 2 - after deadline', state: 'Late' },
      ],
    };
  }

  async submission(schoolId, assignmentId, studentId) {
    return {
      assignmentId, studentId,
      submitted: '12 Nov, 16:04 WAT', status: 'On time', version: 1, receipt: 'Not applicable',
      content: [
        { type: 'Typed answer', detail: 'Question 1: 1/2 + 1/4 = 3/4' },
        { type: 'Attachment', detail: 'fractions-working.pdf - PDF - 284 KB' },
      ],
      maxScore: 20,
    };
  }

  async marksPackages(schoolId) {
    return {
      session: '2026/2027', term: 'First Term', classId: 'JSS1 A', subject: 'Mathematics',
      packages: [
        { id: 'p1', label: 'JSS1 A - Mathematics', detail: 'CA1 / CA2 / Exam - policy version 1', state: 'Draft' },
        { id: 'p2', label: 'JSS1 B - Mathematics', detail: 'Returned: review two missing exam entries', state: 'Returned' },
      ],
      classReport: { label: 'JSS1 A class report', detail: 'Subject completeness, remarks and ratings', state: 'In preparation' },
    };
  }

  async scores(schoolId, classId, subject, session, term) {
    return {
      policy: { ca1: 20, ca2: 20, exam: 60, total: 100, precision: 1, deadline: '11 Dec - school-configured' },
      state: 'Draft - current version 1',
      students: [
        { id: 's1', name: 'Zainab Bello', ca1: 16, ca2: 17, exam: 45 },
        { id: 's2', name: 'Tunde Adewale', ca1: 14, ca2: 15, exam: 40 },
        { id: 's3', name: 'Ibrahim Musa', ca1: null, ca2: null, exam: null },
      ],
    };
  }

  async classReport(schoolId, classId, session, term) {
    return {
      session, term,
      completeness: { mine: 'Submitted once; reused here', others: '8 / 8 submitted', missing: 0, remarks: '31 / 32 complete' },
      readiness: [
        { id: 's1', name: 'Zainab Bello', average: 74.2, state: 'Complete' },
        { id: 's2', name: 'Tunde Adewale', average: 65.8, state: 'Complete' },
        { id: 's3', name: 'Ibrahim Musa', average: 58.4, state: 'Needs review' },
      ],
    };
  }

  async reports(schoolId) {
    return {
      types: ['Class academic summary', 'Published class broadsheet', 'Assigned attendance summary', 'Assignment progress'],
      sessions: ['2026/2027', '2025/2026'],
      terms: ['First Term', 'Second Term', 'Third Term'],
      classes: ['JSS1 A', 'JSS1 B'],
      subjects: ['Mathematics', 'All permitted class subjects - class teacher'],
      formats: ['PDF', 'CSV'],
    };
  }

  async notices(schoolId) {
    return {
      view: 'All notices',
      items: [
        { id: 'n1', title: 'First Term examination timetable', detail: 'Published by Principal - 6 Nov', state: 'Unread' },
        { id: 'n2', title: 'Friday sport supervision', detail: 'Your assigned duty - 12:00-13:00', state: 'Read' },
      ],
      opened: { audience: 'Assigned teachers / affected classes', published: '6 Nov - revision 1', attachment: 'Exam-timetable.pdf' },
    };
  }

  async threads(schoolId) {
    return {
      scope: 'All permitted',
      threads: [
        { id: 't1', label: 'Mrs Amina Bello - Zainab', detail: 'Absence explanation - class-teacher eligibility', state: '2 unread' },
        { id: 't2', label: 'School Office', detail: 'Please review the register note', state: 'Unread' },
      ],
    };
  }

  async thread(schoolId, threadId) {
    return {
      id: threadId,
      school: 'Greenfield', child: 'Zainab', classArm: 'JSS1 A',
      participants: 'Mrs Bello / Mr Okafor', thread: 'Absence explanation',
      messages: [
        { id: 'ms1', author: 'Mrs Bello', text: 'Zainab is unwell today. I have also informed the school office.', time: '08:35' },
        { id: 'ms2', author: 'Mr Okafor', text: 'Thank you. Office will review and record the explanation.', time: '08:42' },
      ],
    };
  }

  async profile(schoolId) {
    return {
      displayName: 'Mr Chinedu Okafor', code: 'ST-001', role: 'Teacher', state: 'Active',
      official: {
        school: 'Greenfield Secondary',
        canTeach: 'Mathematics / Basic Science',
        assigned: 'JSS1 A and B Mathematics',
        classTeacher: 'JSS1 A',
        attendance: 'JSS1 A',
        session: '2026/2027',
      },
    };
  }
}