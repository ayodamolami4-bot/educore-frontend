/**
 * Student feature module. Exports the student navigator as HomeScreen so the
 * root navigator mounts it when the signed-in role is STUDENT.
 *
 * The student app covers the ST01–ST13 surface (see api/endpoints.js) and
 * reuses the shared admin api client for its demo + real transport, the
 * shared auth/session for the signed-in student's id, and the shared
 * Settings/Notifications screens.
 */
import StudentNavigator from './views/StudentNavigator';

export const studentModule = {
  name: 'student',
  title: 'Student',
  HomeScreen: StudentNavigator,
};

export default studentModule;
