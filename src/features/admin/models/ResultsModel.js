/** AD19 — Assessment cycles, subject-sheet returns and class-report publication. */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

export const ResultsModel = {
  async cycles(query = {}) {
    return normalizePage(await api.get(endpoints.results.cycles, null, query));
  },

  async reviewCycle(cycleId) {
    return api.get(endpoints.results.cycleReview, { cycleId });
  },

  async returnSheet(cycleId, assignmentId, reason, version) {
    return api.post(
      endpoints.results.returnSheet,
      { cycleId, assignmentId },
      { reason: String(reason ?? '').trim() },
      { version },
    );
  },

  async returnReview(cycleId, reason, version) {
    return api.post(
      endpoints.results.returnReview,
      { cycleId },
      { reason: String(reason ?? '').trim() },
      { version },
    );
  },

  async publishCycle(cycleId, body, version) {
    return api.post(
      endpoints.results.publishCycle,
      { cycleId },
      {
        principalRemark: String(body.principalRemark ?? '').trim(),
        nextResumptionOn: body.nextResumptionOn,
      },
      { version },
    );
  },

  async reopenCycle(cycleId, body, version) {
    return api.post(
      endpoints.results.reopenCycle,
      { cycleId },
      {
        assignmentId: body.assignmentId ?? null,
        reason: String(body.reason ?? '').trim(),
        closesAt: body.closesAt,
      },
      { version },
    );
  },
};

export default ResultsModel;
