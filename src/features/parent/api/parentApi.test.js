import test from 'node:test';
import assert from 'node:assert/strict';
import { createParentApi } from './parentApi.js';

test('complaint categories use the selected school communication endpoint', async () => {
  const requests = [];
  const api = createParentApi(
    {
      request: async (...args) => {
        requests.push(args);
        return {
          categories: [{ code: 'FEES', label: 'Fees and payments' }],
        };
      },
    },
    {
      schoolId: 'school_demo_01',
      childId: 'child_demo_01',
    },
  );

  const result = await api.complaintMetadata();

  assert.deepEqual(result.categories, [{ code: 'FEES', label: 'Fees and payments' }]);
  assert.deepEqual(requests, [['/schools/school_demo_01/complaints/metadata']]);
});
