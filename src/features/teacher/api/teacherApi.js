import { schoolPath, queryString } from '../../../api/client';

/** All teacher paths scope under the active school. Java enforces permissions. */

export const teacherDashboardPath = (schoolId) =>
  schoolPath(schoolId, '/teacher/dashboard');

export const teacherClassesPath = (schoolId, params = {}) =>
  schoolPath(schoolId, '/teacher/classes' + queryString(params));

export const teacherClassPath = (schoolId, classId) =>
  schoolPath(schoolId, `/teacher/classes/${encodeURIComponent(classId)}`);

export const teacherRosterPath = (schoolId, classId) =>
  schoolPath(schoolId, `/teacher/classes/${encodeURIComponent(classId)}/roster`);

export const studentProfilePath = (schoolId, classId, studentId) =>
  schoolPath(schoolId, `/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}`);

export const teacherTimetablePath = (schoolId, params = {}) =>
  schoolPath(schoolId, '/teacher/timetable' + queryString(params));

export const attendanceRegistersPath = (schoolId, params = {}) =>
  schoolPath(schoolId, '/teacher/attendance/registers' + queryString(params));

export const attendanceRegisterPath = (schoolId, classId, date) =>
  schoolPath(schoolId, `/teacher/attendance/registers/${encodeURIComponent(classId)}/${encodeURIComponent(date)}`);

export const assignmentsPath = (schoolId, params = {}) =>
  schoolPath(schoolId, '/teacher/assignments' + queryString(params));

export const assignmentPath = (schoolId, assignmentId) =>
  schoolPath(schoolId, `/teacher/assignments/${encodeURIComponent(assignmentId)}`);

export const submissionPath = (schoolId, assignmentId, studentId) =>
  schoolPath(schoolId, `/teacher/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(studentId)}`);

export const marksPackagesPath = (schoolId, params = {}) =>
  schoolPath(schoolId, '/teacher/marks/packages' + queryString(params));

export const classReportPath = (schoolId, classId, session, term) =>
  schoolPath(schoolId, `/teacher/class-reports/${encodeURIComponent(classId)}${queryString({ session, term })}`);

export const teachingReportsPath = (schoolId, params = {}) =>
  schoolPath(schoolId, '/teacher/reports' + queryString(params));

export const teacherNoticesPath = (schoolId, params = {}) =>
  schoolPath(schoolId, '/teacher/notices' + queryString(params));

export const messageThreadsPath = (schoolId, params = {}) =>
  schoolPath(schoolId, '/teacher/messages/threads' + queryString(params));

export const messageThreadPath = (schoolId, threadId) =>
  schoolPath(schoolId, `/teacher/messages/threads/${encodeURIComponent(threadId)}`);

export const teacherProfilePath = (schoolId) =>
  schoolPath(schoolId, '/teacher/profile');