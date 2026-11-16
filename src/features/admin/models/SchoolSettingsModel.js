/** AD10 — School workspace settings, administrator records and activation. */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

const itemsOf = (value) => normalizePage(value).items;

const schoolSettingsView = (raw, sessions = []) => ({
  ...raw,
  schoolName: raw.name ?? raw.schoolName ?? 'School workspace',
  activeSession: sessions.find((item) => item.id === raw.activeSessionId) ?? null,
});

const staffView = (raw) => ({
  ...raw,
  role: String(raw.role ?? '').toUpperCase(),
  active: raw.active !== false,
  status: raw.active === false ? 'Suspended' : 'Active',
  accessStatus: raw.accessStatus ?? 'PENDING',
});

export const SchoolSettingsModel = {
  async get() {
    const [settings, sessionPage] = await Promise.all([
      api.get(endpoints.settings.get),
      api.get('academic-sessions'),
    ]);
    return schoolSettingsView(settings, itemsOf(sessionPage));
  },

  async update(body, version) {
    const result = await api.put(
      endpoints.settings.update,
      null,
      {
        phone: String(body.phone ?? '').trim() || null,
        email: String(body.email ?? '').trim() || null,
        address: String(body.address ?? '').trim() || null,
        wednesdayPtEnabled: Boolean(body.wednesdayPtEnabled),
        reason: String(body.reason ?? '').trim(),
        logoFileId: null,
        clearLogo: false,
      },
      { version },
    );
    const current = result.settings ?? result;
    const sessionPage = await api.get('academic-sessions');
    return {
      ...result,
      settings: schoolSettingsView(current, itemsOf(sessionPage)),
    };
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
    return api.post(
      'metadata-versions',
      null,
      {
        studentFields: body.studentFields ?? [],
        reason: String(body.reason ?? '').trim(),
      },
      { version },
    );
  },

  async publishEnrolmentForm() {
    throw new Error('A metadata version is published when it is saved. There is no separate publish endpoint.');
  },

  async settlementConfiguration() {
    return api.get(endpoints.settings.settlementConfiguration);
  },
};

export default SchoolSettingsModel;
