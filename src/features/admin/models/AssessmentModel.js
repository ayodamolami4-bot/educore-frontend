/** AD18 — Fixed grading policy and assessment-cycle approvals. */
import { api } from '../api/client';
import { endpoints } from '../api/endpoints';

export const AssessmentModel = {
  async policies() {
    return api.get(endpoints.assessment.policies);
  },

  async cycles(query = {}) {
    return api.get(endpoints.assessment.cycles, null, query);
  },

  async cycleById(cycleId) {
    return api.get(endpoints.assessment.cycleById, { cycleId });
  },

  async createCycle(body) {
    return api.post(endpoints.assessment.cycles, null, body);
  },

  async approvePolicy(cycleId, body, version) {
    return api.post(
      'assessment-cycles/{cycleId}/approve-policy',
      { cycleId },
      {
        policyVersion: body.policyVersion,
        reason: String(body.reason ?? '').trim(),
      },
      { version },
    );
  },

  async openCycle(cycleId, body, version) {
    return api.post(
      'assessment-cycles/{cycleId}/open',
      { cycleId },
      {
        opensAt: body.opensAt,
        closesAt: body.closesAt,
        reason: String(body.reason ?? '').trim(),
      },
      { version },
    );
  },
};

export default AssessmentModel;
