import test from 'node:test';
import assert from 'node:assert/strict';
import { StudentFormPresenter } from '../src/features/admin/presenters/StudentFormPresenter.js';

function setup(model) {
  const presenter = new StudentFormPresenter(model);
  let latest = presenter.initialState;
  presenter.attach((next) => { latest = next; }, {});
  presenter.state = {
    ...presenter.initialState,
    status: 'ready',
    mode: 'enrol',
    values: {
      firstName: 'Amara',
      lastName: 'Okafor',
      gender: 'FEMALE',
      dateOfBirth: '2014-05-02',
      classId: 'class-1',
      startsOn: '2026-09-01',
      guardianName: 'Ada Okafor',
      guardianPhone: '08070000004',
      guardianEmail: '',
      guardianRelationship: 'MOTHER',
      guardianVerificationReference: 'ID checked at office',
      subjectIds: {},
      fields: {},
    },
    classOptions: [{ id: 'class-1', level: 'JSS1' }],
    metadataFields: [],
    metadataVersion: 1,
    errors: {},
  };
  // These tests focus on the accepted enrolment → access-slip handover.
  presenter.validate = () => ({});
  return { presenter, getState: () => latest };
}

test('enrolment immediately issues and exposes separate student and parent access slips', async () => {
  const calls = [];
  let enrolments = 0;
  const model = {
    async enrol() {
      enrolments += 1;
      return {
        id: 'student-1',
        guardianId: 'guardian-1',
        fullName: 'Amara Okafor',
        admissionNumber: 'EDU/001',
      };
    },
    async issueActivationSlip(type, subjectId) {
      calls.push([type, subjectId]);
      return {
        loginId: type === 'STUDENT' ? 'STU-001' : 'PAR-001',
        activationCode: type === 'STUDENT' ? 'STUDENT-ONETIME' : 'PARENT-ONETIME',
      };
    },
  };
  const { presenter, getState } = setup(model);

  await presenter.onSubmit();

  assert.equal(enrolments, 1);
  assert.deepEqual(calls, [
    ['STUDENT', 'student-1'],
    ['GUARDIAN', 'guardian-1'],
  ]);
  assert.equal(getState().status, 'accepted');
  assert.equal(getState().credentialStatus, 'ready');
  assert.equal(getState().credentials.student.loginId, 'STU-001');
  assert.equal(getState().credentials.student.activationCode, 'STUDENT-ONETIME');
  assert.equal(getState().credentials.parent.loginId, 'PAR-001');
  assert.equal(getState().credentials.parent.activationCode, 'PARENT-ONETIME');
});

test('retry issues only the missing parent slip and does not enrol the student twice', async () => {
  let enrolments = 0;
  let parentAttempts = 0;
  const calls = [];
  const model = {
    async enrol() {
      enrolments += 1;
      return {
        id: 'student-2',
        guardianId: 'guardian-2',
        fullName: 'Kemi Ade',
        admissionNumber: 'EDU/002',
      };
    },
    async issueActivationSlip(type, subjectId) {
      calls.push([type, subjectId]);
      if (type === 'GUARDIAN' && parentAttempts++ === 0) {
        throw new Error('Parent slip service is temporarily unavailable.');
      }
      return {
        loginId: type === 'STUDENT' ? 'STU-002' : 'PAR-002',
        activationCode: type === 'STUDENT' ? 'STUDENT-SECOND' : 'PARENT-SECOND',
      };
    },
  };
  const { presenter, getState } = setup(model);

  await presenter.onSubmit();
  assert.equal(getState().status, 'accepted');
  assert.equal(getState().credentialStatus, 'failed');
  assert.equal(getState().credentials.student.loginId, 'STU-002');
  assert.equal(getState().credentials.parent, null);

  await presenter.onRetryCredentials();

  assert.equal(enrolments, 1);
  assert.deepEqual(calls, [
    ['STUDENT', 'student-2'],
    ['GUARDIAN', 'guardian-2'],
    ['GUARDIAN', 'guardian-2'],
  ]);
  assert.equal(getState().credentialStatus, 'ready');
  assert.equal(getState().credentials.student.loginId, 'STU-002');
  assert.equal(getState().credentials.parent.loginId, 'PAR-002');
});

