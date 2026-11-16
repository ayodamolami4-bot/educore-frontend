/** AD10 — School metadata, administrator records and secure staff activation. */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

const itemsOf = (value) => normalizePage(value).items;

const staffView = (raw) => ({
  ...raw,
  role: String(raw.role ?? '').toUpperCase(),
  active: raw.active !== false,
  status: raw.active === false ? 'Suspended' : 'Active',
  accessStatus: raw.accessStatus ?? 'PENDING',
});

export const SchoolSettingsModel = {
  async get() {
    const metadata = await api.get(endpoints.settings.get);
    const sessionPage = await api.get('academic-sessions');
    const sessions = itemsOf(sessionPage);
    const activeSession = sessions.find((item) => item.id === metadata.activeSessionId) ?? null;
    return { ...metadata, activeSession };
  },

  // School metadata updates are limited to the published form definition and
  // school-day policy; the API does not expose arbitrary profile edits.
  async update(body, version) {
    return api.put(
      endpoints.settings.update,
      null,
      {
        studentFields: body.studentFields,
        wednesdayPtEnabled: body.wednesdayPtEnabled,
      },
      { version },
    );
  },

  async adminMemberships() {
    const page = normalizePage(await api.get(endpoints.settings.adminMemberships, null, { limit: 100 }));
    const items = page.items
      .filter((item) => String(item.role ?? '').toUpperCase() !== 'TEACHER')
      .map(staffView);
    return { ...page, items };
  },

  async addAdminMembership(body) {
    return api.post(endpoints.settings.adminMemberships, null, {
      fullName: String(body.fullName ?? '').trim(),
      phone: String(body.phone ?? '').trim(),
      email: String(body.email ?? '').trim() || null,
      staffNumber: null,
      role: String(body.role ?? '').toUpperCase(),
      joinedOn: null,
      existingLoginId: null,
      relationshipVerified: false,
    });
  },

  async updateAdminMembership(membership, patch) {
    if (!membership?.id || !Number.isSafeInteger(membership.version) || membership.version < 1) {
      throw new Error('Refresh the staff directory before changing access.');
    }
    const updated = await api.post(
      endpoints.settings.adminMembershipById,
      { staffId: membership.id },
      {
        role: String(patch.role ?? membership.role).toUpperCase(),
        active: patch.active ?? membership.active,
        reason: String(patch.reason ?? '').trim(),
      },
      { version: membership.version },
    );
    return staffView(updated);
  },

  async issueAdminActivationSlip(staffId) {
    const status = await api.get(
      endpoints.settings.adminInvitations,
      { type: 'STAFF', subjectId: staffId },
    );
    if (status.accountStatus !== 'PENDING') {
      throw new Error('This staff account is already active and cannot receive another activation code.');
    }
    return api.post(
      endpoints.students.inviteAccount,
      { type: 'STAFF', subjectId: staffId },
    );
  },

  async getEnrolmentFormDraft() {
    return api.get(endpoints.students.enrolmentForm);
  },

  async saveEnrolmentFormDraft(body, version) {
    return api.put(
      'metadata',
      null,
      { studentFields: body.studentFields, wednesdayPtEnabled: body.wednesdayPtEnabled },
      { version },
    );
  },

  async publishEnrolmentForm() {
    throw new Error('The backend publishes school metadata through the versioned metadata update; there is no separate enrolment-form publish endpoint.');
  },

  async settlementConfiguration() {
    return api.get(endpoints.settings.settlementConfiguration);
  },
};

export default SchoolSettingsModel;
