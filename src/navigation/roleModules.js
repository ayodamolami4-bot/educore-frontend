import { adminModule } from '../features/admin/index.js';
import { teacherModule } from '../features/teacher/index.js';
import { studentModule } from '../features/student/index.js';
import { parentModule } from '../features/parent/index.js';
export function roleModule(role) {
  return role === 'TEACHER'
    ? teacherModule
    : role === 'STUDENT'
      ? studentModule
      : role === 'PARENT'
        ? parentModule
        : adminModule;
}
