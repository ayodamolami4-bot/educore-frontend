import test from 'node:test';
import assert from 'node:assert/strict';
import { violations } from '../scripts/check-scope.mjs';
const mapping = {
  lead: 'lead-user',
  roles: {
    admin: ['admin-dev'],
    teacher: ['teacher-dev'],
    student: ['student-dev'],
    parent: ['parent-dev'],
  },
};
test('a role contributor is limited to that role folder', () => {
  assert.deepEqual(
    violations(mapping, 'teacher-dev', ['src/features/teacher/views/Register.tsx']),
    [],
  );
  assert.deepEqual(
    violations(mapping, 'teacher-dev', [
      'src/features/admin/index.ts',
      'package.json',
      'src/api/client.ts',
    ]),
    ['src/features/admin/index.ts', 'package.json', 'src/api/client.ts'],
  );
});
test('lead can coordinate shared changes; unknown contributors cannot claim a role', () => {
  assert.deepEqual(
    violations(mapping, 'LEAD-USER', ['package.json', 'src/features/parent/index.ts']),
    [],
  );
  assert.equal(violations(mapping, 'unknown-user', ['src/features/student/index.ts']).length, 1);
});
