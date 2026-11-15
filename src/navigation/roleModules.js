/**
 * roleModules — maps the signed-in role to that role's feature module.
 *
 * CONTRACT (this is the ONLY thing navigation knows about features):
 *   features/<role>/index.js  →  export const <role>Module = { HomeScreen }
 *
 * The admin family is PRINCIPAL / SCHOOL_OFFICE / ACCOUNTS (see SessionStore
 * screen permissions) — the original scaffold sent every role that is not
 * TEACHER/STUDENT/PARENT to adminModule, and the demo account signs in as
 * PRINCIPAL. Unknown roles return null: RoleWorkspaceScreen shows its
 * built-in fallback. Never a crash and never silent access for a stranger role.
 */
import { adminModule } from '../features/admin';
import { teacherModule } from '../features/teacher';
import { studentModule } from '../features/student';
import { parentModule } from '../features/parent';

const MODULES_BY_ROLE = {
  TEACHER: teacherModule,
  STUDENT: studentModule,
  PARENT: parentModule,
};

const ADMIN_FAMILY = new Set(['ADMIN', 'PRINCIPAL', 'SCHOOL_OFFICE', 'ACCOUNTS']);

export function roleModule(role) {
  if (!role) return null;
  const key = String(role).trim().toUpperCase();
  if (ADMIN_FAMILY.has(key)) return adminModule;
  return MODULES_BY_ROLE[key] ?? null;
}
