import { adminModule } from '../features/admin';
import { teacherModule } from '../features/teacher';
import { studentModule } from '../features/student';
import { parentModule } from '../features/parent';
export function roleModule(role) {
    return role === 'TEACHER'
        ? teacherModule
        : role === 'STUDENT'
            ? studentModule
            : role === 'PARENT'
                ? parentModule
                : adminModule;
}
