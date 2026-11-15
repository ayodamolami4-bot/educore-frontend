/** AD10 — School settings, admin memberships, enrolment form builder, settlement config. */
import { api } from '../api/client';
import { endpoints } from '../api/endpoints';

export const SchoolSettingsModel = {
  async get() {
    return api.get(endpoints.settings.get);
  },

  async update(body) {
    return api.patch(endpoints.settings.update, null, body);
  },

  async adminMemberships() {
    return api.get(endpoints.settings.adminMemberships);
  },

  async addAdminMembership(body) {
    return api.post(endpoints.settings.adminMemberships, null, body);
  },

  async updateAdminMembership(membershipId, body) {
    return api.patch(endpoints.settings.adminMembershipById, { membershipId }, body);
  },

  async getEnrolmentFormDraft() {
    return api.get(endpoints.students.enrolmentForm);
  },

  async saveEnrolmentFormDraft(body) {
    return api.put(endpoints.settings.enrolmentFormDraft, null, body);
  },

  async publishEnrolmentForm() {
    return api.post(endpoints.settings.enrolmentFormPublish);
  },

  async settlementConfiguration() {
    return api.get(endpoints.settings.settlementConfiguration);
  },
};

export default SchoolSettingsModel;
