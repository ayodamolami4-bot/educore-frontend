/** AD18 — Assessment policies (grading rules) and assessment cycles (exam windows). */
import { api } from '../api/client';
import { endpoints } from '../api/endpoints';

export const AssessmentModel = {
  async policies() {
    return api.get(endpoints.assessment.policies);
  },

  async createPolicy(body) {
    return api.post(endpoints.assessment.policies, null, body);
  },

  /** Lock stops further edits before marks entry begins. */
  async lockPolicy(policyId) {
    return api.post(endpoints.assessment.lockPolicy, { policyId });
  },

  /** The admin's explicit unlock — editable again until the next lock. */
  async unlockPolicy(policyId) {
    return api.post(endpoints.assessment.unlockPolicy, { policyId });
  },

  async cycles() {
    return api.get(endpoints.assessment.cycles);
  },

  async createCycle(body) {
    return api.post(endpoints.assessment.cycles, null, body);
  },

  async cycleById(cycleId) {
    return api.get(endpoints.assessment.cycleById, { cycleId });
  },

  async updateCycle(cycleId, body) {
    return api.patch(endpoints.assessment.cycleById, { cycleId }, body);
  },

  /** Publish the mark-entry schedule so teachers see their deadlines. */
  async publishSchedule(cycleId) {
    return api.post(endpoints.assessment.publishSchedule, { cycleId });
  },
};

export default AssessmentModel;
