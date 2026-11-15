/** AD31/AD32 — Complaints: intake, replies, internal notes, ownership, state, history. */
import { api, normalizePage } from '../api/client';
import { endpoints } from '../api/endpoints';

export const ComplaintsModel = {
  async list(query) {
    return normalizePage(await api.get(endpoints.complaints.list, null, query));
  },

  async create(body) {
    return api.post(endpoints.complaints.list, null, body);
  },

  async byId(caseId) {
    return api.get(endpoints.complaints.byId, { caseId });
  },

  async replies(caseId) {
    return api.get(endpoints.complaints.replies, { caseId });
  },

  async addReply(caseId, body) {
    return api.post(endpoints.complaints.replies, { caseId }, body);
  },

  async internalNotes(caseId) {
    return api.get(endpoints.complaints.internalNotes, { caseId });
  },

  async addInternalNote(caseId, body) {
    return api.post(endpoints.complaints.internalNotes, { caseId }, body);
  },

  async assignOwner(caseId, body) {
    return api.post(endpoints.complaints.owner, { caseId }, body);
  },

  /** State machine moves (open → in-review → resolved → closed) — backend validates. */
  async stateAction(caseId, body) {
    return api.post(endpoints.complaints.stateActions, { caseId }, body);
  },

  async history(caseId) {
    return api.get(endpoints.complaints.history, { caseId });
  },
};

export default ComplaintsModel;
