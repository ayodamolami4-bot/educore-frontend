/** AD14/AD15 — Timetable drafts (build, validate, review, publish) and published timetables. */
import { api } from '../api/client';
import { endpoints } from '../api/endpoints';

export const TimetableModel = {
  /** AD14 — teachers available for a slot (backend already filters clashes). */
  async assignmentCandidates(query) {
    return api.get(endpoints.timetable.assignmentCandidates, null, query);
  },

  async drafts() {
    return api.get(endpoints.timetable.drafts);
  },

  async createDraft(body) {
    return api.post(endpoints.timetable.drafts, null, body);
  },

  async draftById(draftId) {
    return api.get(endpoints.timetable.draftById, { draftId });
  },

  async saveDraft(draftId, body) {
    return api.patch(endpoints.timetable.draftById, { draftId }, body);
  },

  /** Server-side clash detection ,409 with the conflicting slot in details. */
  async validateDraft(draftId) {
    return api.post(endpoints.timetable.validateDraft, { draftId });
  },

  async requestReview(draftId) {
    return api.post(endpoints.timetable.requestReview, { draftId });
  },

  /** Publish makes the timetable visible to teachers/parents/students for the term. */
  async publishDraft(draftId) {
    return api.post(endpoints.timetable.publishDraft, { draftId });
  },

  async published() {
    return api.get(endpoints.timetable.published);
  },

  async publishedById(timetableId) {
    return api.get(endpoints.timetable.publishedById, { timetableId });
  },
};

export default TimetableModel;
